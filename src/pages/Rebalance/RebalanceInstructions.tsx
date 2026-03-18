import { useState, useMemo } from 'react';
import type { Asset } from '../../types';
import type { RebalanceSummary } from '../../hooks/useRebalance';
import { ASSET_CLASS_LABELS } from '../../constants/labels';
import {
  buildSellActions, buildBuyActions, getAssetsInClass,
  TAX_RATE, fmtYen, fmtPct,
} from './rebalanceUtils';

interface Props {
  summary: RebalanceSummary;
  assets: Asset[];
}

export function RebalanceInstructions({ summary, assets }: Props) {
  const [afterTaxMode, setAfterTaxMode] = useState(false);

  const sellItems = summary.items.filter((i) => i.requiredAmount < 0 && i.isOutOfRange);
  const buyItems  = summary.items.filter((i) => i.requiredAmount > 0 && i.isOutOfRange);

  const sellActions = useMemo(() => sellItems.flatMap((i) =>
    buildSellActions(assets, i.assetClass, Math.abs(i.requiredAmount), afterTaxMode)
  ), [sellItems, assets, afterTaxMode]);

  const buyActions = useMemo(() => buyItems.flatMap((i) =>
    buildBuyActions(assets, i.assetClass, i.requiredAmount)
  ), [buyItems, assets]);

  const totalTax   = sellActions.reduce((s, a) => s + a.taxAmount, 0);
  const totalSell  = sellActions.reduce((s, a) => s + Math.abs(a.amount), 0);
  const totalBuy   = buyActions.reduce((s, a) => s + a.amount, 0);

  if (summary.items.length === 0) {
    return (
      <div className="bg-surface-2 border border-border rounded-2xl p-6 text-center">
        <div className="text-4xl mb-3">📋</div>
        <div className="text-muted text-sm">目標配分が設定されていません。</div>
      </div>
    );
  }

  if (!summary.needsRebalance) {
    return (
      <div className="bg-gain/10 border border-gain/30 rounded-2xl p-6 text-center space-y-2">
        <div className="text-4xl">✅</div>
        <div className="text-gain font-semibold">リバランス不要です</div>
        <div className="text-muted text-sm">全クラスが許容範囲内にあります。</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* オプション */}
      <div className="bg-surface-2 border border-border rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-text text-sm font-semibold">実質手取り後でリバランス</div>
            <div className="text-muted text-xs mt-0.5">
              課税口座の売却時、税金を考慮した売却額で計算します
            </div>
          </div>
          <button
            onClick={() => setAfterTaxMode((v) => !v)}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              afterTaxMode ? 'bg-gold' : 'bg-border'
            }`}
          >
            <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
              afterTaxMode ? 'translate-x-5' : ''
            }`} />
          </button>
        </div>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-warn/10 border border-warn/30/50 rounded-2xl p-4">
          <div className="text-warn text-xs mb-1">売却推奨合計</div>
          <div className="text-text font-mono font-bold text-xl">{fmtYen(totalSell)}</div>
          {totalTax > 0 && (
            <div className="text-warn text-xs mt-1">
              概算税額: {fmtYen(totalTax)}
            </div>
          )}
        </div>
        <div className="bg-info/10 border border-info/30 rounded-2xl p-4">
          <div className="text-info text-xs mb-1">購入推奨合計</div>
          <div className="text-text font-mono font-bold text-xl">{fmtYen(totalBuy)}</div>
          <div className="text-info text-xs mt-1">
            {buyItems.length}クラスに分散
          </div>
        </div>
      </div>

      {/* 売却指示 */}
      {sellItems.length > 0 && (
        <div className="bg-surface-2 border border-border rounded-2xl p-4 space-y-4">
          <h3 className="text-warn text-sm font-semibold flex items-center gap-2">
            <span>↓</span> 売却推奨
          </h3>

          {sellItems.map((item) => {
            const actions    = sellActions.filter((a) => a.asset.assetClass === item.assetClass);
            const classAssets = getAssetsInClass(assets, item.assetClass);

            return (
              <div key={item.assetClass} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-text text-sm font-medium">
                    {ASSET_CLASS_LABELS[item.assetClass]}
                  </div>
                  <div className="text-right text-xs">
                    <span className="text-warn font-mono font-semibold">
                      {fmtYen(Math.abs(item.requiredAmount))} 売却
                    </span>
                    <span className="text-muted ml-2">
                      ({fmtPct(item.currentRatio)} → {fmtPct(item.targetRatio)})
                    </span>
                  </div>
                </div>

                {actions.length > 0 ? (
                  <div className="space-y-1.5 ml-3">
                    {actions.map((a) => {
                      const gainRate = a.asset.acquisitionPrice
                        ? Math.max((a.asset.currentValue - a.asset.acquisitionPrice) / a.asset.currentValue, 0)
                        : 0;
                      return (
                        <div key={a.asset.id} className="bg-surface-2/70 rounded-xl px-3 py-2.5">
                          <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0">
                              <div className="text-text text-xs font-medium truncate">{a.asset.name}</div>
                              <div className="text-muted text-xs">{a.asset.account}</div>
                            </div>
                            <div className="text-right ml-3 flex-shrink-0">
                              <div className="text-warn font-mono text-sm font-semibold">
                                {fmtYen(Math.abs(a.amount))} 売却
                              </div>
                              {a.taxAmount > 0 && (
                                <div className="text-xs text-warn">
                                  税 {fmtYen(a.taxAmount)}
                                  <span className="text-muted ml-1">(含み益率 {fmtPct(gainRate)})</span>
                                </div>
                              )}
                              {a.taxAmount > 0 && (
                                <div className="text-xs text-muted">
                                  手取り {fmtYen(a.netAmount)}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : classAssets.length === 0 ? (
                  <div className="text-muted text-xs ml-3 bg-surface-2/50 rounded-xl px-3 py-2">
                    このクラスの保有銘柄なし（既に売却済み？）
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {/* 購入指示 */}
      {buyItems.length > 0 && (
        <div className="bg-surface-2 border border-border rounded-2xl p-4 space-y-4">
          <h3 className="text-info text-sm font-semibold flex items-center gap-2">
            <span>↑</span> 購入推奨
          </h3>

          {buyItems.map((item) => {
            const actions     = buyActions.filter((a) => a.asset.assetClass === item.assetClass);
            const classAssets = getAssetsInClass(assets, item.assetClass);

            return (
              <div key={item.assetClass} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-text text-sm font-medium">
                    {ASSET_CLASS_LABELS[item.assetClass]}
                  </div>
                  <div className="text-right text-xs">
                    <span className="text-info font-mono font-semibold">
                      {fmtYen(item.requiredAmount)} 購入
                    </span>
                    <span className="text-muted ml-2">
                      ({fmtPct(item.currentRatio)} → {fmtPct(item.targetRatio)})
                    </span>
                  </div>
                </div>

                {actions.length > 0 ? (
                  <div className="space-y-1.5 ml-3">
                    {actions.map((a) => (
                      <div key={a.asset.id} className="bg-surface-2/70 rounded-xl px-3 py-2.5">
                        <div className="flex justify-between items-center">
                          <div className="flex-1 min-w-0">
                            <div className="text-text text-xs font-medium truncate">{a.asset.name}</div>
                            <div className="text-muted text-xs">{a.asset.account}</div>
                          </div>
                          <div className="text-info font-mono text-sm font-semibold ml-3 flex-shrink-0">
                            {fmtYen(a.amount)} 購入
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : classAssets.length === 0 ? (
                  <div className="text-muted text-xs ml-3 bg-surface-2/50 rounded-xl px-3 py-2">
                    ⚠ このクラスの保有銘柄なし。資産入力画面で銘柄を登録すると具体的な提案が表示されます。
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {/* 注意事項 */}
      <div className="bg-surface-2 border border-border rounded-xl p-3 text-xs text-muted space-y-1 leading-relaxed">
        <div>・売却提案は保有銘柄の時価按分で計算しています（NISA口座売却の課税計算は除外）</div>
        <div>・税額は概算（含み益×{(TAX_RATE * 100).toFixed(3)}%）です。正確な税額は証券会社でご確認ください</div>
        <div>・実際の売買は相場状況・最低購入単位を考慮して判断してください</div>
      </div>
    </div>
  );
}
