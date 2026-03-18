import { useState } from 'react';
import type { RebalanceTarget } from '../../types';
import { useAssets } from '../../hooks/useAssets';
import { useSettings } from '../../hooks/useSettings';
import { useRebalance } from '../../hooks/useRebalance';
import { TargetAllocation }       from './TargetAllocation';
import { DeviationChart }         from './DeviationChart';
import { RebalanceInstructions }  from './RebalanceInstructions';
import { ContribAssistant }       from './ContribAssistant';
import { fmtPct } from './rebalanceUtils';

type Tab = 'target' | 'deviation' | 'instructions' | 'contrib';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'target',       label: '目標配分',     icon: '🎯' },
  { id: 'deviation',    label: '乖離状況',     icon: '📊' },
  { id: 'instructions', label: 'リバランス指示', icon: '⚡' },
  { id: 'contrib',      label: '積立アシスト', icon: '💰' },
];

export function RebalancePage() {
  const { assets, totalValue } = useAssets();
  const { settings, updateSettings } = useSettings();
  const [activeTab, setActiveTab] = useState<Tab>('target');

  const targets = settings.rebalanceTargets ?? [];
  const { summary, rebalanceByBuyOnly } = useRebalance(assets, targets);

  const handleSaveTargets = (next: RebalanceTarget[]) => {
    updateSettings({ rebalanceTargets: next });
  };

  const outOfRangeCount = summary.items.filter((i) => i.isOutOfRange).length;
  const totalRatio = targets.reduce((s, t) => s + t.targetRatio, 0);
  const isConfigured = targets.length > 0 && Math.abs(totalRatio - 1) < 0.01;

  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center gap-4">
        <div className="text-6xl">⚖️</div>
        <h2 className="text-text text-xl font-bold">資産データがありません</h2>
        <p className="text-muted text-sm">資産入力画面で保有資産を登録してください。</p>
      </div>
    );
  }

  return (
    <div className="animate-fadein p-4 sm:p-6 mx-auto space-y-5">
      {/* Hero card */}
      <div className="glow-gold bg-gradient-to-br from-[#1a1520] to-bg border border-border rounded-2xl p-5">
        <div className="text-muted text-xs font-medium uppercase tracking-widest mb-2">リバランスアシスタント</div>
        <div className={`font-serif text-2xl font-bold mb-1 ${outOfRangeCount > 0 ? 'text-warn' : isConfigured ? 'text-gain' : 'text-muted'}`}>
          {isConfigured
            ? outOfRangeCount > 0
              ? `${outOfRangeCount}クラスで乖離検知`
              : '全クラス許容範囲内'
            : '目標配分を設定'}
        </div>
        <div className="flex gap-4 text-xs text-muted mt-3 border-t border-border pt-3">
          {isConfigured ? (
            <>
              {outOfRangeCount > 0 ? (
                <span className="text-warn font-semibold">{outOfRangeCount}クラスで乖離あり</span>
              ) : (
                <span className="text-gain font-semibold">✓ 全クラス許容範囲内</span>
              )}
              <span className="text-border">·</span>
              <span>{targets.length}クラス設定済み</span>
            </>
          ) : (
            <span>目標配分を設定してリバランスを自動計算します</span>
          )}
        </div>
      </div>

      {/* リバランス必要アラート */}
      {isConfigured && summary.needsRebalance && (
        <div className="bg-warn/10 border border-warn/30 rounded-2xl p-4 flex items-start gap-3">
          <span className="text-xl flex-shrink-0">⚠️</span>
          <div>
            <div className="text-warn font-semibold text-sm">リバランスを推奨します</div>
            <div className="text-warn/80 text-xs mt-0.5">
              売却 {fmtPct(summary.totalSellAmount / totalValue)}・
              購入 {fmtPct(summary.totalBuyAmount / totalValue)} でポートフォリオを最適化できます
            </div>
          </div>
        </div>
      )}

      {/* タブ */}
      <div className="-mx-4 sm:-mx-6">
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-1 px-4 sm:px-6 pb-1 min-w-max">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-gold/15 text-gold'
                    : 'text-muted hover:text-text hover:bg-surface-2'
                }`}
              >
                <span>{tab.icon}</span>{tab.label}
                {tab.id === 'deviation' && outOfRangeCount > 0 && (
                  <span className="ml-1 bg-amber-500 text-black text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {outOfRangeCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="h-px bg-border mx-4 sm:mx-6" />
      </div>

      {/* コンテンツ */}
      <div>
        {activeTab === 'target' && (
          <TargetAllocation targets={targets} onSave={handleSaveTargets} />
        )}
        {activeTab === 'deviation' && (
          <DeviationChart
            items={summary.items}
            totalValue={totalValue}
            needsRebalance={summary.needsRebalance}
          />
        )}
        {activeTab === 'instructions' && (
          <RebalanceInstructions
            summary={summary}
            assets={assets}
          />
        )}
        {activeTab === 'contrib' && (
          <ContribAssistant
            summary={summary}
            targets={targets}
            assets={assets}
            totalValue={totalValue}
            monthlyContrib={settings.monthlyInvestment}
            rebalanceByBuyOnly={rebalanceByBuyOnly}
          />
        )}
      </div>
    </div>
  );
}
