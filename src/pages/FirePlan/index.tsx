import { useState } from 'react';
import { useAssets } from '../../hooks/useAssets';
import { useSettings } from '../../hooks/useSettings';
import { usePortfolioSummary } from '../../hooks/usePortfolioSummary';
import { WealthTier } from './WealthTier';
import { FireSimulator } from './FireSimulator';
import { WithdrawalSimulator } from './WithdrawalSimulator';
import { fmtAsset } from './fireUtils';

type Tab = 'tier' | 'fire' | 'withdrawal';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'tier',       label: '資産階級',   icon: '🏆' },
  { id: 'fire',       label: 'FIRE達成',   icon: '🔥' },
  { id: 'withdrawal', label: '取り崩し',   icon: '📉' },
];

/** 中立シナリオの実質リターン（デフォルト5% - コスト） */
const NEUTRAL_GROSS = 0.05;

export function FirePlanPage() {
  const { assets, totalValue } = useAssets();
  const { settings } = useSettings();
  const summary = usePortfolioSummary(assets);

  const [activeTab, setActiveTab] = useState<Tab>('tier');

  const effectiveCostRate = summary.weightedCostRate;
  const neutralNetRate    = Math.max(NEUTRAL_GROSS - effectiveCostRate, 0);

  const {
    currentAge, targetAge, monthlyInvestment,
    monthlyExpense,
    pensionMonthly, pensionStartAge,
    idecoMonthly = 0, idecoStartAge = 60,
    rentalMonthly = 0, sideIncomeMonthly = 0,
  } = settings;

  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center gap-4">
        <div className="text-6xl">🔥</div>
        <h2 className="text-text text-xl font-bold">資産データがありません</h2>
        <p className="text-muted text-sm">資産入力画面で保有資産を登録してください。</p>
      </div>
    );
  }

  return (
    <div className="animate-fadein p-4 sm:p-6 mx-auto space-y-5">
      {/* Hero card */}
      <div className="glow-gold bg-gradient-to-br from-[#1a1520] to-bg border border-border rounded-2xl p-5">
        <div className="text-muted text-xs font-medium uppercase tracking-widest mb-2">FIRE · ライフプラン</div>
        <div className="font-serif text-3xl font-mono text-gold-2 font-bold mb-1">{fmtAsset(totalValue)}</div>
        <div className="flex gap-4 text-xs text-muted mt-3 border-t border-border pt-3">
          <span>現在 <span className="text-text font-semibold ml-0.5">{currentAge}歳</span></span>
          <span>目標 <span className="text-gold font-semibold ml-0.5">{targetAge}歳 FIRE</span></span>
          <span>月次積立 <span className="text-text font-mono ml-0.5">¥{monthlyInvestment.toLocaleString()}</span></span>
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
        {activeTab === 'tier' && (
          <WealthTier
            currentAsset={totalValue}
            monthlyContrib={monthlyInvestment}
            neutralNetRate={neutralNetRate}
          />
        )}
        {activeTab === 'fire' && (
          <FireSimulator
            currentAsset={totalValue}
            currentAge={currentAge}
            monthlyContrib={monthlyInvestment}
            neutralNetRate={neutralNetRate}
            monthlyExpense={monthlyExpense}
            pensionMonthly={pensionMonthly}
            idecoMonthly={idecoMonthly}
            rentalMonthly={rentalMonthly}
            sideIncomeMonthly={sideIncomeMonthly}
          />
        )}
        {activeTab === 'withdrawal' && (
          <WithdrawalSimulator
            currentAsset={totalValue}
            currentAge={currentAge}
            monthlyContrib={monthlyInvestment}
            neutralNetRate={neutralNetRate}
            targetAge={targetAge}
            monthlyExpense={monthlyExpense}
            pensionStartAge={pensionStartAge}
            pensionMonthly={pensionMonthly}
            idecoStartAge={idecoStartAge}
            idecoMonthly={idecoMonthly}
            rentalMonthly={rentalMonthly}
            sideIncomeMonthly={sideIncomeMonthly}
          />
        )}
      </div>
    </div>
  );
}
