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

export default function SimulatorPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'init', sender: 'system', text: 'Welcome! System initialized. Try typing a purchase order below.' },
  ]);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [customerName, setCustomerName] = useState('Chidi');
  const [paymentType, setPaymentType] = useState('transfer');
  const [chatInput, setChatInput] = useState('');
  const [sending, setSending] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [modalInfo, setModalInfo] = useState<{ title: string; message: string } | null>(null);
  const [pan, setPan] = useState('5061081111111111'); // Standard test card default
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const message = chatInput.trim();
    if (!message || sending) return;

    addMessage('user', message, customerName);
    setChatInput('');
    setSending(true);

    const thinkingId = addMessage('system', 'ZPay AI Agent is parsing order and calling Monnify Sandbox Checkout...');

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
          title: 'Incoming Transfer Received 🎉',
          message: `Awesome! We just received a simulated webhook that a customer transferred money to the Reserved Account for Order #${id}. The transaction is verified and marked as PAID.`,
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
      pin
    };

    try {
      const data = await apiPost<{ success: boolean; error?: string }>('/api/pay-card', {
        orderId: currentOrder.id,
        cardDetails
      });

      if (data.success) {
        addMessage('bot', `[Card Payment] Direct sandbox card charge API returned success for #${currentOrder.id}. Order marked as PAID.`);
        setModalInfo({
          title: 'Card Payment Success 💳',
          message: `Successfully processed card payment directly via Monnify Sandbox API for Order #${currentOrder.id}! The order status is updated to PAID.`,
        });
        setCurrentOrder(null);
      } else {
        alert(data.error || 'Card processing failed');
      }
    } catch (err: any) {
      console.error('Card payment error:', err);
      alert(err.message || 'Card payment failed');
    } finally {
      setSimulating(false);
    }
  };


  const renderMessageText = (text: string) => {
    const html = text
      .replace(/\n/g, '<br>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  };

  return (
    <div className="view-panel" id="panel-simulator">
      <div className="simulator-grid">
        {/* Chat Panel */}
        <section className="panel simulator-panel">
          <div className="panel-header">
            <h3>Conversational Checkout Simulator</h3>
            <p>Type a natural message to simulate a customer order.</p>
          </div>

          <div className="chat-container">
            <div className="chat-messages" id="chatMessages">
              {messages.map(msg => (
                <div key={msg.id} className={`msg ${msg.sender}`}>
                  <div className="msg-header">
                    {msg.sender === 'user' ? msg.name || 'Customer' : msg.sender === 'bot' ? 'ZPay Engine' : 'System'}
                  </div>
                  <div className="msg-body">{renderMessageText(msg.text)}</div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form className="chat-form" onSubmit={handleSubmit} id="chatForm">
              <div className="input-row">
                <div className="input-group">
                  <input
                    type="text"
                    id="customerName"
                    placeholder="Customer Name (e.g. Chidi)"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    required
                  />
                </div>
                <div className="input-group" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--platinum-muted)' }}>Payment Type:</span>
                  <div style={{ display: 'flex', gap: '0.25rem', background: 'rgba(255,255,255,0.05)', padding: '0.25rem', borderRadius: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setPaymentType('transfer')}
                      style={{
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.85rem',
                        border: paymentType === 'transfer' ? '2px solid var(--monnify-cyan)' : '2px solid transparent',
                        borderRadius: '4px',
                        background: paymentType === 'transfer' ? 'var(--monnify-cyan)' : 'transparent',
                        color: paymentType === 'transfer' ? 'var(--bg-dark)' : 'var(--silver-text)',
                        fontWeight: paymentType === 'transfer' ? 600 : 400,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxSizing: 'border-box'
                      }}
                    >
                      Bank (Virtual Acct)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentType('card')}
                      style={{
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.85rem',
                        border: paymentType === 'card' ? '2px solid var(--monnify-cyan)' : '2px solid transparent',
                        borderRadius: '4px',
                        background: paymentType === 'card' ? 'var(--monnify-cyan)' : 'transparent',
                        color: paymentType === 'card' ? 'var(--bg-dark)' : 'var(--silver-text)',
                        fontWeight: paymentType === 'card' ? 600 : 400,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxSizing: 'border-box'
                      }}
                    >
                      Card
                    </button>
                  </div>
                </div>
              </div>
              <div className="input-main">
                <input
                  type="text"
                  id="chatMessage"
                  placeholder="Type order (e.g., 'I want 2 White Sneakers and a Black Hoodie')"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  required
                />
                <button type="submit" className="btn-send" disabled={sending}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Checkout Display Panel */}
        <section className="panel checkout-panel">
          <div className="panel-header">
            <h3>Monnify API Dynamic Checkout</h3>
            <p>Verify generated transaction details and trigger sandbox responses.</p>
          </div>

          {!currentOrder ? (
            <div className="checkout-display empty" id="checkoutDisplayEmpty">
              <div className="empty-state">
                <div className="empty-icon">
                  <svg fill="none" stroke="currentColor" strokeWidth="1.5" className="empty-svg" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                  </svg>
                </div>
                <p>Waiting for a chat order to generate checkout invoice details...</p>
              </div>
            </div>
          ) : (
            <div className="checkout-display" id="checkoutDisplay">
              <div className="success-header">
                <div className="success-check">✓</div>
                <div>
                  <h4>Checkout Request Built</h4>
                  <p id="orderIdText">Ref: #{currentOrder.id}</p>
                </div>
              </div>

              <div className="checkout-details">
                <div className="detail-section">
                  <h5 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--platinum-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.35rem' }}>
                    Parsed Products
                  </h5>
                  <ul id="cartItemsList">
                    {currentOrder.items.map((item, i) => (
                      <li key={i}>
                        <span>{item.qty}x {item.product}</span>
                        <span>{formatCurrency(item.price * item.qty)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="total-row">
                    <span>Total:</span>
                    <strong id="totalAmountText">{formatCurrency(currentOrder.totalAmount)}</strong>
                  </div>
                </div>

                <div className="payment-action-box" id="paymentActionBox" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {currentOrder.paymentMethod === 'transfer' && currentOrder.virtualAccount ? (
                    <div className="virtual-acc-box">
                      <span className="label">Simulated Bank Transfer Rails</span>
                      <div className="bank-name">{currentOrder.virtualAccount.bankName}</div>
                      <div className="acc-num">{currentOrder.virtualAccount.accountNumber}</div>
                      <p className="acc-info">Virtual Name: {currentOrder.virtualAccount.accountName}</p>
                      
                      <button
                        className="btn btn-primary btn-full"
                        style={{ marginTop: '15px' }}
                        onClick={() => handleSimulatePayment()}
                        disabled={simulating}
                      >
                        {simulating ? 'Processing...' : 'Confirm Transfer from Bank App'}
                      </button>
                    </div>
                  ) : (
                    <div className="card-checkout-box" style={{ padding: '1.25rem', background: 'var(--rich-black)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <span className="label" style={{ display: 'block', marginBottom: '15px', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--monnify-cyan)' }}>Direct Card Payment (Sandbox)</span>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '15px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <label style={{ fontSize: '0.75rem', color: 'var(--platinum-muted)' }}>Card Number (PAN)</label>
                          <input 
                            type="text" 
                            value={pan} 
                            onChange={e => setPan(e.target.value)}
                            placeholder="Card Number" 
                            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--platinum)', padding: '0.5rem', borderRadius: '6px', fontSize: '0.9rem' }}
                          />
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <label style={{ fontSize: '0.75rem', color: 'var(--platinum-muted)' }}>Expiry (MM/YY)</label>
                            <input 
                              type="text" 
                              value={expiry} 
                              onChange={e => setExpiry(e.target.value)}
                              placeholder="MM/YY" 
                              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--platinum)', padding: '0.5rem', borderRadius: '6px', fontSize: '0.9rem' }}
                            />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <label style={{ fontSize: '0.75rem', color: 'var(--platinum-muted)' }}>CVV</label>
                            <input 
                              type="password" 
                              maxLength={3}
                              value={cvv} 
                              onChange={e => setCvv(e.target.value)}
                              placeholder="CVV" 
                              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--platinum)', padding: '0.5rem', borderRadius: '6px', fontSize: '0.9rem' }}
                            />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <label style={{ fontSize: '0.75rem', color: 'var(--platinum-muted)' }}>PIN</label>
                            <input 
                              type="password" 
                              maxLength={4}
                              value={pin} 
                              onChange={e => setPin(e.target.value)}
                              placeholder="PIN" 
                              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--platinum)', padding: '0.5rem', borderRadius: '6px', fontSize: '0.9rem' }}
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        className="btn btn-primary btn-full"
                        onClick={handleCardPayment}
                        disabled={simulating}
                      >
                        {simulating ? 'Charging Card...' : 'Authorize Sandbox Card Payment'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
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
