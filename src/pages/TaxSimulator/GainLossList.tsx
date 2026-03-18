import { useState } from 'react';
import type { TaxableGain } from '../../types';
import { ACCOUNT_TYPE_LABELS } from '../../constants/labels';
import { NISA_ACCOUNTS, TAX_RATE, fmtYen, fmtPct, gainColor } from './taxUtils';

interface Props {
  gains: TaxableGain[];
  nisaUnrealizedGain: number;
}

type SortKey = 'gainLoss' | 'gainRate' | 'estimatedTax' | 'name';
type SortDir = 'asc' | 'desc';

export function GainLossList({ gains, nisaUnrealizedGain }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('gainLoss');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filter, setFilter]   = useState<'all' | 'gain' | 'loss'>('all');

  const sorted = [...gains]
    .filter((g) => {
      if (filter === 'gain') return g.gainLoss > 0;
      if (filter === 'loss') return g.gainLoss < 0;
      return true;
    })
    .sort((a, b) => {
      let va: number, vb: number;
      switch (sortKey) {
        case 'gainLoss':    va = a.gainLoss;     vb = b.gainLoss;     break;
        case 'gainRate':    va = a.gainLoss / a.acquisitionPrice; vb = b.gainLoss / b.acquisitionPrice; break;
        case 'estimatedTax': va = a.estimatedTax; vb = b.estimatedTax; break;
        case 'name':        return sortDir === 'asc'
          ? a.assetName.localeCompare(b.assetName)
          : b.assetName.localeCompare(a.assetName);
      }
      return sortDir === 'asc' ? va - vb : vb - va;
    });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };
  const setDir = (fn: (d: SortDir) => SortDir) => setSortDir(fn);

  const SortBtn = ({ k, label }: { k: SortKey; label: string }) => (
    <button
      onClick={() => handleSort(k)}
      className={`text-right ${sortKey === k ? 'text-gold font-semibold' : 'text-muted'} hover:text-text`}
    >
      {label}{sortKey === k ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* NISA 非課税参考値 */}
      {nisaUnrealizedGain !== 0 && (
        <div className="bg-gain/10 border border-gain/30 rounded-2xl px-4 py-3 text-xs">
          <div className="text-gain font-semibold mb-0.5">NISA口座の含み益（非課税）</div>
          <div className="text-gain font-mono text-lg font-bold">{fmtYen(nisaUnrealizedGain)}</div>
          <div className="text-muted mt-0.5">
            もし課税口座だった場合の税額試算: {fmtYen(nisaUnrealizedGain * TAX_RATE)}
            <span className="text-muted ml-1">（参考値・実際は非課税）</span>
          </div>
        </div>
      )}

      {/* フィルター */}
      <div className="flex gap-2">
        {(['all', 'gain', 'loss'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f
                ? 'bg-gold text-text'
                : 'bg-surface-2 text-muted hover:text-text'
            }`}
          >
            {f === 'all' ? '全て' : f === 'gain' ? '含み益' : '含み損'}
          </button>
        ))}
        <div className="ml-auto text-xs text-muted self-center">{sorted.length}銘柄</div>
      </div>

      {gains.length === 0 ? (
        <div className="bg-surface-2 border border-border rounded-2xl p-6 text-center">
          <div className="text-4xl mb-3">📊</div>
          <div className="text-muted text-sm">取得価格が設定された銘柄がありません。</div>
          <div className="text-muted text-xs mt-1">資産入力時に取得価格を入力してください。</div>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full text-xs min-w-[600px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-muted pb-2 font-normal pr-2">銘柄</th>
                <th className="text-right text-muted pb-2 px-2 font-normal">取得価格</th>
                <th className="text-right text-muted pb-2 px-2 font-normal">現在価格</th>
                <th className="pb-2 px-2"><SortBtn k="gainLoss" label="損益額" /></th>
                <th className="pb-2 px-2"><SortBtn k="gainRate" label="損益率" /></th>
                <th className="text-center text-muted pb-2 px-2 font-normal">口座</th>
                <th className="pb-2 pl-2"><SortBtn k="estimatedTax" label="予想税額" /></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((g) => {
                const gainRate  = g.acquisitionPrice > 0 ? g.gainLoss / g.acquisitionPrice : 0;
                const isNisa    = NISA_ACCOUNTS.includes(g.account);
                const isLoss    = g.gainLoss < 0;

                return (
                  <tr key={g.assetId} className={`border-b border-border hover:bg-surface-2/30 ${isLoss && !isNisa ? 'bg-red-900/5' : ''}`}>
                    <td className="py-2.5 pr-2">
                      <div className="text-text font-medium truncate max-w-[160px]">{g.assetName}</div>
                      {isLoss && !isNisa && (
                        <span className="text-xs text-loss bg-loss/10 px-1.5 py-0.5 rounded">損出し候補</span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-muted">
                      {fmtYen(g.acquisitionPrice)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-text">
                      {fmtYen(g.currentValue)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono font-semibold">
                      <span className={gainColor(g.gainLoss)}>
                        {g.gainLoss >= 0 ? '+' : ''}{fmtYen(g.gainLoss)}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono">
                      <span className={gainColor(gainRate)}>{fmtPct(gainRate)}</span>
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      {isNisa ? (
                        <span className="px-1.5 py-0.5 rounded-full text-xs bg-emerald-900/40 text-gain border border-gain/30">
                          非課税
                        </span>
                      ) : (
                        <span className="text-muted">{ACCOUNT_TYPE_LABELS[g.account]}</span>
                      )}
                    </td>
                    <td className="py-2.5 pl-2 text-right font-mono">
                      {isNisa ? (
                        <span className="text-gain text-xs">¥0（非課税）</span>
                      ) : g.estimatedTax > 0 ? (
                        <span className="text-warn">{fmtYen(g.estimatedTax)}</span>
                      ) : (
                        <span className="text-muted/60">−</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="text-xs text-muted/60 text-right">
        ※ 予想税額は含み益×{(TAX_RATE * 100).toFixed(3)}%の概算値（特定・一般口座のみ）
      </div>
    </div>
  );
}
