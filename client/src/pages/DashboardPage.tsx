import { useEffect, useState, useCallback } from 'react';
import { apiGet } from '../lib/api';
import StatsGrid from '../components/StatsGrid';
import RevenueChart from '../components/RevenueChart';
import PaymentMethodChart from '../components/PaymentMethodChart';
import OrdersTable from '../components/OrdersTable';
import OnboardingModal from '../components/OnboardingModal';

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
  source?: string;
  deliveryAddress?: string;
  contactInfo?: string;
  notes?: string;
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
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders(false);
    const interval = setInterval(() => fetchOrders(true), 15000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  return (
    <div className="view-panel" id="panel-dashboard">
      <OnboardingModal />
      <StatsGrid orders={orders} />

      {error && (
        <div className="panel error-banner">
          <div className="error-banner-content">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
          <button className="btn btn-secondary" onClick={() => fetchOrders(false)} style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
            Retry
          </button>
        </div>
      )}

      <div className="dashboard-charts">
        <RevenueChart orders={orders} />
        <PaymentMethodChart orders={orders} />
      </div>

      <OrdersTable orders={orders} loading={loading} />
    </div>
  );
}
