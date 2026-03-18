import { useState } from 'react';
import { useAssets } from '../../hooks/useAssets';
import { buildCostRows, buildCostSummary, calcNisaRemain } from './costUtils';
import { CostDashboard } from './CostDashboard';
import { CostTable }     from './CostTable';
import { SwitchSimulator } from './SwitchSimulator';

type Tab = 'dashboard' | 'table' | 'simulator';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'ダッシュボード', icon: '📊' },
  { id: 'table',     label: '銘柄別コスト',   icon: '📋' },
  { id: 'simulator', label: '乗り換えシミュ', icon: '🔄' },
];

export function CostAnalysisPage() {
  const { assets } = useAssets();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [simulatorFromId, setSimulatorFromId] = useState<string | undefined>();

  const costRows   = buildCostRows(assets);
  const summary    = buildCostSummary(assets);
  const nisaRemain = calcNisaRemain(assets);

  const handleSelectForSimulator = (assetId: string) => {
    setSimulatorFromId(assetId);
    setActiveTab('simulator');
  };

  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center gap-4">
        <div className="text-6xl">💰</div>
        <h2 className="text-text text-xl font-bold">資産データがありません</h2>
        <p className="text-muted text-sm">資産入力画面で保有資産を登録してください。</p>
      </div>
    );
  }

  return (
    <div className="animate-fadein p-4 sm:p-6 mx-auto space-y-5">
      {/* Hero card */}
      <div className="glow-gold bg-gradient-to-br from-[#1a1520] to-bg border border-border rounded-2xl p-5">
        <div className="text-muted text-xs font-medium uppercase tracking-widest mb-2">コスト分析</div>
        <div className={`font-serif text-3xl font-mono font-bold mb-1 ${
          summary.effectiveCostRate > 0.005 ? 'text-loss'
          : summary.effectiveCostRate > 0.003 ? 'text-warn' : 'text-gain'
        }`}>
          {(summary.effectiveCostRate * 100).toFixed(3)}%<span className="text-muted text-sm font-sans font-normal ml-1">/年</span>
        </div>
        <div className="flex gap-4 text-xs text-muted mt-3 border-t border-border pt-3">
          <span>実効コスト率</span>
          <span>年間コスト <span className="text-text font-mono ml-0.5">¥{summary.annualCostYen.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></span>
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
          <CostDashboard summary={summary} nisaRemains={nisaRemain} />
        )}
        {activeTab === 'table' && (
          <CostTable rows={costRows} onSelectAsset={handleSelectForSimulator} />
        )}
        {activeTab === 'simulator' && (
          <SwitchSimulator
            assets={assets}
            costRows={costRows}
            initialFromId={simulatorFromId}
          />
        )}
      </div>
    </div>
  );
}
