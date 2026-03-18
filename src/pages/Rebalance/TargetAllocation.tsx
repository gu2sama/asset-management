import { useState, useMemo } from 'react';
import type { AssetClass, RebalanceTarget } from '../../types';
import { ASSET_CLASS_LABELS, ASSET_CLASS_COLORS } from '../../constants/labels';
import { ALLOCATION_PRESETS, presetToTargets, fmtPct } from './rebalanceUtils';

interface Props {
  targets: RebalanceTarget[];
  onSave: (targets: RebalanceTarget[]) => void;
}

const ALL_CLASSES: AssetClass[] = [
  'investment_trust', 'foreign_etf', 'domestic_etf',
  'domestic_stock', 'foreign_stock',
  'real_estate', 'commodity', 'social_lending', 'crypto', 'cash',
];

export function TargetAllocation({ targets, onSave }: Props) {
  const [draft, setDraft]               = useState<RebalanceTarget[]>(targets);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [saved, setSaved]               = useState(false);

  const totalRatio = useMemo(
    () => draft.reduce((s, t) => s + t.targetRatio, 0),
    [draft]
  );
  const isValid = Math.abs(totalRatio - 1.0) < 0.005;

  const updateTarget = (assetClass: AssetClass, partial: Partial<RebalanceTarget>) => {
    setDraft((prev) => {
      const exists = prev.find((t) => t.assetClass === assetClass);
      if (exists) {
        return prev.map((t) => t.assetClass === assetClass ? { ...t, ...partial } : t);
      }
      return [...prev, {
        assetClass,
        targetRatio: 0,
        minRatio: 0,
        maxRatio: 0.05,
        ...partial,
      }];
    });
  };

  const removeTarget = (assetClass: AssetClass) => {
    setDraft((prev) => prev.filter((t) => t.assetClass !== assetClass));
  };

  const addTarget = (assetClass: AssetClass) => {
    if (draft.find((t) => t.assetClass === assetClass)) return;
    setDraft((prev) => [...prev, { assetClass, targetRatio: 0.05, minRatio: 0, maxRatio: 0.10 }]);
  };

  const applyPreset = (presetId: string) => {
    const preset = ALLOCATION_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setDraft(presetToTargets(preset));
    setActivePreset(presetId);
  };

  const handleSave = () => {
    onSave(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const unusedClasses = ALL_CLASSES.filter(
    (c) => !draft.find((t) => t.assetClass === c)
  );

  return (
    <div className="space-y-4">
      {/* プリセット */}
      <div className="bg-surface-2 border border-border rounded-2xl p-4 space-y-3">
        <h3 className="text-text text-sm font-semibold">プリセット配分</h3>
        <div className="grid grid-cols-3 gap-2">
          {ALLOCATION_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => applyPreset(p.id)}
              className={`rounded-xl p-3 text-left transition-colors border ${
                activePreset === p.id
                  ? 'border-gold/50 bg-indigo-900/30'
                  : 'border-border bg-surface-2/70 hover:border-border/80'
              }`}
            >
              <div className="text-text text-xs font-semibold">{p.label}</div>
              <div className="text-muted text-xs mt-0.5 leading-relaxed">{p.description}</div>
            </button>
          ))}
        </div>
        <button
          onClick={() => { setDraft([]); setActivePreset('custom'); }}
          className={`w-full rounded-xl py-2 text-sm border transition-colors ${
            activePreset === 'custom'
              ? 'border-gold/50 bg-gold/10 text-gold'
              : 'border-border text-muted hover:border-border/80 hover:text-text'
          }`}
        >
          カスタム（自由入力）
        </button>
      </div>

      {/* 配分スライダー */}
      <div className="bg-surface-2 border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-text text-sm font-semibold">目標配分の設定</h3>
          <div className={`text-xs font-mono px-2.5 py-1 rounded-full font-semibold ${
            isValid
              ? 'bg-emerald-900/40 text-gain border border-gain/30'
              : 'bg-amber-900/40 text-warn border border-warn/30'
          }`}>
            合計 {fmtPct(totalRatio)}
          </div>
        </div>

        {draft.length === 0 ? (
          <div className="text-center py-4 text-muted text-sm">
            アセットクラスを追加してください
          </div>
        ) : (
          <div className="space-y-4">
            {draft.map((t) => {
              const color = ASSET_CLASS_COLORS[t.assetClass];
              const tolerance = t.maxRatio - t.targetRatio;
              return (
                <div key={t.assetClass} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-text text-sm">{ASSET_CLASS_LABELS[t.assetClass]}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-text font-mono font-semibold text-sm w-12 text-right">
                        {(t.targetRatio * 100).toFixed(0)}%
                      </span>
                      <button
                        onClick={() => removeTarget(t.assetClass)}
                        className="text-muted/60 hover:text-loss text-xs w-4"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={Math.round(t.targetRatio * 100)}
                    onChange={(e) => {
                      const v = Number(e.target.value) / 100;
                      updateTarget(t.assetClass, {
                        targetRatio: v,
                        minRatio: Math.max(0, v - tolerance),
                        maxRatio: v + tolerance,
                      });
                    }}
                    className="w-full"
                    style={{ accentColor: color }}
                  />
                  {/* 許容範囲 */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted">許容範囲：</span>
                    <span className="text-muted">±</span>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      step={1}
                      value={Math.round(tolerance * 100)}
                      onChange={(e) => {
                        const tol = Number(e.target.value) / 100;
                        updateTarget(t.assetClass, {
                          minRatio: Math.max(0, t.targetRatio - tol),
                          maxRatio: t.targetRatio + tol,
                        });
                      }}
                      className="w-12 bg-surface border border-border rounded px-1.5 py-0.5 text-text text-xs font-mono focus:outline-none focus:border-gold/50"
                    />
                    <span className="text-muted">%以内</span>
                    <span className="text-muted/60 ml-auto">
                      {fmtPct(t.minRatio)} 〜 {fmtPct(t.maxRatio)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 追加ボタン */}
        {unusedClasses.length > 0 && (
          <div className="pt-2 border-t border-border">
            <div className="text-xs text-muted mb-2">クラスを追加</div>
            <div className="flex flex-wrap gap-1.5">
              {unusedClasses.map((c) => (
                <button
                  key={c}
                  onClick={() => addTarget(c)}
                  className="text-xs px-2 py-1 bg-border hover:bg-border text-text rounded-lg transition-colors"
                >
                  + {ASSET_CLASS_LABELS[c]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* バリデーション警告 */}
      {!isValid && draft.length > 0 && (
        <div className="bg-warn/10 border border-warn/30 rounded-xl px-4 py-3 text-xs text-warn">
          ⚠ 合計が{fmtPct(totalRatio)}になっています。合計を100%に調整してください。
          （差分: {totalRatio > 1 ? '+' : ''}{fmtPct(totalRatio - 1)}）
        </div>
      )}

      {/* 保存ボタン */}
      <button
        onClick={handleSave}
        disabled={!isValid || draft.length === 0}
        className="w-full bg-gold hover:bg-gold disabled:bg-border disabled:text-muted text-text rounded-2xl py-3 text-sm font-semibold transition-colors"
      >
        {saved ? '✓ 保存しました' : '目標配分を保存'}
      </button>
    </div>
  );
}
