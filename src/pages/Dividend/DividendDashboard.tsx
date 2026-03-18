import type { DividendBreakdown } from './dividendUtils';
import { fmtYen, AFTER_TAX } from './dividendUtils';

interface Props {
  breakdown: DividendBreakdown;
  prevYearAnnual?: number; // 前年比較（履歴がある場合）
}

function MetricCard({
  label, value, sub, badge, color = 'text-text',
}: {
  label: string;
  value: string;
  sub?: string;
  badge?: string;
  color?: string;
}) {
  return (
    <div className="bg-surface-2/70 rounded-xl p-3">
      <div className="text-muted text-xs mb-1">{label}</div>
      <div className={`font-mono font-bold text-base ${color}`}>{value}</div>
      {sub  && <div className="text-muted text-xs mt-0.5">{sub}</div>}
      {badge && (
        <span className="inline-block mt-1 text-xs px-1.5 py-0.5 rounded-full bg-gain/10 text-gain border border-gain/30">
          {badge}
        </span>
      )}
    </div>
  );
}

export function DividendDashboard({ breakdown, prevYearAnnual }: Props) {
  const { totalAnnual, totalAfterTax, portfolioYield, nisaAnnual, taxableAnnual, taxableAfterTax } = breakdown;
  const monthlyAfterTax = totalAfterTax / 12;

  const yoy = prevYearAnnual && prevYearAnnual > 0
    ? (totalAnnual - prevYearAnnual) / prevYearAnnual
    : null;

  return (
    <div className="space-y-4">
      {/* ヒーローカード */}
      <div className="bg-gradient-to-br from-emerald-900/40 to-surface border border-gain/30 rounded-2xl p-5">
        <div className="text-muted text-xs mb-1">年間配当収入（予測・税引後）</div>
        <div className="flex items-end gap-3 mb-1">
          <div className="text-text font-bold text-3xl font-mono">{fmtYen(totalAfterTax)}</div>
          {yoy !== null && (
            <div className={`text-sm font-semibold mb-0.5 ${yoy >= 0 ? 'text-gain' : 'text-loss'}`}>
              {yoy >= 0 ? '↑' : '↓'} {Math.abs(yoy * 100).toFixed(1)}%（前年比）
            </div>
          )}
        </div>
        <div className="text-muted text-sm">
          月換算{' '}
          <span className="text-text font-mono font-semibold">{fmtYen(monthlyAfterTax)}/月</span>
          <span className="text-muted/60 mx-2">·</span>
          ポートフォリオ利回り{' '}
          <span className="text-gain font-mono font-semibold">{(portfolioYield * 100).toFixed(2)}%</span>
        </div>

        {/* 小計 */}
        <div className="mt-4 pt-4 border-t border-gain/30/30 grid grid-cols-2 gap-3">
          <div className="text-xs">
            <div className="text-muted mb-0.5">NISA口座（非課税）</div>
            <div className="text-text font-mono font-semibold">{fmtYen(nisaAnnual)}</div>
            <span className="inline-block mt-0.5 text-xs px-1.5 py-0.5 rounded-full bg-gain/10 text-gain border border-gain/30">
              非課税
            </span>
          </div>
          <div className="text-xs">
            <div className="text-muted mb-0.5">課税口座（特定・一般）</div>
            <div className="text-text font-mono font-semibold">{fmtYen(taxableAnnual)}</div>
            <div className="text-muted mt-0.5">
              税引後 <span className="text-warn font-mono">{fmtYen(taxableAfterTax)}</span>
              <span className="text-muted/60 ml-1">×{AFTER_TAX.toFixed(5)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4メトリクス */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label="月間配当（税前）"
          value={fmtYen(totalAnnual / 12)}
          sub="全口座合計"
          color="text-slate-200"
        />
        <MetricCard
          label="月間配当（税引後）"
          value={fmtYen(monthlyAfterTax)}
          sub="手取り概算"
          color="text-gain"
        />
        <MetricCard
          label="ポートフォリオ利回り"
          value={`${(portfolioYield * 100).toFixed(2)}%`}
          sub="配当利回り（加重平均）"
          color={portfolioYield > 0.04 ? 'text-gain' : portfolioYield > 0.02 ? 'text-warn' : 'text-text'}
        />
        <MetricCard
          label="NISA配当比率"
          value={`${breakdown.nisaAnnual > 0 ? (breakdown.nisaRatio * 100).toFixed(0) : '0'}%`}
          sub="非課税枠の活用度"
          badge={breakdown.nisaRatio > 0.5 ? '非課税優遇' : undefined}
          color="text-info"
        />
      </div>
    </div>
  );
}
