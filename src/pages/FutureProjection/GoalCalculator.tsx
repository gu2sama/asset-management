import { useState, useMemo } from 'react';
import {
  calcRequiredReturn, calcRequiredMonthly,
  calcArrivalAge, judgeFeability,
  SCENARIOS,
} from './projectionUtils';

interface Props {
  currentAsset: number;
  currentAge: number;
  effectiveCostRate: number;
  monthlyContrib: number;
  initialTargetAmount: number;
  initialTargetAge: number;
  rates: Record<string, number>;
}

function fmt(n: number): string {
  if (!isFinite(n) || n > 1e12) return '達成不可';
  if (n >= 1e8) return `${(n / 1e8).toFixed(2)}億円`;
  return `¥${Math.round(n / 10000)}万円`;
}
function fmtPct(r: number): string {
  if (!isFinite(r) || r > 1) return '100%超';
  return `${(r * 100).toFixed(2)}%`;
}
function fmtMan(n: number): string {
  return `¥${Math.round(n / 10000).toLocaleString()}万`;
}

const STATUS_STYLE = {
  neutral_ok:       { bg: 'bg-gain/10', border: 'border-gain/30', icon: '✅', text: 'text-gain' },
  optimistic_only:  { bg: 'bg-warn/10',   border: 'border-warn/30',   icon: '⚠️', text: 'text-warn' },
  impossible:       { bg: 'bg-loss/10',      border: 'border-loss/30',     icon: '🔴', text: 'text-loss' },
} as const;

export function GoalCalculator({
  currentAsset, currentAge, effectiveCostRate,
  monthlyContrib, initialTargetAmount, initialTargetAge, rates,
}: Props) {
  const [targetAmount, setTargetAmount] = useState(initialTargetAmount);
  const [targetAge, setTargetAge]       = useState(initialTargetAge);
  const [monthly, setMonthly]           = useState(monthlyContrib);

  const years = Math.max(targetAge - currentAge, 0);

  const result = useMemo(() => {
    if (years <= 0) return null;

    const feasibility = judgeFeability(
      currentAsset, monthly, effectiveCostRate, rates, years, targetAmount
    );

    const requiredReturn = calcRequiredReturn(currentAsset, monthly, years, targetAmount);
    const netRequiredReturn = requiredReturn !== null ? requiredReturn : null;
    const grossRequiredReturn = netRequiredReturn !== null
      ? netRequiredReturn + effectiveCostRate
      : null;

    const requiredMonthlyNeutral = calcRequiredMonthly(
      currentAsset,
      (rates['neutral'] ?? 0.05) - effectiveCostRate,
      years,
      targetAmount,
    );
    const requiredMonthlyOptimistic = calcRequiredMonthly(
      currentAsset,
      (rates['optimistic'] ?? 0.08) - effectiveCostRate,
      years,
      targetAmount,
    );

    const arrivalAges = calcArrivalAge(
      currentAsset, currentAge, monthly, rates, effectiveCostRate, targetAmount
    );

    return { feasibility, grossRequiredReturn, requiredMonthlyNeutral, requiredMonthlyOptimistic, arrivalAges };
  }, [currentAsset, monthly, effectiveCostRate, rates, years, targetAmount, currentAge]);

  const style = result ? STATUS_STYLE[result.feasibility.status] : null;

  return (
    <div className="space-y-5">
      {/* ─── 入力 ─── */}
      <div className="bg-surface-2 border border-border rounded-2xl p-4 space-y-4">
        <h3 className="text-text text-sm font-semibold">目標設定</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted mb-1 block">目標金額</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">¥</span>
              <input
                type="number"
                step="1000000"
                min="0"
                value={targetAmount}
                onChange={(e) => setTargetAmount(Number(e.target.value))}
                className="w-full bg-bg border border-border rounded-xl pl-7 pr-3 py-2.5 text-text text-sm font-mono focus:outline-none focus:border-gold/50"
              />
            </div>
            <div className="text-xs text-muted/60 mt-1">{fmt(targetAmount)}</div>
          </div>

          <div>
            <label className="text-xs text-muted mb-1 block">目標年齢</label>
            <div className="relative">
              <input
                type="number"
                step="1"
                min={currentAge + 1}
                max={100}
                value={targetAge}
                onChange={(e) => setTargetAge(Number(e.target.value))}
                className="w-full bg-surface border border-border rounded-xl px-3 pr-10 py-2.5 text-text text-sm font-mono focus:outline-none focus:border-gold/50"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-xs">歳</span>
            </div>
            <div className="text-xs text-muted/60 mt-1">あと {years} 年</div>
          </div>

          <div className="col-span-2">
            <label className="text-xs text-muted mb-1 block">毎月の積立額</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">¥</span>
              <input
                type="number"
                step="5000"
                min="0"
                value={monthly}
                onChange={(e) => setMonthly(Number(e.target.value))}
                className="w-full bg-bg border border-border rounded-xl pl-7 pr-3 py-2.5 text-text text-sm font-mono focus:outline-none focus:border-gold/50"
              />
            </div>
            <div className="text-xs text-muted/60 mt-1">¥{monthly.toLocaleString()}/月</div>
          </div>
        </div>
      </div>

      {/* ─── 達成判定 ─── */}
      {result && style && years > 0 && (
        <div className={`border rounded-2xl p-4 ${style.bg} ${style.border}`}>
          <div className={`flex items-center gap-2 font-semibold text-base ${style.text}`}>
            <span className="text-xl">{style.icon}</span>
            {result.feasibility.label}
          </div>
          <div className="text-muted text-xs mt-2">
            現在資産 {fmt(currentAsset)} ＋ 毎月 ¥{monthly.toLocaleString()} × {years}年
            で {fmt(targetAmount)} を目指すシミュレーション
          </div>
        </div>
      )}

      {years <= 0 && (
        <div className="bg-warn/10 border border-warn/30 rounded-xl px-4 py-3 text-warn text-sm">
          目標年齢は現在の年齢より後に設定してください。
        </div>
      )}

      {/* ─── 必要リターン率 ─── */}
      {result && (
        <div className="bg-surface-2 border border-border rounded-2xl p-4 space-y-3">
          <h3 className="text-text text-sm font-semibold">達成に必要な条件</h3>

          <div className="grid grid-cols-1 gap-3">
            {/* 必要リターン */}
            <div className="bg-surface-2/70 rounded-xl p-3">
              <div className="text-muted text-xs mb-1">必要な年間リターン率</div>
              {result.grossRequiredReturn !== null ? (
                <>
                  <div className={`font-mono font-bold text-xl ${
                    result.grossRequiredReturn > 0.12 ? 'text-loss'
                    : result.grossRequiredReturn > 0.08 ? 'text-warn'
                    : 'text-gain'
                  }`}>
                    {fmtPct(result.grossRequiredReturn)}
                    <span className="text-sm font-normal text-muted ml-1">/年</span>
                  </div>
                  <div className="text-muted/60 text-xs mt-1">
                    実質（コスト控除後）: {fmtPct(result.grossRequiredReturn - effectiveCostRate)}
                  </div>
                  {result.grossRequiredReturn > 0.10 && (
                    <div className="text-warn text-xs mt-1">
                      ⚠ 高リターンが必要です。目標の見直しを検討してください。
                    </div>
                  )}
                </>
              ) : (
                <div className="text-gain font-semibold">運用不要で達成可能</div>
              )}
            </div>

            {/* 必要積立額 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-2/70 rounded-xl p-3">
                <div className="text-muted text-xs mb-1">必要な積立額（中立シナリオ）</div>
                <div className={`font-mono font-bold text-base ${
                  result.requiredMonthlyNeutral > 300000 ? 'text-loss' : 'text-gold'
                }`}>
                  {result.requiredMonthlyNeutral <= 0
                    ? '積立不要'
                    : !isFinite(result.requiredMonthlyNeutral) || result.requiredMonthlyNeutral > 1e7
                    ? '達成困難'
                    : `¥${Math.ceil(result.requiredMonthlyNeutral / 1000) * 1000}`.replace(/(\d)(?=(\d{3})+$)/g, '$1,')}
                </div>
                <div className="text-muted/60 text-xs">/月</div>
              </div>
              <div className="bg-surface-2/70 rounded-xl p-3">
                <div className="text-muted text-xs mb-1">必要な積立額（楽観シナリオ）</div>
                <div className={`font-mono font-bold text-base ${
                  result.requiredMonthlyOptimistic > 300000 ? 'text-loss' : 'text-gain'
                }`}>
                  {result.requiredMonthlyOptimistic <= 0
                    ? '積立不要'
                    : !isFinite(result.requiredMonthlyOptimistic) || result.requiredMonthlyOptimistic > 1e7
                    ? '達成困難'
                    : `¥${Math.ceil(result.requiredMonthlyOptimistic / 1000) * 1000}`.replace(/(\d)(?=(\d{3})+$)/g, '$1,')}
                </div>
                <div className="text-muted/60 text-xs">/月</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── シナリオ別到達年齢 ─── */}
      {result && (
        <div className="bg-surface-2 border border-border rounded-2xl p-4 space-y-3">
          <h3 className="text-text text-sm font-semibold">各シナリオでの目標到達年齢</h3>

          <div className="space-y-3">
            {SCENARIOS.map((s) => {
              const arrivalAge = result.arrivalAges[s.key];
              const yearsNeeded = arrivalAge !== null ? arrivalAge - currentAge : null;
              const reachesBeforeTarget = arrivalAge !== null && arrivalAge <= targetAge;

              return (
                <div key={s.key} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-text text-sm">{s.label}シナリオ</span>
                      <div className="text-right">
                        {arrivalAge !== null ? (
                          <span className={`font-mono font-semibold ${reachesBeforeTarget ? 'text-gain' : 'text-warn'}`}>
                            {arrivalAge}歳
                            <span className="text-muted text-xs font-normal ml-1">（{yearsNeeded}年後）</span>
                          </span>
                        ) : (
                          <span className="text-loss text-sm">50年以内に達成不可</span>
                        )}
                      </div>
                    </div>
                    {/* プログレスバー */}
                    <div className="mt-1.5 h-1.5 bg-border rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          backgroundColor: s.color,
                          width: arrivalAge !== null
                            ? `${Math.min((years / Math.max(yearsNeeded!, 1)) * 100, 100)}%`
                            : '0%',
                          opacity: 0.8,
                        }}
                      />
                    </div>
                  </div>
                  {reachesBeforeTarget && (
                    <span className="text-gain text-lg flex-shrink-0">✅</span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="text-muted/60 text-xs border-t border-border pt-3">
            ※ 現在資産 {fmtMan(currentAsset)} ＋ 毎月 ¥{monthly.toLocaleString()} の積立を仮定
          </div>
        </div>
      )}

      {/* ─── アドバイス ─── */}
      {result && (
        <div className="space-y-2">
          {result.feasibility.status === 'neutral_ok' && (
            <div className="bg-gain/10 border border-gain/30 rounded-xl px-4 py-3 text-xs text-gain leading-relaxed">
              ✅ 現在の積立額・想定リターンで目標達成が見込めます。引き続き規律ある投資を継続しましょう。
              コストの低い商品を選ぶことで、さらに達成確率が高まります。
            </div>
          )}
          {result.feasibility.status === 'optimistic_only' && (
            <div className="bg-warn/10 border border-warn/30 rounded-xl px-4 py-3 text-xs text-warn leading-relaxed">
              ⚠️ 楽観シナリオ（高リターン）のみで達成可能な状況です。
              毎月の積立額を増やすか、目標金額・目標年齢を見直すことを検討してください。
            </div>
          )}
          {result.feasibility.status === 'impossible' && (
            <div className="bg-loss/10 border border-loss/30 rounded-xl px-4 py-3 text-xs text-loss leading-relaxed">
              🔴 現在のペースでは目標達成が困難です。① 積立額を増やす ② 目標年齢を延ばす
              ③ 目標金額を下げる のいずれかを検討してください。
              {result.grossRequiredReturn && result.grossRequiredReturn > 0.15 && (
                <span> 必要リターン {fmtPct(result.grossRequiredReturn)} は現実的ではない水準です。</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
