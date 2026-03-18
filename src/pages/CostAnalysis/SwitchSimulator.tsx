import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import type { Asset } from '../../types';
import type { CostRow } from './costUtils';
import { calcSwitch, ASSUMED_RETURN } from './costUtils';
import { ACCOUNT_TYPE_LABELS } from '../../constants/labels';

// 主要低コスト代替商品プリセット
const LOW_COST_ALTERNATIVES = [
  { name: 'eMAXIS Slim 全世界株式（オール・カントリー）', rate: 0.000578 },
  { name: 'eMAXIS Slim 米国株式（S&P500）',              rate: 0.000938 },
  { name: 'SBI・V・S&P500インデックス・ファンド',         rate: 0.000938 },
  { name: '楽天・全世界株式インデックス・ファンド',         rate: 0.00192  },
  { name: 'VOO（バンガード S&P500 ETF）',                 rate: 0.0003   },
  { name: 'VTI（バンガード 全米株式 ETF）',               rate: 0.0003   },
  { name: 'VT（バンガード 全世界株式 ETF）',              rate: 0.0007   },
  { name: '定期預金・現預金（コスト0）',                   rate: 0        },
];

interface Props {
  assets: Asset[];
  costRows: CostRow[];
  initialFromId?: string;
}

function fmt(n: number) { return n.toLocaleString('ja-JP', { maximumFractionDigits: 0 }); }
function fmtPct(n: number) { return `${(n * 100).toFixed(4)}%`; }

export function SwitchSimulator({ assets, costRows, initialFromId }: Props) {
  const switchableCosts = costRows.filter((r) => r.label !== 'low');

  const [fromId, setFromId]       = useState<string>(initialFromId ?? switchableCosts[0]?.asset.id ?? '');
  const [toPreset, setToPreset]   = useState(0);
  const [customToRate, setCustomToRate] = useState('');
  const [redemptionFee, setRedemptionFee] = useState('0');
  const [useCustom, setUseCustom] = useState(false);

  const fromAsset = assets.find((a) => a.id === fromId);
  const fromRow   = costRows.find((r) => r.asset.id === fromId);

  const toRate = useCustom
    ? (Number(customToRate) || 0) / 100
    : LOW_COST_ALTERNATIVES[toPreset]?.rate ?? 0;

  const toName = useCustom
    ? `カスタム (${customToRate}%)`
    : LOW_COST_ALTERNATIVES[toPreset]?.name ?? '';

  const result = useMemo(() => {
    if (!fromAsset || !fromRow) return null;
    if (toRate >= fromRow.costRate) return null;
    return calcSwitch(
      fromAsset,
      fromRow.costRate,
      toRate,
      Number(redemptionFee) / 100,
    );
  }, [fromAsset, fromRow, toRate, redemptionFee]);

  const canSimulate = fromAsset && fromRow && toRate < fromRow.costRate;

  const barData = result ? [
    { label: '現状維持（10年後）', value: result.keepValue10,   fill: '#64748b' },
    { label: '乗り換え後（10年後）', value: result.switchValue10, fill: '#6366f1' },
  ] : [];

  return (
    <div className="space-y-5">
      {/* ─── 乗り換え元選択 ─── */}
      <div className="bg-surface-2 border border-border rounded-2xl p-4 space-y-3">
        <h3 className="text-text text-sm font-semibold">📤 乗り換え元</h3>

        {switchableCosts.length === 0 ? (
          <div className="text-muted text-sm py-2">
            すべての銘柄のコストが低い水準です。乗り換えの必要はありません。
          </div>
        ) : (
          <select
            value={fromId}
            onChange={(e) => setFromId(e.target.value)}
            className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-text text-sm focus:outline-none focus:border-gold/50"
          >
            {switchableCosts.map((r) => (
              <option key={r.asset.id} value={r.asset.id}>
                {r.asset.name} ({fmtPct(r.costRate)})
              </option>
            ))}
          </select>
        )}

        {fromAsset && fromRow && (
          <div className="grid grid-cols-2 gap-3 text-xs">
            <InfoCell label="評価額" value={`¥${fmt(fromAsset.currentValue)}`} />
            <InfoCell label="信託報酬" value={fmtPct(fromRow.costRate)} highlight />
            <InfoCell label="口座区分" value={ACCOUNT_TYPE_LABELS[fromAsset.account]} />
            <InfoCell label="年間コスト" value={`¥${fmt(fromRow.annualCostYen)}`} highlight />
          </div>
        )}
      </div>

      {/* ─── 乗り換え先選択 ─── */}
      <div className="bg-surface-2 border border-border rounded-2xl p-4 space-y-3">
        <h3 className="text-text text-sm font-semibold">📥 乗り換え先</h3>

        {/* プリセット / カスタム切替 */}
        <div className="flex gap-2">
          <button
            onClick={() => setUseCustom(false)}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${!useCustom ? 'bg-gold text-text' : 'bg-border text-muted'}`}
          >
            プリセットから選択
          </button>
          <button
            onClick={() => setUseCustom(true)}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${useCustom ? 'bg-gold text-text' : 'bg-border text-muted'}`}
          >
            手動入力
          </button>
        </div>

        {!useCustom ? (
          <select
            value={toPreset}
            onChange={(e) => setToPreset(Number(e.target.value))}
            className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-text text-sm focus:outline-none focus:border-gold/50"
          >
            {LOW_COST_ALTERNATIVES.map((a, i) => (
              <option key={i} value={i}>
                {a.name} ({fmtPct(a.rate)})
              </option>
            ))}
          </select>
        ) : (
          <div>
            <label className="text-xs text-muted mb-1 block">信託報酬率（%）</label>
            <input
              type="number"
              step="0.0001"
              min="0"
              max="5"
              value={customToRate}
              onChange={(e) => setCustomToRate(e.target.value)}
              placeholder="0.0578"
              className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-text text-sm font-mono focus:outline-none focus:border-gold/50"
            />
          </div>
        )}

        {/* 信託財産留保額 */}
        <div>
          <label className="text-xs text-muted mb-1 block">
            信託財産留保額（%） ※ 大半の低コストファンドは0%
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="1"
            value={redemptionFee}
            onChange={(e) => setRedemptionFee(e.target.value)}
            placeholder="0"
            className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-text text-sm font-mono focus:outline-none focus:border-gold/50"
          />
        </div>

        {fromRow && toRate >= fromRow.costRate && (
          <div className="text-warn text-xs bg-warn/10 border border-amber-800 rounded-lg px-3 py-2">
            乗り換え先の信託報酬が現在と同等以上のため、シミュレーションできません。
          </div>
        )}
      </div>

      {/* ─── シミュレーション結果 ─── */}
      {canSimulate && result && (
        <div className="space-y-4">
          {/* 結果サマリー */}
          <div className="bg-gradient-to-br from-gold/10/40 to-surface border border-gold/30 rounded-2xl p-5 space-y-4">
            <div className="text-text font-semibold text-sm">
              📊 シミュレーション結果
            </div>
            <div className="text-xs text-muted truncate">
              {fromAsset?.name} → {toName}
            </div>

            {/* メイン数値 */}
            <div className="grid grid-cols-2 gap-3">
              <ResultCard
                label="年間コスト削減額"
                value={`¥${fmt(result.annualSaving)}`}
                color={result.annualSaving > 0 ? 'text-gain' : 'text-text'}
              />
              <ResultCard
                label="10年間の削減効果（複利）"
                value={result.tenYearSavingCompound >= 0
                  ? `+¥${fmt(result.tenYearSavingCompound)}`
                  : `-¥${fmt(Math.abs(result.tenYearSavingCompound))}`}
                color={result.tenYearSavingCompound >= 0 ? 'text-gain' : 'text-loss'}
              />
            </div>

            {/* 乗り換えコスト内訳 */}
            <div className="bg-surface-2/60 rounded-xl p-3 space-y-2 text-xs">
              <div className="text-muted font-medium mb-2">乗り換えコスト内訳</div>
              <CostLine
                label="売却益にかかる税金（20.315%）"
                value={result.taxCost}
                note={fromAsset?.account === 'nisa_growth' || fromAsset?.account === 'nisa_tsumitate'
                  ? '（NISA口座のため非課税）'
                  : fromAsset?.acquisitionPrice
                  ? undefined
                  : '（取得価格未入力のため0円と計算）'}
              />
              <CostLine label="信託財産留保額" value={result.redemptionFee} />
              <div className="border-t border-border pt-2 flex justify-between font-semibold">
                <span className="text-text">合計乗り換えコスト</span>
                <span className="text-text font-mono">¥{fmt(result.switchCost)}</span>
              </div>
            </div>

            {/* 損益分岐点 */}
            <div className="bg-surface-2/60 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <span className="text-text text-xs">損益分岐点</span>
                <span className={`font-mono text-sm font-semibold ${
                  result.breakevenYears === null ? 'text-muted'
                  : result.breakevenYears <= 3 ? 'text-gain'
                  : result.breakevenYears <= 7 ? 'text-warn'
                  : 'text-loss'
                }`}>
                  {result.breakevenYears === null
                    ? '計算不可'
                    : result.breakevenYears < 0.1
                    ? '即時回収'
                    : `${result.breakevenYears.toFixed(1)} 年後`}
                </span>
              </div>
              {result.breakevenYears !== null && result.breakevenYears <= 10 && (
                <div className="mt-2 h-2 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gain"
                    style={{ width: `${Math.min((result.breakevenYears / 10) * 100, 100)}%` }}
                  />
                </div>
              )}
              <div className="text-muted/60 text-xs mt-1">
                ※ 損益分岐点 = 乗り換えコスト ÷ 年間削減額
              </div>
            </div>
          </div>

          {/* 10年後資産比較グラフ */}
          <div className="bg-surface-2 border border-border rounded-2xl p-4">
            <h3 className="text-text text-sm font-semibold mb-3">
              10年後の資産比較
              <span className="text-muted text-xs font-normal ml-2">想定リターン {(ASSUMED_RETURN * 100).toFixed(0)}%/年</span>
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={(v) => `¥${(v / 10000).toFixed(0)}万`}
                  tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false}
                  width={70}
                />
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <Tooltip content={(p: any) => {
                  if (!p.active || !p.payload?.[0]) return null;
                  const d = p.payload[0];
                  return (
                    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#f1f5f9' }}>
                      <div style={{ fontWeight: 600, marginBottom: 2 }}>{d.payload?.label}</div>
                      <div>¥{Number(d.value).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    </div>
                  );
                }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={60}>
                  {barData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className={`mt-2 text-center text-sm font-semibold ${result.netGain10 >= 0 ? 'text-gain' : 'text-loss'}`}>
              乗り換えにより10年後に
              {result.netGain10 >= 0 ? ` +¥${fmt(result.netGain10)}` : ` -¥${fmt(Math.abs(result.netGain10))}`}
            </div>
            <div className="text-muted/60 text-xs text-center mt-1">
              ※ 税引き後・乗り換えコスト差し引き済みの試算値
            </div>
          </div>
        </div>
      )}

      {switchableCosts.length === 0 && (
        <div className="bg-gain/10 border border-emerald-800 rounded-xl p-4 text-center">
          <div className="text-gain font-semibold text-sm">✅ 優秀なポートフォリオです</div>
          <div className="text-gain text-xs mt-1">全銘柄のコストが低水準（0.1%以下）です。乗り換えの必要はありません。</div>
        </div>
      )}
    </div>
  );
}

function InfoCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-surface-2/70 rounded-lg px-3 py-2">
      <div className="text-muted text-xs mb-0.5">{label}</div>
      <div className={`font-mono font-semibold text-sm ${highlight ? 'text-warn' : 'text-text'}`}>{value}</div>
    </div>
  );
}

function ResultCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-surface-2/80 rounded-xl p-3">
      <div className="text-muted text-xs mb-1">{label}</div>
      <div className={`font-mono font-bold text-base ${color}`}>{value}</div>
    </div>
  );
}

function CostLine({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div className="flex justify-between items-start gap-2">
      <div>
        <span className="text-muted">{label}</span>
        {note && <span className="text-muted/60 text-xs ml-1">{note}</span>}
      </div>
      <span className={`font-mono flex-shrink-0 ${value > 0 ? 'text-loss' : 'text-muted'}`}>
        {value > 0 ? `¥${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '¥0'}
      </span>
    </div>
  );
}
