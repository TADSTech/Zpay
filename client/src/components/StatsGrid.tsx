interface Order {
  id: string;
  totalAmount: number;
  status: string;
}

function formatCurrency(amount: number): string {
  return '₦' + amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface StatsGridProps {
  orders: Order[];
}

export default function StatsGrid({ orders }: StatsGridProps) {
  const paidOrders = orders.filter(o => o.status === 'paid');
  const pendingOrders = orders.filter(o => o.status === 'pending');
  const totalVolume = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const pendingVolume = pendingOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const completionRate = orders.length > 0 ? ((paidOrders.length / orders.length) * 100).toFixed(1) : '0.0';

  return (
    <div className="stats-grid">
      <div className="stat-card">
        <span className="stat-label">Total Naira Volume</span>
        <h3 className="stat-value" id="dashboard-total-volume">{formatCurrency(totalVolume)}</h3>
        <span className="stat-change text-green">
          {paidOrders.length > 0 ? '▲ Live from Firestore' : 'No paid orders yet'}
        </span>
      </div>
      <div className="stat-card">
        <span className="stat-label">Successful Conversions</span>
        <h3 className="stat-value" id="dashboard-success-count">{paidOrders.length}</h3>
        <span className="stat-change text-gold">{completionRate}% completion rate</span>
      </div>
      <div className="stat-card">
        <span className="stat-label">Pending Virtual Accounts</span>
        <h3 className="stat-value" id="dashboard-pending-count">{pendingOrders.length}</h3>
        <span className="stat-change">Awaiting bank transfers</span>
      </div>
      <div className="stat-card">
        <span className="stat-label">Pending Revenue</span>
        <h3 className="stat-value">{formatCurrency(pendingVolume)}</h3>
        <span className="stat-change text-muted">Money left on the table</span>
      </div>
    </div>
  );
}
