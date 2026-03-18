import { useState } from 'react';
import type { CostRow } from './costUtils';
import { calcTenYearLoss } from './costUtils';
import { ACCOUNT_TYPE_LABELS } from '../../constants/labels';

interface Props {
  rows: CostRow[];
  onSelectAsset?: (assetId: string) => void;
}

type SortKey = 'costRate' | 'annualCostYen' | 'value' | 'tenYear';

const BADGE = {
  low:  { icon: '✅', text: '最安',   color: 'bg-emerald-900/40 text-gain border-emerald-800' },
  mid:  { icon: '⚠️', text: '要検討', color: 'bg-amber-900/40 text-warn border-amber-800' },
  high: { icon: '🔴', text: '割高',   color: 'bg-red-900/40 text-loss border-red-800' },
} as const;

export function CostTable({ rows, onSelectAsset }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('costRate');
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = [...rows].sort((a, b) => {
    let va = 0, vb = 0;
    if (sortKey === 'costRate')     { va = a.costRate;       vb = b.costRate; }
    if (sortKey === 'annualCostYen'){ va = a.annualCostYen;  vb = b.annualCostYen; }
    if (sortKey === 'value')        { va = a.asset.currentValue; vb = b.asset.currentValue; }
    if (sortKey === 'tenYear')      {
      va = calcTenYearLoss(a.asset.currentValue, a.costRate);
      vb = calcTenYearLoss(b.asset.currentValue, b.costRate);
    }
    return sortAsc ? va - vb : vb - va;
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(false); }
  };

  const totalAnnual = rows.reduce((s, r) => s + r.annualCostYen, 0);

  if (rows.length === 0) {
    return (
      <div className="text-center py-10 text-muted text-sm">
        信託報酬が設定された銘柄がありません。<br/>
        資産入力画面で信託報酬率を入力してください。
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 合計 */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted">{rows.length}銘柄の信託報酬</span>
        <span className="text-text font-mono font-semibold">
          年間合計 ¥{totalAnnual.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </span>
      </div>

      {/* ソートヘッダー */}
      <div className="grid grid-cols-4 gap-1 text-xs text-muted px-1">
        {([ ['costRate', '信託報酬率'], ['annualCostYen', '年間コスト'], ['value', '評価額'], ['tenYear', '10年損失'] ] as [SortKey, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => handleSort(key)}
            className={`text-left hover:text-text transition-colors ${sortKey === key ? 'text-gold' : ''}`}
          >
            {label} {sortKey === key ? (sortAsc ? '↑' : '↓') : ''}
          </button>
        ))}
      </div>

      {/* 銘柄リスト */}
      <div className="space-y-2">
        {sorted.map((row) => {
          const badge = BADGE[row.label];
          const tenYear = calcTenYearLoss(row.asset.currentValue, row.costRate);

          return (
            <div
              key={row.asset.id}
              className={`bg-surface-2 border rounded-xl p-4 transition-colors ${
                row.label === 'high' ? 'border-red-900' : 'border-border'
              }`}
            >
              {/* 銘柄名 + バッジ */}
              <div className="flex items-start gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="text-text text-sm font-medium leading-snug truncate">
                    {row.asset.name}
                  </div>
                  <div className="text-muted text-xs mt-0.5">
                    {ACCOUNT_TYPE_LABELS[row.asset.account]}
                  </div>
                </div>
                <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full border ${badge.color}`}>
                  {badge.icon} {badge.text}
                </span>
              </div>

              {/* メトリクス 2×2 */}
              <div className="grid grid-cols-2 gap-3">
                <Metric label="信託報酬率" value={`${(row.costRate * 100).toFixed(4)}%`} highlight={row.label === 'high'} />
                <Metric label="年間コスト" value={`¥${row.annualCostYen.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
                <Metric label="評価額" value={`¥${row.asset.currentValue.toLocaleString()}`} />
                <Metric label="10年累積損失" value={`¥${tenYear.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} highlight={tenYear > 500000} />
              </div>

              {/* 乗り換えシミュへのショートカット */}
              {row.label !== 'low' && onSelectAsset && (
                <button
                  onClick={() => onSelectAsset(row.asset.id)}
                  className="mt-3 w-full text-xs text-gold hover:text-gold text-left border-t border-border pt-2"
                >
                  → 乗り換えシミュレーターで試算する
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-muted text-xs">{label}</div>
      <div className={`font-mono text-sm font-semibold mt-0.5 ${highlight ? 'text-loss' : 'text-text'}`}>
        {value}
      </div>
    </div>
  );
}
