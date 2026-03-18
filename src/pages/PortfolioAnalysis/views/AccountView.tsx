import { useRef } from 'react';
import type { Asset } from '../../../types';
import { ACCOUNT_TYPE_LABELS } from '../../../constants/labels';
import { calcAccountData } from '../portfolioUtils';
import { SharedDonutChart } from '../SharedDonutChart';
import { CommentCard } from '../CommentCard';

// NISA制度の年間・生涯非課税枠（2024年〜）
const NISA_LIMITS = {
  nisa_growth:    { annual: 2_400_000,  lifetime: 12_000_000, label: '成長投資枠' },
  nisa_tsumitate: { annual: 1_200_000,  lifetime:  6_000_000, label: 'つみたて投資枠' },
};

const ACCOUNT_ICONS: Record<string, string> = {
  nisa_growth: '🌱',
  nisa_tsumitate: '📅',
  ideco: '🏛️',
  tokutei: '📊',
  ippan: '📁',
  none: '💼',
};

interface Props { assets: Asset[] }

export function AccountView({ assets }: Props) {
  const listRef  = useRef<HTMLDivElement>(null);
  const entries  = calcAccountData(assets);
  const total    = assets.reduce((s, a) => s + a.currentValue, 0);

  const chartData = entries.map((e) => ({
    name: ACCOUNT_TYPE_LABELS[e.key],
    value: e.value,
    color: e.color,
  }));

  const nisaGrowthEntry   = entries.find((e) => e.key === 'nisa_growth');
  const nisaTsumiEntry    = entries.find((e) => e.key === 'nisa_tsumitate');
  const idecoEntry        = entries.find((e) => e.key === 'ideco');
  const tokuteiEntry      = entries.find((e) => e.key === 'tokutei');
  const nisaTotal = (nisaGrowthEntry?.value ?? 0) + (nisaTsumiEntry?.value ?? 0);
  const taxFreeTotal = nisaTotal + (idecoEntry?.value ?? 0);
  const taxFreeRatio = total > 0 ? taxFreeTotal / total : 0;
  const taxableRatio = tokuteiEntry ? tokuteiEntry.ratio : 0;

  return (
    <div className="space-y-5">
      <SharedDonutChart
        data={chartData}
        onSliceClick={() => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        centerLabel={`${(taxFreeRatio * 100).toFixed(0)}%`}
        centerSub="非課税比率"
      />

      {/* NISA枠ステータス */}
      {(nisaGrowthEntry || nisaTsumiEntry) && (
        <div className="bg-surface-2 border border-border rounded-xl p-4 space-y-3">
          <div className="text-text text-sm font-semibold">NISA非課税枠の状況</div>

          {(['nisa_growth', 'nisa_tsumitate'] as const).map((key) => {
            const entry = entries.find((e) => e.key === key);
            if (!entry) return null;
            const limits = NISA_LIMITS[key];
            const usedRatio = Math.min(entry.value / limits.lifetime, 1);
            const remaining = Math.max(limits.lifetime - entry.value, 0);

            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-text text-xs">{limits.label}</span>
                  <span className="text-muted text-xs">
                    生涯枠 {(limits.lifetime / 10000).toFixed(0)}万円
                  </span>
                </div>
                <div className="h-2 bg-border rounded-full overflow-hidden mb-1">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-400"
                    style={{ width: `${usedRatio * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted">
                    利用: ¥{(entry.value / 10000).toFixed(0)}万
                    <span className="text-muted/60 ml-1">({(usedRatio * 100).toFixed(1)}%)</span>
                  </span>
                  <span className="text-gain">
                    残: ¥{(remaining / 10000).toFixed(0)}万
                  </span>
                </div>
                <div className="text-muted/60 text-xs mt-0.5">
                  年間上限: {(limits.annual / 10000).toFixed(0)}万円
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 課税・非課税サマリー */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gain/10 border border-emerald-800 rounded-xl p-3">
          <div className="text-gain text-xs mb-1">非課税口座合計</div>
          <div className="text-text font-bold text-base">¥{taxFreeTotal.toLocaleString()}</div>
          <div className="text-gain text-xs">{(taxFreeRatio * 100).toFixed(1)}%</div>
        </div>
        <div className="bg-warn/10 border border-amber-800 rounded-xl p-3">
          <div className="text-warn text-xs mb-1">課税口座合計</div>
          <div className="text-text font-bold text-base">
            ¥{(total - taxFreeTotal).toLocaleString()}
          </div>
          <div className="text-warn text-xs">{((1 - taxFreeRatio) * 100).toFixed(1)}%</div>
        </div>
      </div>

      {/* コメント */}
      <div className="space-y-2">
        {taxFreeRatio >= 0.60 && (
          <CommentCard type="good"
            title="非課税口座の活用度が高い"
            body={`非課税口座比率 ${(taxFreeRatio * 100).toFixed(1)}%。NISAやiDeCoを活用することで将来の税負担を大幅に抑えられています。`}
          />
        )}
        {taxFreeRatio < 0.30 && total > 5_000_000 && (
          <CommentCard type="warn"
            title="NISA枠の活用余地があります"
            body={`非課税口座比率が ${(taxFreeRatio * 100).toFixed(1)}%。年間NISA枠（最大360万円）を積極的に活用することで、将来の売却益・配当への課税を回避できます。`}
          />
        )}
        {taxableRatio > 0.60 && (
          <CommentCard type="info"
            title="特定口座の含み益にご注意"
            body="特定口座の売却益・配当には20.315%の税金がかかります。NISA口座への移管（ロールオーバー）や損出しによる節税を検討してください。"
          />
        )}
        {!nisaGrowthEntry && !nisaTsumiEntry && (
          <CommentCard type="info"
            title="NISAを開設しましょう"
            body="新NISAは年間360万円、生涯1800万円の非課税投資が可能です。課税口座の資産をNISAに移行することで、長期的な資産形成効率が向上します。"
          />
        )}
      </div>

      {/* 口座別リスト */}
      <div ref={listRef} className="space-y-2">
        <h3 className="text-muted text-xs font-medium uppercase tracking-wide">口座別内訳</h3>
        {entries.map((e) => {
          const isNisaAccount = e.key === 'nisa_growth' || e.key === 'nisa_tsumitate';
          const isIdecoAccount = e.key === 'ideco';
          const assetsInAccount = assets.filter((a) => a.account === e.key);
          return (
            <div key={e.key} className="bg-surface-2 border border-border rounded-xl px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{ACCOUNT_ICONS[e.key]}</span>
                  <div>
                    <div className="text-text text-sm font-medium">{ACCOUNT_TYPE_LABELS[e.key]}</div>
                    <div className="flex gap-2 mt-0.5">
                      {(isNisaAccount || isIdecoAccount) && (
                        <span className="text-xs text-gain">非課税</span>
                      )}
                      <span className="text-xs text-muted">{assetsInAccount.length}銘柄</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-text font-mono text-sm">¥{e.value.toLocaleString()}</div>
                  <div className="text-muted text-xs">{(e.ratio * 100).toFixed(1)}%</div>
                </div>
              </div>
              <div className="h-1.5 bg-border rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${e.ratio * 100}%`, backgroundColor: e.color }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
