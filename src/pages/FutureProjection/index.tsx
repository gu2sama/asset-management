import { useState } from 'react';
import { useAssets } from '../../hooks/useAssets';
import { useSettings } from '../../hooks/useSettings';
import { usePortfolioSummary } from '../../hooks/usePortfolioSummary';
import { SCENARIOS } from './projectionUtils';
import { ScenarioChart } from './ScenarioChart';
import { SavingsSimulator } from './SavingsSimulator';
import { GoalCalculator } from './GoalCalculator';

type Tab = 'scenario' | 'savings' | 'goal';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'scenario', label: '将来予測',       icon: '📈' },
  { id: 'savings',  label: '積立シミュ',     icon: '💰' },
  { id: 'goal',     label: '目標逆算',       icon: '🎯' },
];

export function FutureProjectionPage() {
  const { assets, totalValue } = useAssets();
  const { settings } = useSettings();
  const summary = usePortfolioSummary(assets);

  const [activeTab, setActiveTab] = useState<Tab>('scenario');

  // シナリオごとのリターン率（グロス）を管理
  const [rates, setRates] = useState<Record<string, number>>(
    Object.fromEntries(SCENARIOS.map((s) => [s.key, s.defaultRate]))
  );

  const handleRateChange = (key: string, rate: number) => {
    setRates((prev) => ({ ...prev, [key]: rate }));
  };

  const effectiveCostRate = summary.weightedCostRate;
  const monthlyContrib    = settings.monthlyInvestment;
  const currentAge        = settings.currentAge;
  const targetAmount      = settings.targetAmount;
  const targetAge         = settings.targetAge;

  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center gap-4">
        <div className="text-6xl">📈</div>
        <h2 className="text-text text-xl font-bold">資産データがありません</h2>
        <p className="text-muted text-sm">資産入力画面で保有資産を登録してください。</p>
      </div>
    );
  }

  return (
    <div className="animate-fadein p-4 sm:p-6 mx-auto space-y-5">
      {/* Hero card */}
      <div className="glow-gold bg-gradient-to-br from-[#1a1520] to-bg border border-border rounded-2xl p-5">
        <div className="text-muted text-xs font-medium uppercase tracking-widest mb-2">将来予測</div>
        <div className="font-serif text-3xl font-mono text-gold-2 font-bold mb-1">
          {totalValue >= 1e8
            ? `${(totalValue / 1e8).toFixed(2)}億円`
            : `¥${Math.round(totalValue / 10000).toLocaleString()}万円`}
        </div>
        <div className="flex gap-4 text-xs text-muted mt-3 border-t border-border pt-3">
          <span>現在資産</span>
          <span>実効コスト <span className="text-text font-mono ml-0.5">{(effectiveCostRate * 100).toFixed(3)}%</span></span>
          <span>月次積立 <span className="text-text font-mono ml-0.5">¥{settings.monthlyInvestment.toLocaleString()}</span></span>
        </div>
      </div>

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
              </button>
            ))}
          </div>
        </div>
        <div className="h-px bg-border mx-4 sm:mx-6" />
      </div>

      {/* コンテンツ */}
      <div>
        {activeTab === 'scenario' && (
          <ScenarioChart
            currentAsset={totalValue}
            effectiveCostRate={effectiveCostRate}
            monthlyContrib={monthlyContrib}
            targetAmount={targetAmount}
            rates={rates}
            onRateChange={handleRateChange}
          />
        )}
        {activeTab === 'savings' && (
          <SavingsSimulator
            currentAsset={totalValue}
            effectiveCostRate={effectiveCostRate}
            initialMonthly={monthlyContrib}
            initialYears={Math.max(targetAge - currentAge, 10)}
          />
        )}
        {activeTab === 'goal' && (
          <GoalCalculator
            currentAsset={totalValue}
            currentAge={currentAge}
            effectiveCostRate={effectiveCostRate}
            monthlyContrib={monthlyContrib}
            initialTargetAmount={targetAmount}
            initialTargetAge={targetAge}
            rates={rates}
          />
        )}
      </div>
    </div>
  );
}
