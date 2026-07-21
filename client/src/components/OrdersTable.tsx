import { useState } from 'react';
import { apiPost } from '../lib/api';
import Modal from './Modal';

interface OrderItem {
  product: string;
  qty: number;
  price: number;
}

interface Order {
  id: string;
  customerName: string;
  items: OrderItem[];
  totalAmount: number;
  paymentMethod: string;
  status: string;
  notes?: string;
  source?: string;
  deliveryAddress?: string;
  contactInfo?: string;
  createdAt?: number;
}

function formatCurrency(amount: number): string {
  return '₦' + amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(ts?: number): string {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString('en-NG', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

interface OrdersTableProps {
  orders: Order[];
  loading?: boolean;
}

export default function OrdersTable({ orders, loading }: OrdersTableProps) {
  const [refunding, setRefunding] = useState<string | null>(null);
  const [refundModal, setRefundModal] = useState<{ open: boolean; orderId: string }>({ open: false, orderId: '' });
  const [refundResult, setRefundResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleRefundConfirm = async () => {
    const orderId = refundModal.orderId;
    setRefunding(orderId);
    setRefundResult(null);
    try {
      const res = await apiPost<{ success: boolean; error?: string }>('/api/refund', { orderId });
      if (res.success) {
        setRefundResult({ type: 'success', message: 'Refund processed successfully.' });
      } else {
        setRefundResult({ type: 'error', message: res.error || 'Failed to process refund.' });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error processing refund';
      setRefundResult({ type: 'error', message: msg });
    } finally {
      setRefunding(null);
    }
  };

  return (
    <section className="panel orders-panel">
      <div className="panel-header">
        <h3>Transaction History</h3>
        <p>Audit log of all conversational payments processed through ZPay.</p>
      </div>
      <div className="table-container">
        <table className="orders-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Source</th>
              <th>Items</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9}>
                  <div className="zp-loading" style={{ padding: '3rem 0' }}>
                    <div className="zp-loader" aria-hidden="true" style={{ ['--zp-dot' as string]: '12px' } as React.CSSProperties}><span /><span /><span /></div>
                    <span className="zp-loading-label">Loading transactions</span>
                  </div>
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={9} className="empty-table">
                  <div className="empty-table-content">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4, marginBottom: '0.5rem' }}>
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <line x1="12" y1="9" x2="12" y2="15" />
                      <line x1="9" y1="12" x2="15" y2="12" />
                    </svg>
                    <p>No transactions recorded yet.</p>
                    <span>Use the Chat Simulator to create your first order.</span>
                  </div>
                </td>
              </tr>
            ) : (
              orders.map(order => {
                const itemsStr = order.items.map(i => `${i.qty}x ${i.product}`).join(', ');
                return (
                  <tr key={order.id}>
                    <td className="td-order-id">#{order.id.slice(0, 7)}</td>
                    <td className="td-customer">
                      <span className="customer-avatar">{order.customerName.charAt(0).toUpperCase()}</span>
                      {order.customerName}
                    </td>
                    <td className="td-date">{formatDate(order.createdAt)}</td>
                    <td>
                      <span className="badge-source">{order.source || 'Direct'}</span>
                    </td>
                    <td className="td-items" title={itemsStr}>{itemsStr}</td>
                    <td className="td-total">{formatCurrency(order.totalAmount)}</td>
                    <td>
                      <span className="badge-payment">
                        {order.paymentMethod === 'transfer' ? 'Virtual Account' : 'Payment Link'}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${order.status}`}>
                        {order.status === 'paid' ? 'Completed' : 'Pending'}
                      </span>
                    </td>
                    <td>
                      {order.notes?.includes('Over-payment') && order.status === 'paid' && (
                        <button
                          className="btn btn-refund"
                          onClick={() => setRefundModal({ open: true, orderId: order.id })}
                          disabled={refunding === order.id}
                        >
                          {refunding === order.id ? (
                            <span className="btn-spinner" />
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="1 4 1 10 7 10" />
                              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                            </svg>
                          )}
                          Refund
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={refundModal.open}
        title="Confirm Refund"
        onClose={() => { setRefundModal({ open: false, orderId: '' }); setRefundResult(null); }}
        footer={
          refundResult ? (
            <button className="btn btn-primary" onClick={() => { setRefundModal({ open: false, orderId: '' }); setRefundResult(null); }}>
              Done
            </button>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={() => { setRefundModal({ open: false, orderId: '' }); setRefundResult(null); }}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleRefundConfirm} disabled={refunding !== null}>
                {refunding !== null ? 'Processing...' : 'Confirm Refund'}
              </button>
            </>
          )
        }
      >
        {refundResult ? (
          <div className={`refund-result refund-${refundResult.type}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {refundResult.type === 'success' ? (
                <polyline points="20 6 9 17 4 12" />
              ) : (
                <>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </>
              )}
            </svg>
            <span>{refundResult.message}</span>
          </div>
        ) : (
          <p>Refund excess funds back to the customer's account for order <strong>#{refundModal.orderId.slice(0, 7)}</strong>? This action cannot be undone.</p>
        )}
      </Modal>
    </section>
  );
}
