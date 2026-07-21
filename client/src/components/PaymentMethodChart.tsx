interface Order {
  id: string;
  paymentMethod: string;
  totalAmount: number;
  status: string;
}

function formatCurrency(amount: number): string {
  return '₦' + amount.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

interface PaymentMethodChartProps {
  orders: Order[];
}

export default function PaymentMethodChart({ orders }: PaymentMethodChartProps) {
  const paid = orders.filter(o => o.status === 'paid');
  const byMethod: Record<string, number> = {};
  for (const o of paid) {
    const method = o.paymentMethod === 'transfer' ? 'Virtual Account' : 'Payment Link';
    byMethod[method] = (byMethod[method] || 0) + o.totalAmount;
  }

  const entries = Object.entries(byMethod);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  const colors = ['var(--gold)', 'var(--gold-soft)'];

  if (entries.length === 0) {
    return (
      <div className="panel chart-panel">
        <div className="chart-header">
          <div>
            <h3>Payment Methods</h3>
            <p className="chart-sub">Volume by payment type</p>
          </div>
        </div>
        <div className="chart-empty">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <line x1="2" y1="10" x2="22" y2="10" />
          </svg>
          <span>No payment data yet</span>
        </div>
      </div>
    );
  }

  return (
    <div className="panel chart-panel">
      <div className="chart-header">
        <div>
          <h3>Payment Methods</h3>
          <p className="chart-sub">Volume by payment type</p>
        </div>
      </div>
      <div className="pm-chart">
        <div className="pm-donut">
          <svg width="100" height="100" viewBox="0 0 100 100">
            {entries.map(([, amount], i) => {
              const pct = amount / total;
              const circumference = 2 * Math.PI * 38;
              const dashLength = pct * circumference;
              const dashOffset = entries.slice(0, i).reduce((s, [, a]) => s + (a / total) * circumference, 0);
              return (
                <circle
                  key={i}
                  cx="50" cy="50" r="38"
                  fill="none"
                  stroke={colors[i % colors.length]}
                  strokeWidth="14"
                  strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                  strokeDashoffset={-dashOffset}
                  transform="rotate(-90 50 50)"
                  style={{ transition: 'stroke-dasharray 0.6s ease' }}
                />
              );
            })}
            <text x="50" y="50" textAnchor="middle" dominantBaseline="central" fontSize="18" fontWeight="700" fill="var(--silver-text)" fontFamily="Rubik, sans-serif">
              {entries.length > 0 ? formatCurrency(total).replace('₦', '') : '0'}
            </text>
          </svg>
        </div>
        <div className="pm-legend">
          {entries.map(([method, amount], i) => {
            const pct = ((amount / total) * 100).toFixed(1);
            return (
              <div className="pm-legend-row" key={i}>
                <div className="pm-legend-dot" style={{ background: colors[i % colors.length] }} />
                <span className="pm-legend-label">{method}</span>
                <span className="pm-legend-value">{formatCurrency(amount)}</span>
                <span className="pm-legend-pct">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
