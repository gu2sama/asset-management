import { WEALTH_TIERS, getCurrentTier, getNextTier, calcYearsToNextTier, fmtAsset } from './fireUtils';

interface Props {
  currentAsset: number;
  monthlyContrib: number;
  neutralNetRate: number;
}

export function WealthTier({ currentAsset, monthlyContrib, neutralNetRate }: Props) {
  const current  = getCurrentTier(currentAsset);
  const next     = getNextTier(current);
  const gapToNext = next ? next.min - currentAsset : 0;
  const yearsToNext = next
    ? calcYearsToNextTier(currentAsset, monthlyContrib, neutralNetRate, next.min)
    : null;

  // 現在の階級内でのプログレス（上限がInfinityの場合は省略）
  const isTop = current.max === Infinity;
  const tierRange = isTop ? 0 : current.max - current.min;
  const posInTier = isTop ? 1 : Math.min((currentAsset - current.min) / tierRange, 1);

  return (
    <div className="space-y-4">
      {/* 現在のステータス */}
      <div
        className="border rounded-2xl p-5 space-y-3"
        style={{ borderColor: current.color, backgroundColor: `${current.color}18` }}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs text-muted mb-0.5">現在の資産階級</div>
            <div className="text-2xl font-bold" style={{ color: current.color }}>{current.label}</div>
            <div className="text-text font-mono font-semibold text-lg mt-1">{fmtAsset(currentAsset)}</div>
          </div>
          <div className="text-right text-xs text-muted mt-1">
            <div>野村総研 資産階級区分</div>
            <div className="mt-0.5">
              {isTop
                ? `${fmtAsset(current.min)}以上`
                : `${fmtAsset(current.min)} 〜 ${fmtAsset(current.max)}`}
            </div>
          </div>
        </div>

        {/* 現在階級内のプログレスバー */}
        {!isTop && (
          <div>
            <div className="h-2.5 bg-border rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${posInTier * 100}%`, backgroundColor: current.color }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted mt-1">
              <span>{fmtAsset(current.min)}</span>
              <span>{fmtAsset(current.max)}</span>
            </div>
          </div>
        )}
      </div>

      {/* 次の階級へ */}
      {next && (
        <div className="bg-surface-2 border border-border rounded-2xl p-4 space-y-3">
          <div className="text-xs text-muted font-medium">次の階級：{next.label}</div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface-2/70 rounded-xl p-3">
              <div className="text-muted text-xs mb-1">あと必要な金額</div>
              <div className="text-text font-mono font-bold text-base">
                {fmtAsset(gapToNext)}
              </div>
            </div>
            <div className="bg-surface-2/70 rounded-xl p-3">
              <div className="text-muted text-xs mb-1">現在ペースでの到達</div>
              {yearsToNext !== null ? (
                <div className="font-mono font-bold text-base" style={{ color: next.color }}>
                  {yearsToNext === 0 ? '達成済み' : `約${yearsToNext}年後`}
                </div>
              ) : (
                <div className="text-loss text-sm font-semibold">60年以内に未達</div>
              )}
            </div>
          </div>

          <div className="text-xs text-muted">
            ※ 中立シナリオ（実質リターン{(neutralNetRate * 100).toFixed(2)}%）＋毎月¥{monthlyContrib.toLocaleString()}積立で試算
          </div>
        </div>
      )}

      {/* 全階級一覧 */}
      <div className="bg-surface-2 border border-border rounded-2xl p-4">
        <div className="text-xs text-muted font-medium mb-3">全階級マップ</div>
        <div className="space-y-2">
          {WEALTH_TIERS.map((tier) => {
            const isCurrent = tier.key === current.key;
            return (
              <div
                key={tier.key}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 transition-colors ${
                  isCurrent ? 'bg-border' : ''
                }`}
              >
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: tier.color }} />
                <div className="flex-1 text-sm" style={{ color: isCurrent ? '#fff' : '#94a3b8' }}>
                  {tier.label}
                  {isCurrent && <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full text-text" style={{ backgroundColor: tier.color }}>現在</span>}
                </div>
                <div className="text-xs text-muted font-mono">
                  {tier.max === Infinity
                    ? `${fmtAsset(tier.min)}以上`
                    : `${fmtAsset(tier.min)}〜`}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
