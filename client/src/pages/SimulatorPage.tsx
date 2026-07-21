import { useState, useRef, useEffect } from 'react';
import { apiPost } from '../lib/api';
import Modal from '../components/Modal';

interface OrderItem {
  product: string;
  qty: number;
  price: number;
}

interface VirtualAccount {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

interface Order {
  id: string;
  items: OrderItem[];
  totalAmount: number;
  status: string;
  paymentMethod: string;
  virtualAccount?: VirtualAccount;
  checkoutLink?: string;
  customerName: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot' | 'system';
  text: string;
  name?: string;
}

function formatCurrency(amount: number): string {
  return '₦' + amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const SUGGESTIONS = [
  'I want 2 White Sneakers and a Black Hoodie',
  'A Large Pizza and 2 Cokes',
  '3 packs of Diapers (Size 5)',
];

export default function SimulatorPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'init', sender: 'system', text: 'Welcome! Try typing an order below or tap a suggestion.' },
  ]);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [customerName, setCustomerName] = useState('Chidi');
  const [paymentType, setPaymentType] = useState('transfer');
  const [chatInput, setChatInput] = useState('');
  const [sending, setSending] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [modalInfo, setModalInfo] = useState<{ title: string; message: string } | null>(null);
  const [pan, setPan] = useState('5061081111111111');
  const [expiry, setExpiry] = useState('12/28');
  const [cvv, setCvv] = useState('123');
  const [pin, setPin] = useState('1234');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const addMessage = (sender: ChatMessage['sender'], text: string, name?: string): string => {
    const id = 'msg_' + Math.random().toString(36).substring(2, 11);
    setMessages(prev => [...prev, { id, sender, text, name }]);
    return id;
  };

  const removeMessage = (id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  };

  const handleSubmit = async (messageOverride?: string) => {
    const message = (messageOverride || chatInput).trim();
    if (!message || sending) return;

    addMessage('user', message, customerName);
    setChatInput('');
    setSending(true);

    const thinkingId = addMessage('system', 'ZPay AI is parsing your order...');

    try {
      const historyToSend = messages.filter(m => m.sender !== 'system').map(m => ({ sender: m.sender, text: m.text }));
      const data = await apiPost<{ success: boolean; order?: Order; error?: string; missingInfo?: string }>('/api/parse-order', {
        message,
        customerName,
        paymentType,
        history: historyToSend,
      });

      removeMessage(thinkingId);

      if (data.missingInfo) {
        addMessage('bot', data.missingInfo);
      } else if (data.success && data.order) {
        setCurrentOrder(data.order);
        let responseStr = `Order **#${data.order.id}** created for ${formatCurrency(data.order.totalAmount)}.\n\n`;
        
        if (data.order.paymentMethod === 'transfer' && data.order.virtualAccount) {
          responseStr += `Monnify Reserved Account generated:\n**Bank**: ${data.order.virtualAccount.bankName}\n**Number**: ${data.order.virtualAccount.accountNumber}`;
        } else if (data.order.checkoutLink) {
          responseStr += `Payment Web Link generated:\n[Open Monnify Web checkout](${data.order.checkoutLink})`;
        }
        addMessage('bot', responseStr);
      } else {
        addMessage('bot', `[Error] ${data.error || 'No items resolved. Please specify products clearly.'}`);
      }
    } catch (err) {
      removeMessage(thinkingId);
      const errMsg = err instanceof Error ? err.message : 'API server failed to respond.';
      addMessage('bot', `[Error] ${errMsg}`);
    } finally {
      setSending(false);
    }
  };

  const handleSimulatePayment = async (orderIdToSimulate?: string) => {
    const id = orderIdToSimulate || currentOrder?.id;
    if (!id || simulating) return;
    setSimulating(true);

    try {
      const data = await apiPost<{ success: boolean; error?: string }>('/api/simulate-payment', {
        orderId: id,
      });

      if (data.success) {
        addMessage('bot', `[Simulated Callback] Monnify successfully posted webhook notification for #${id}. Payment settled.`);
        setModalInfo({
          title: 'Payment Received',
          message: `Simulated webhook received. A customer transferred funds to the Reserved Account for Order #${id}. Transaction verified and marked as PAID.`,
        });
        setCurrentOrder(null);
      }
    } catch (err) {
      console.error('Simulate payment error:', err);
    } finally {
      setSimulating(false);
    }
  };

  const handleCardPayment = async () => {
    if (!currentOrder || simulating) return;
    setSimulating(true);

    const [expMonth, expYear] = expiry.split('/');
    const cardDetails = {
      pan,
      expiryMonth: expMonth,
      expiryYear: expYear ? `20${expYear}` : '2028',
      cvv,
      pin,
    };

    try {
      const data = await apiPost<{ success: boolean; error?: string }>('/api/pay-card', {
        orderId: currentOrder.id,
        cardDetails,
      });

      if (data.success) {
        addMessage('bot', `[Card Payment] Direct sandbox card charge API returned success for #${currentOrder.id}. Order marked as PAID.`);
        setModalInfo({
          title: 'Card Payment Successful',
           message: `Card payment processed via sandbox API for Order #${currentOrder.id}. Order status updated to PAID.`,
        });
        setCurrentOrder(null);
      } else {
        setModalInfo({ title: 'Payment Failed', message: data.error || 'Card processing failed' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Card payment failed';
      setModalInfo({ title: 'Payment Failed', message: msg });
    } finally {
      setSimulating(false);
    }
  };

  const renderMessageText = (text: string) => {
    const html = text
      .replace(/\n/g, '<br>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    return <div className="msg-html" dangerouslySetInnerHTML={{ __html: html }} />;
  };

  return (
    <div className="view-panel" id="panel-simulator">
      <div className="sim-layout">
        {/* Chat Panel */}
        <section className="sim-chat-panel">
          <div className="sim-chat-header">
            <div className="sim-chat-header-left">
              <div className="sim-chat-avatar">Z</div>
              <div>
                <strong>ZPay AI Sales Assistant</strong>
                <span>Online · Replies instantly</span>
              </div>
            </div>
            <div className="sim-chat-badge">Sandbox</div>
          </div>

          <div className="sim-chat-messages" id="chatMessages">
            {messages.map(msg => (
              <div key={msg.id} className={`sim-msg sim-msg-${msg.sender}`}>
                {msg.sender === 'user' && <div className="sim-msg-name">{msg.name || 'Customer'}</div>}
                {msg.sender === 'bot' && (
                  <div className="sim-msg-name">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                      <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                      <line x1="6" y1="6" x2="6.01" y2="6" />
                      <line x1="6" y1="18" x2="6.01" y2="18" />
                    </svg>
                    ZPay Engine
                  </div>
                )}
                <div className="sim-msg-bubble">{renderMessageText(msg.text)}</div>
                {msg.sender !== 'system' && <span className="sim-msg-time">just now</span>}
              </div>
            ))}
            {sending && (
              <div className="sim-msg sim-msg-bot">
                <div className="sim-msg-name">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                    <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                    <line x1="6" y1="6" x2="6.01" y2="6" />
                    <line x1="6" y1="18" x2="6.01" y2="18" />
                  </svg>
                  ZPay Engine
                </div>
                <div className="sim-msg-bubble">
                  <span className="sim-typing">
                    <span /><span /><span />
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="sim-chat-input-area">
            {messages.length <= 1 && (
              <div className="sim-suggestions">
                {SUGGESTIONS.map((s, i) => (
                  <button key={i} className="sim-chip" onClick={() => { setChatInput(s); }}>
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div className="sim-input-bar">
              <div className="sim-input-controls">
                <input
                  type="text"
                  placeholder="Type an order here..."
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                  disabled={sending}
                />
                <button className="sim-send-btn" onClick={() => handleSubmit()} disabled={sending || !chatInput.trim()}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
              <div className="sim-payment-toggle">
                <button
                  className={`sim-toggle-btn ${paymentType === 'transfer' ? 'active' : ''}`}
                  onClick={() => setPaymentType('transfer')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                  </svg>
                  Bank Transfer
                </button>
                <button
                  className={`sim-toggle-btn ${paymentType === 'card' ? 'active' : ''}`}
                  onClick={() => setPaymentType('card')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                  </svg>
                  Card
                </button>
                <div className="sim-customer-name">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M20 21a8 8 0 1 0-16 0" />
                  </svg>
                  <input
                    type="text"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="Name"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Checkout Panel */}
        <section className="sim-checkout-panel">
          <div className="sim-checkout-header">
            <h3>Checkout</h3>
            <span className="sim-checkout-status">{currentOrder ? 'Active' : 'Awaiting Order'}</span>
          </div>

          {!currentOrder ? (
            <div className="sim-checkout-empty">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="sim-empty-icon">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
              <strong>No active checkout</strong>
              <p>Send an order message in the chat to generate a Monnify checkout request with a virtual account or payment link.</p>
              <div className="sim-empty-examples">
                {SUGGESTIONS.map((s, i) => (
                  <button key={i} className="sim-chip sim-chip-outline" onClick={() => { setChatInput(s); }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="sim-checkout-active">
              <div className="sim-checkout-order-header">
                <div className="sim-checkout-id">#{currentOrder.id}</div>
                <span className={`sim-checkout-pill ${currentOrder.status}`}>
                  {currentOrder.status === 'paid' ? 'PAID' : 'PENDING'}
                </span>
              </div>

              <div className="sim-checkout-items">
                {currentOrder.items.map((item, i) => (
                  <div key={i} className="sim-checkout-item">
                    <span className="sim-coi-name">{item.qty}x {item.product}</span>
                    <span className="sim-coi-price">{formatCurrency(item.price * item.qty)}</span>
                  </div>
                ))}
                <div className="sim-checkout-total">
                  <span>Total</span>
                  <strong>{formatCurrency(currentOrder.totalAmount)}</strong>
                </div>
              </div>

              {currentOrder.paymentMethod === 'transfer' && currentOrder.virtualAccount ? (
                <div className="sim-va-box">
                  <div className="sim-va-label">Virtual Account</div>
                  <div className="sim-va-bank">{currentOrder.virtualAccount.bankName}</div>
                  <div className="sim-va-number">{currentOrder.virtualAccount.accountNumber}</div>
                  <div className="sim-va-name">{currentOrder.virtualAccount.accountName}</div>
                  <button
                    className="btn btn-primary btn-full"
                    onClick={() => handleSimulatePayment()}
                    disabled={simulating}
                  >
                    {simulating ? 'Processing...' : 'Simulate Bank Transfer'}
                  </button>
                </div>
              ) : (
                <div className="sim-card-form">
                  <div className="sim-card-label">Card Payment</div>
                  <div className="sim-card-inputs">
                    <div className="sim-field">
                      <label>Card Number</label>
                      <input type="text" value={pan} onChange={e => setPan(e.target.value)} placeholder="5061 0811 1111 1111" />
                    </div>
                    <div className="sim-field-row">
                      <div className="sim-field">
                        <label>Expiry</label>
                        <input type="text" value={expiry} onChange={e => setExpiry(e.target.value)} placeholder="MM/YY" />
                      </div>
                      <div className="sim-field">
                        <label>CVV</label>
                        <input type="password" maxLength={3} value={cvv} onChange={e => setCvv(e.target.value)} placeholder="123" />
                      </div>
                      <div className="sim-field">
                        <label>PIN</label>
                        <input type="password" maxLength={4} value={pin} onChange={e => setPin(e.target.value)} placeholder="1234" />
                      </div>
                    </div>
                  </div>
                  <button
                    className="btn btn-primary btn-full"
                    onClick={handleCardPayment}
                    disabled={simulating}
                  >
                    {simulating ? 'Processing...' : 'Authorize Card Payment'}
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      <Modal
        open={!!modalInfo}
        title={modalInfo?.title || ''}
        onClose={() => setModalInfo(null)}
      >
        <p>{modalInfo?.message}</p>
      </Modal>
    </div>
  );
}
