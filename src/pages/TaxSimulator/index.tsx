import { useState } from 'react';
import { useAssets } from '../../hooks/useAssets';
import { usePortfolioSummary } from '../../hooks/usePortfolioSummary';
import { useTaxSimulator } from '../../hooks/useTaxSimulator';
import { GainLossList }         from './GainLossList';
import { TaxOffsetSimulator }   from './TaxOffsetSimulator';
import { HarvestingProposal }   from './HarvestingProposal';
import { NisaMigration }        from './NisaMigration';
import { TaxSummary }           from './TaxSummary';
import { fmtYen } from './taxUtils';

type Tab = 'list' | 'offset' | 'harvest' | 'nisa' | 'summary';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'list',    label: '含み損益',   icon: '📊' },
  { id: 'offset',  label: '損益通算',   icon: '⚖️' },
  { id: 'harvest', label: '損出し提案', icon: '💡' },
  { id: 'nisa',    label: 'NISA移行',  icon: '🏦' },
  { id: 'summary', label: '申告サマリー', icon: '📋' },
];

export function TaxSimulatorPage() {
  const { assets } = useAssets();
  const summary    = usePortfolioSummary(assets);
  const taxResult  = useTaxSimulator(assets);

  const [activeTab, setActiveTab] = useState<Tab>('list');

  const hasHarvestOpportunity = taxResult.harvesting.estimatedTaxSaving > 0;

  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center gap-4">
        <div className="text-6xl">🧾</div>
        <h2 className="text-text text-xl font-bold">資産データがありません</h2>
        <p className="text-muted text-sm">資産入力画面で保有資産を登録してください。</p>
      </div>
    );
  }

  return (
    <div className="animate-fadein p-4 sm:p-6 mx-auto space-y-5">
      {/* Hero card */}
      <div className="glow-gold bg-gradient-to-br from-[#1a1520] to-bg border border-border rounded-2xl p-5">
        <div className="text-muted text-xs font-medium uppercase tracking-widest mb-2">税金シミュレーター</div>
        <div className="flex items-baseline gap-3 mb-3">
          <div>
            <div className="text-[10px] text-muted mb-0.5">概算税額</div>
            <div className="font-serif text-2xl font-mono text-warn">{fmtYen(taxResult.estimatedTax)}</div>
          </div>
          {taxResult.harvesting.estimatedTaxSaving > 0 && (
            <div className="ml-auto">
              <div className="text-[10px] text-muted mb-0.5">節税余地</div>
              <div className="font-mono text-lg text-gain">−{fmtYen(taxResult.harvesting.estimatedTaxSaving)}</div>
            </div>
          )}
        </div>
        <div className="flex gap-4 text-xs text-muted border-t border-border pt-3">
          <span>含み益 <span className="text-gain font-mono ml-1">{fmtYen(taxResult.totalGain)}</span></span>
          {taxResult.totalLoss > 0 && (
            <span>含み損 <span className="text-loss font-mono ml-1">−{fmtYen(taxResult.totalLoss)}</span></span>
          )}
        </div>
      </div>

      {/* 損出し機会アラート */}
      {hasHarvestOpportunity && (
        <div
          className="bg-gain/10 border border-gain/30 rounded-2xl px-4 py-3 flex items-center gap-3 cursor-pointer"
          onClick={() => setActiveTab('harvest')}
        >
          <span className="text-xl">💡</span>
          <div>
            <div className="text-gain font-semibold text-sm">損出しで節税できます</div>
            <div className="text-gain/80 text-xs mt-0.5">
              含み損銘柄を売却することで最大 {fmtYen(taxResult.harvesting.estimatedTaxSaving)} 節税可能です
            </div>
          </div>
          <span className="text-muted ml-auto">→</span>
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
                {tab.id === 'harvest' && hasHarvestOpportunity && (
                  <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-gain flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="h-px bg-border mx-4 sm:mx-6" />
      </div>

      {/* コンテンツ */}
      <div>
        {activeTab === 'list' && (
          <GainLossList
            gains={taxResult.gains}
            nisaUnrealizedGain={taxResult.nisaUnrealizedGain}
          />
        )}
        {activeTab === 'offset' && (
          <TaxOffsetSimulator
            taxableGains={taxResult.taxableGains}
          />
        )}
        {activeTab === 'harvest' && (
          <HarvestingProposal harvesting={taxResult.harvesting} />
        )}
        {activeTab === 'nisa' && (
          <NisaMigration assets={assets} />
        )}
        {activeTab === 'summary' && (
          <TaxSummary
            result={taxResult}
            annualDividendYen={summary.annualDividendYen}
          />
        )}
      </div>
    </div>
  );
}
