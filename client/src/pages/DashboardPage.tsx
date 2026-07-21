import { useEffect, useState, useCallback } from 'react';
import { apiGet } from '../lib/api';
import StatsGrid from '../components/StatsGrid';
import OrdersTable from '../components/OrdersTable';

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
  createdAt: number;
}

interface OrdersResponse {
  success: boolean;
  orders: Order[];
}

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      setError(null);
      const data = await apiGet<OrdersResponse>('/api/orders');
      if (data.success) {
        setOrders(data.orders);
      } else {
        setError('Failed to load orders');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load orders';
      setError(message);
      console.error('Error fetching orders:', err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders(false);
    // Poll every 15 seconds for live updates (in background)
    const interval = setInterval(() => fetchOrders(true), 15000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  return (
    <div className="view-panel" id="panel-dashboard">
      <StatsGrid orders={orders} />

      {error && (
        <div className="panel" style={{ borderColor: 'var(--error)', textAlign: 'center', padding: '1rem' }}>
          <p style={{ color: 'var(--error)' }}>{error}</p>
          <button className="btn btn-secondary" onClick={() => fetchOrders(false)} style={{ marginTop: '0.5rem', width: 'auto' }}>
            Retry
          </button>
        </div>
      )}

      <OrdersTable orders={orders} loading={loading} />
    </div>
  );
}
