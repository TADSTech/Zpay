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

  const stats = [
    {
      label: 'Total Revenue',
      value: formatCurrency(totalVolume),
      sub: `${paidOrders.length} completed transactions`,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
    },
    {
      label: 'Conversion Rate',
      value: `${completionRate}%`,
      sub: `${paidOrders.length} of ${orders.length} orders completed`,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
    },
    {
      label: 'Pending Settlements',
      value: pendingOrders.length.toString(),
      sub: formatCurrency(pendingVolume) + ' awaiting transfer',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <line x1="12" y1="9" x2="12" y2="15" />
          <line x1="9" y1="12" x2="15" y2="12" />
        </svg>
      ),
    },
    {
      label: 'Avg. Order Value',
      value: paidOrders.length > 0 ? formatCurrency(Math.round(totalVolume / paidOrders.length)) : '₦0.00',
      sub: `${orders.length} total orders processed`,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
          <line x1="7" y1="7" x2="7.01" y2="7" />
        </svg>
      ),
    },
  ];

  return (
    <div className="stats-grid">
      {stats.map((stat, index) => (
        <div className="stat-card" key={index}>
          <div className="stat-card-header">
            <span className="stat-label">{stat.label}</span>
            <span className="stat-icon-wrap">{stat.icon}</span>
          </div>
          <span className="stat-value">{stat.value}</span>
          <span className="stat-sub">{stat.sub}</span>
        </div>
      ))}
    </div>
  );
}
