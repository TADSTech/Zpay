import { useState } from 'react';
import { apiPost } from '../lib/api';

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
}

function formatCurrency(amount: number): string {
  return '₦' + amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface OrdersTableProps {
  orders: Order[];
  loading?: boolean;
}

export default function OrdersTable({ orders, loading }: OrdersTableProps) {
  const [refunding, setRefunding] = useState<string | null>(null);

  const handleRefund = async (orderId: string) => {
    if (!window.confirm("Refund excess funds back to the customer's account?")) return;
    setRefunding(orderId);
    try {
      const res = await apiPost<{success: boolean, error?: string}>('/api/refund', { orderId });
      if (res.success) {
        alert("Refund processed successfully!");
        window.location.reload(); // Refresh the page to get updated orders
      } else {
        alert(res.error || "Failed to refund");
      }
    } catch(e: any) {
      alert(e.message || "Error processing refund");
    } finally {
      setRefunding(null);
    }
  };

  return (
    <section className="panel orders-panel">
      <div className="panel-header">
        <h3>Recent Zero-UI Transactions</h3>
        <p>Real-time audit log of parsed customer chats and payments.</p>
      </div>
      <div className="table-container" style={{ overflowX: 'auto' }}>
        <table className="orders-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Source</th>
              <th>Address / Contact</th>
              <th>Order Items</th>
              <th>Total</th>
              <th>Payment Type</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="ordersTableBody">
            {loading ? (
              <tr>
                <td colSpan={9} style={{ padding: '3.5rem 0' }}>
                  <div className="zp-loading" style={{ padding: 0 }}>
                    <div className="zp-loader" aria-hidden="true" style={{ ['--zp-dot' as string]: '12px' }}><span /><span /><span /></div>
                    <span className="zp-loading-label">Loading transactions</span>
                  </div>
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={9} className="empty-table">
                  No transactions yet. Use the Chat Simulator to create your first order!
                </td>
              </tr>
            ) : (
              orders.map(order => {
                const itemsStr = order.items.map(i => `${i.qty}x ${i.product}`).join(', ');
                return (
                  <tr key={order.id}>
                    <td><strong>#{order.id}</strong></td>
                    <td>{order.customerName}</td>
                    <td>
                      <span className="badge-type">
                        {order.source || 'N/A'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', maxWidth: '150px' }}>
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={order.deliveryAddress}>
                        📍 {order.deliveryAddress || 'N/A'}
                      </div>
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--platinum-muted)' }} title={order.contactInfo}>
                        📞 {order.contactInfo || 'N/A'}
                      </div>
                    </td>
                    <td className="items-cell" title={itemsStr}>{itemsStr}</td>
                    <td><strong>{formatCurrency(order.totalAmount)}</strong></td>
                    <td>
                      <span className="badge-type">
                        {order.paymentMethod === 'transfer' ? 'Virtual Account' : 'Web Link'}
                      </span>
                    </td>
                    <td>
                      <span className={`status-pill ${order.status}`}>
                        {order.status.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      {order.notes?.includes('Over-payment') && order.status === 'paid' && (
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                          onClick={() => handleRefund(order.id)}
                          disabled={refunding === order.id}
                        >
                          {refunding === order.id ? 'Refunding...' : 'Refund Excess'}
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
    </section>
  );
}
