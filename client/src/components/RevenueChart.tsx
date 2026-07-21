interface Order {
  id: string;
  totalAmount: number;
  status: string;
  createdAt?: number;
}

function formatCurrency(amount: number): string {
  return '₦' + amount.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

interface RevenueChartProps {
  orders: Order[];
}

function groupRevenueByDate(orders: Order[]): { date: string; amount: number; day: string }[] {
  const paid = orders.filter(o => o.status === 'paid');
  const groups: Record<string, { amount: number; day: string }> = {};
  
  for (const o of paid) {
    if (!o.createdAt) continue;
    const d = new Date(o.createdAt);
    const key = d.toLocaleDateString('en-NG', { day: '2-digit', month: 'short' });
    const day = d.toLocaleDateString('en-NG', { weekday: 'short' });
    groups[key] = groups[key] || { amount: 0, day };
    groups[key].amount += o.totalAmount;
  }

  return Object.entries(groups).map(([date, val]) => ({ date, ...val }));
}

export default function RevenueChart({ orders }: RevenueChartProps) {
  const data = groupRevenueByDate(orders);
  if (data.length === 0) {
    return (
      <div className="panel chart-panel">
        <div className="chart-header">
          <div>
            <h3>Revenue Trend</h3>
            <p className="chart-sub">Daily transaction volume</p>
          </div>
        </div>
        <div className="chart-empty">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <span>No revenue data yet</span>
        </div>
      </div>
    );
  }

  const maxAmount = Math.max(...data.map(d => d.amount));
  const barMaxHeight = 160;

  return (
    <div className="panel chart-panel">
      <div className="chart-header">
        <div>
          <h3>Revenue Trend</h3>
          <p className="chart-sub">Daily transaction volume</p>
        </div>
        <div className="chart-total">
          <span className="chart-total-label">Total</span>
          <span className="chart-total-value">{formatCurrency(data.reduce((s, d) => s + d.amount, 0))}</span>
        </div>
      </div>
      <div className="chart-bars">
        {data.map((d, i) => {
          const height = maxAmount > 0 ? Math.max((d.amount / maxAmount) * barMaxHeight, 8) : 0;
          return (
            <div className="chart-bar-col" key={i}>
              <span className="chart-bar-value">{formatCurrency(d.amount)}</span>
              <div className="chart-bar-track">
                <div
                  className="chart-bar-fill"
                  style={{ height: `${height}px` }}
                />
              </div>
              <span className="chart-bar-label">{d.date}</span>
              <span className="chart-bar-day">{d.day}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
