import type { TaxHarvestingSuggestion } from '../../types';
import { TAX_RATE, fmtYen } from './taxUtils';

interface Props {
  harvesting: TaxHarvestingSuggestion;
}

export function HarvestingProposal({ harvesting }: Props) {
  const { lossAssets, gainAssets, netGainLoss, estimatedTaxSaving } = harvesting;

  if (lossAssets.length === 0 && gainAssets.length === 0) {
    return (
      <div className="bg-surface-2 border border-border rounded-2xl p-6 text-center">
        <div className="text-4xl mb-3">✅</div>
        <div className="text-muted text-sm">損益通算の対象となる銘柄がありません。</div>
        <div className="text-muted text-xs mt-1">取得価格が設定された特定口座の銘柄が対象です。</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 損出しサマリー */}
      {estimatedTaxSaving > 0 ? (
        <div className="bg-gain/10 border border-gain/30 rounded-2xl p-5 space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <div className="text-gain font-semibold">損出しで節税できます</div>
              <div className="text-muted text-xs mt-0.5">
                含み損銘柄を売却して損失を確定させることで今年の税負担を減らせます
              </div>
            </div>
          </div>
          <div className="bg-surface-2/70 rounded-xl p-4 grid grid-cols-2 gap-3">
            <div>
              <div className="text-muted text-xs mb-0.5">課税対象の含み益合計</div>
              <div className="text-warn font-mono font-bold">{fmtYen(Math.max(netGainLoss, 0))}</div>
            </div>
            <div>
              <div className="text-muted text-xs mb-0.5">損出しで節税できる概算額</div>
              <div className="text-gain font-mono font-bold text-lg">−{fmtYen(estimatedTaxSaving)}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-surface-2 border border-border rounded-2xl px-4 py-3 text-xs text-muted">
          現在の含み益・含み損の状況では、損出しによる節税効果がほとんどありません。
        </div>
      )}

      {/* 損出し推奨銘柄 */}
      {lossAssets.length > 0 && (
        <div className="bg-surface-2 border border-border rounded-2xl p-4 space-y-3">
          <h3 className="text-text text-sm font-semibold flex items-center gap-2">
            <span className="text-loss">↓</span>
            損出し推奨銘柄（含み損が大きい順）
          </h3>

          <div className="space-y-3">
            {lossAssets.map((g) => {
              const lossAbs = Math.abs(g.gainLoss);
              const saving  = Math.min(lossAbs, Math.max(netGainLoss, 0)) * TAX_RATE;
              const gainRate = g.acquisitionPrice > 0
                ? ((g.currentValue - g.acquisitionPrice) / g.acquisitionPrice * 100).toFixed(1)
                : '0';

              return (
                <div
                  key={g.assetId}
                  className="bg-red-900/10 border border-red-900/30 rounded-2xl p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-text font-medium">{g.assetName}</div>
                      <div className="text-muted text-xs mt-0.5">{g.account}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-loss font-mono font-semibold">含み損 {fmtYen(g.gainLoss)}</div>
                      <div className="text-muted text-xs">{gainRate}%</div>
                    </div>
                  </div>

                  {saving > 0 ? (
                    <div className="bg-surface/60 rounded-xl p-3 text-sm">
                      <span className="text-text">この銘柄を売却すると今年の税金が </span>
                      <span className="text-gain font-mono font-bold">{fmtYen(saving)}</span>
                      <span className="text-text"> 安くなります</span>
                    </div>
                  ) : (
                    <div className="text-xs text-muted bg-surface/40 rounded-xl px-3 py-2">
                      現時点では相殺できる確定利益がないため節税効果は限定的です（翌年への繰越損失に利用可能）
                    </div>
                  )}

                  <div className="bg-warn/10 border border-amber-800/40 rounded-xl px-3 py-2 text-xs text-warn space-y-0.5">
                    <div>⚠ 同一銘柄の買い戻しは翌年1月以降を推奨します</div>
                    <div className="text-warn/70">30日以内の買い戻しは「損出し」効果が認められない場合があります</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 利益確定銘柄（参考） */}
      {gainAssets.length > 0 && (
        <div className="bg-surface-2 border border-border rounded-2xl p-4 space-y-3">
          <h3 className="text-text text-sm font-semibold flex items-center gap-2">
            <span className="text-gain">↑</span>
            課税対象の含み益銘柄（参考）
          </h3>
          <div className="space-y-2">
            {gainAssets.slice(0, 5).map((g) => (
              <div key={g.assetId} className="flex items-center justify-between py-2 border-b border-border last:border-0 text-sm">
                <div>
                  <div className="text-text">{g.assetName}</div>
                  <div className="text-muted text-xs">{g.account}</div>
                </div>
                <div className="text-right">
                  <div className="text-gain font-mono">{fmtYen(g.gainLoss)}</div>
                  <div className="text-warn text-xs">税 {fmtYen(g.estimatedTax)}</div>
                </div>
              </div>
            ))}
            {gainAssets.length > 5 && (
              <div className="text-muted text-xs text-center">他 {gainAssets.length - 5}銘柄…</div>
            )}
          </div>
        </div>
      )}

      {/* 注意事項 */}
      <div className="bg-surface-2 border border-border rounded-xl p-4 text-xs text-muted space-y-1.5 leading-relaxed">
        <div className="text-muted font-medium">注意事項</div>
        <div>・損出しは翌年1月以降に買い戻すことを推奨します</div>
        <div>・損益通算・繰越控除の利用には確定申告が必要です（特定口座源泉徴収ありの場合も申告で還付を受けられる場合があります）</div>
        <div>・損失の繰越控除は翌年以降3年間有効です</div>
        <div className="text-muted/60">詳細な税務判断は税理士にご相談ください</div>
      </div>
    </div>
  );
}
