import { useState, useMemo } from 'react';
import type { TaxableGain } from '../../types';
import { calcTaxOffset, fmtYen } from './taxUtils';

interface Props {
  taxableGains: TaxableGain[];
}

export function TaxOffsetSimulator({
  taxableGains,
}: Props) {
  const [confirmedGain, setConfirmedGain]   = useState(0);
  const [confirmedLoss, setConfirmedLoss]   = useState(0);
  const [selectedLossIds, setSelectedLossIds] = useState<Set<string>>(new Set());

  const lossAssets = taxableGains.filter((g) => g.gainLoss < 0);

  const additionalLoss = useMemo(() =>
    lossAssets
      .filter((g) => selectedLossIds.has(g.assetId))
      .reduce((s, g) => s + Math.abs(g.gainLoss), 0),
    [lossAssets, selectedLossIds]
  );

  const result = useMemo(() =>
    calcTaxOffset(confirmedGain, confirmedLoss, additionalLoss),
    [confirmedGain, confirmedLoss, additionalLoss]
  );

  const toggleAsset = (id: string) => {
    setSelectedLossIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* 説明 */}
      <div className="bg-surface-2 border border-border rounded-2xl p-4 text-xs text-muted leading-relaxed">
        今年の<strong className="text-text">確定した</strong>売却損益を入力し、現在の含み損銘柄を選択すると
        損益通算後の課税額と節税効果をシミュレーションできます。
      </div>

      {/* 確定損益入力 */}
      <div className="bg-surface-2 border border-border rounded-2xl p-4 space-y-4">
        <h3 className="text-text text-sm font-semibold">今年の確定損益（手動入力）</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted mb-1 block">確定利益（課税口座）</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gain text-sm">¥</span>
              <input
                type="number" min="0" step="10000"
                value={confirmedGain || ''}
                onChange={(e) => setConfirmedGain(Math.max(0, Number(e.target.value)))}
                placeholder="0"
                className="w-full bg-bg border border-border rounded-xl pl-7 pr-3 py-2.5 text-text text-sm font-mono focus:outline-none focus:border-gold/50"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted mb-1 block">確定損失（課税口座）</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-loss text-sm">¥</span>
              <input
                type="number" min="0" step="10000"
                value={confirmedLoss || ''}
                onChange={(e) => setConfirmedLoss(Math.max(0, Number(e.target.value)))}
                placeholder="0"
                className="w-full bg-bg border border-border rounded-xl pl-7 pr-3 py-2.5 text-text text-sm font-mono focus:outline-none focus:border-gold/50"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 計算結果 */}
      <div className="bg-surface border border-border rounded-2xl p-5 space-y-2 font-mono text-sm">
        <div className="flex justify-between">
          <span className="text-muted">今年の確定利益</span>
          <span className="text-gain">+{fmtYen(result.confirmedGain)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">今年の確定損失</span>
          <span className="text-loss">−{fmtYen(result.confirmedLoss)}</span>
        </div>
        {additionalLoss > 0 && (
          <div className="flex justify-between">
            <span className="text-muted">追加損出し（選択中）</span>
            <span className="text-warn">−{fmtYen(additionalLoss)}</span>
          </div>
        )}
        <div className="border-t border-border pt-2 mt-2 flex justify-between">
          <span className="text-text font-semibold">損益通算後の課税対象額</span>
          <span className={`font-bold ${result.finalTaxable > 0 ? 'text-warn' : 'text-gain'}`}>
            {result.finalTaxable > 0 ? '+' : ''}{fmtYen(result.finalTaxable)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-text font-semibold">概算税額</span>
          <span className={`font-bold text-xl ${result.finalTax > 0 ? 'text-warn' : 'text-gain'}`}>
            {result.finalTax > 0 ? fmtYen(result.finalTax) : '¥0（課税なし）'}
          </span>
        </div>
        {result.taxSaving > 0 && (
          <div className="flex justify-between text-gain bg-gain/10 rounded-lg px-3 py-2 mt-1">
            <span>損出しによる節税額</span>
            <span className="font-bold">−{fmtYen(result.taxSaving)}</span>
          </div>
        )}
        {result.carryoverLoss > 0 && (
          <div className="flex justify-between text-info bg-info/10 rounded-lg px-3 py-2">
            <span>翌年繰越損失</span>
            <span className="font-bold">{fmtYen(result.carryoverLoss)}</span>
          </div>
        )}
      </div>

      {/* 含み損銘柄の選択 */}
      {lossAssets.length > 0 && (
        <div className="bg-surface-2 border border-border rounded-2xl p-4 space-y-3">
          <h3 className="text-text text-sm font-semibold">
            追加損出しのシミュレーション
            <span className="text-muted text-xs font-normal ml-2">（含み損銘柄を売却した場合）</span>
          </h3>
          <div className="space-y-2">
            {lossAssets.map((g) => {
              const isSelected = selectedLossIds.has(g.assetId);
              const saving = Math.min(Math.abs(g.gainLoss), result.confirmedGain + result.confirmedLoss) > 0
                ? Math.min(Math.abs(g.gainLoss), result.confirmedGain) * 0.20315
                : 0;

              return (
                <label
                  key={g.assetId}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 cursor-pointer transition-colors border ${
                    isSelected
                      ? 'border-warn/30 bg-warn/10'
                      : 'border-border bg-surface-2/70 hover:border-border'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleAsset(g.assetId)}
                    className="accent-gold w-4 h-4 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-text text-sm truncate">{g.assetName}</div>
                    <div className="text-loss text-xs font-mono">
                      含み損 {fmtYen(g.gainLoss)}
                    </div>
                  </div>
                  {saving > 0 && (
                    <div className="text-right flex-shrink-0">
                      <div className="text-gain text-xs font-semibold">節税</div>
                      <div className="text-gain font-mono text-sm">{fmtYen(saving)}</div>
                    </div>
                  )}
                </label>
              );
            })}
          </div>
        </div>
      )}

      {lossAssets.length === 0 && (
        <div className="bg-surface-2 border border-border rounded-xl px-4 py-3 text-xs text-muted">
          課税口座に含み損の銘柄がないため、追加損出しの選択はありません。
        </div>
      )}
    </div>
  );
}
