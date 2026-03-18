import { useState } from 'react';
import { useAssets } from '../../hooks/useAssets';
import { useSettings } from '../../hooks/useSettings';
import { useDividends } from '../../hooks/useDividends';
import { calcDividendBreakdown, fmtYen } from './dividendUtils';
import { DividendDashboard }  from './DividendDashboard';
import { DividendTable }      from './DividendTable';
import { DividendCalendar }   from './DividendCalendar';
import { DividendHistory }    from './DividendHistory';
import { DividendSimulator }  from './DividendSimulator';

type Tab = 'dashboard' | 'table' | 'calendar' | 'history' | 'simulator';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'dashboard',  label: 'ダッシュボード', icon: '📊' },
  { id: 'table',      label: '銘柄別',         icon: '📋' },
  { id: 'calendar',   label: 'カレンダー',     icon: '🗓' },
  { id: 'history',    label: '受取履歴',       icon: '📝' },
  { id: 'simulator',  label: 'シミュレーター', icon: '🎯' },
];

export function DividendPage() {
  const { assets, totalValue } = useAssets();
  const { settings }           = useSettings();
  const {
    dividends, addDividend, deleteDividend, totalByYear,
  } = useDividends();

  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  const breakdown = calcDividendBreakdown(assets, totalValue);

  // 前年比（受取履歴から）
  const currentYear  = new Date().getFullYear();
  const prevYearTotal = totalByYear[String(currentYear - 1)];

  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center gap-4">
        <div className="text-6xl">💸</div>
        <h2 className="text-text text-xl font-bold">資産データがありません</h2>
        <p className="text-muted text-sm">資産入力画面で保有資産を登録してください。</p>
      </div>
    );
  }

  return (
    <div className="animate-fadein p-4 sm:p-6 mx-auto space-y-5">
      {/* Hero card */}
      <div className="glow-gold bg-gradient-to-br from-[#1a1520] to-bg border border-border rounded-2xl p-5">
        <div className="text-muted text-xs font-medium uppercase tracking-widest mb-2">配当・インカム</div>
        <div className="font-serif text-3xl font-mono text-gold-2 font-bold mb-1">
          {fmtYen(breakdown.totalAfterTax)}<span className="text-muted text-sm font-sans font-normal ml-1">/年（税引後）</span>
        </div>
        <div className="flex gap-4 text-xs text-muted mt-3 border-t border-border pt-3">
          <span>利回り <span className="text-text font-mono ml-0.5">{(breakdown.portfolioYield * 100).toFixed(2)}%</span></span>
          <span>NISA非課税 <span className="text-gain font-mono ml-0.5">{fmtYen(breakdown.nisaAnnual)}</span></span>
          {prevYearTotal !== undefined && (
            <span>前年 <span className="text-text font-mono ml-0.5">{fmtYen(prevYearTotal)}</span></span>
          )}
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
        {activeTab === 'dashboard' && (
          <DividendDashboard
            breakdown={breakdown}
            prevYearAnnual={prevYearTotal}
          />
        )}
        {activeTab === 'table' && (
          <DividendTable assets={assets} />
        )}
        {activeTab === 'calendar' && (
          <DividendCalendar assets={assets} />
        )}
        {activeTab === 'history' && (
          <DividendHistory
            dividends={dividends}
            assets={assets}
            onAdd={addDividend}
            onDelete={deleteDividend}
          />
        )}
        {activeTab === 'simulator' && (
          <DividendSimulator
            currentAsset={totalValue}
            monthlyContrib={settings.monthlyInvestment}
            breakdown={breakdown}
            initialMonthlyExpense={settings.monthlyExpense}
          />
        )}
      </div>
    </div>
  );
}
