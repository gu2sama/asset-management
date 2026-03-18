import { useState } from 'react';
import { useAssets } from '../../hooks/useAssets';
import { useSnapshots } from '../../hooks/useSnapshots';
import { AssetClassView } from './views/AssetClassView';
import { CountryView }    from './views/CountryView';
import { CurrencyView }   from './views/CurrencyView';
import { SectorView }     from './views/SectorView';
import { CompanyView }    from './views/CompanyView';
import { AccountView }    from './views/AccountView';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';

type TabId = 'asset' | 'country' | 'currency' | 'sector' | 'company' | 'account';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'asset',    label: 'アセット別',  icon: '🥧' },
  { id: 'country',  label: '国・地域別',  icon: '🌍' },
  { id: 'currency', label: '通貨別',       icon: '💱' },
  { id: 'sector',   label: 'セクター別',  icon: '🏭' },
  { id: 'company',  label: '企業別',       icon: '🏢' },
  { id: 'account',  label: '口座区分別',  icon: '🏦' },
];

function formatYen(n: number) {
  if (n >= 1_000_000) return `¥${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000)    return `¥${Math.round(n / 10_000)}万`;
  return `¥${n.toLocaleString()}`;
}

function PortfolioChart({ snapshots }: { snapshots: { snapshotId: string; totalValue: number }[] }) {
  if (snapshots.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center h-28 text-muted text-xs gap-1">
        <span>月次更新を2回以上行うとグラフが表示されます</span>
      </div>
    );
  }

  const data = snapshots.map((s) => ({
    month: s.snapshotId.replace(/^(\d{4})-(\d{2})$/, '$1/$2'),
    value: s.totalValue,
  }));

  const min = Math.min(...data.map((d) => d.value));
  const max = Math.max(...data.map((d) => d.value));
  const padding = (max - min) * 0.15 || max * 0.1;

  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#c9a84c" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#c9a84c" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fill: '#888', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[min - padding, max + padding]}
          tickFormatter={formatYen}
          tick={{ fill: '#888', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={52}
        />
        <Tooltip
          contentStyle={{ background: '#1a1520', border: '1px solid #2a2535', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: '#aaa' }}
          formatter={(v: unknown) => [`¥${Number(v ?? 0).toLocaleString()}`, '総資産'] as [string, string]}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="#c9a84c"
          strokeWidth={2}
          fill="url(#goldGrad)"
          dot={{ r: 3, fill: '#c9a84c', strokeWidth: 0 }}
          activeDot={{ r: 5, fill: '#c9a84c' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function PortfolioAnalysisPage() {
  const { assets, totalValue } = useAssets();
  const { snapshots, monthlyDelta } = useSnapshots();
  const [activeTab, setActiveTab] = useState<TabId>('asset');

  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center gap-4">
        <div className="text-6xl">📊</div>
        <h2 className="text-text text-xl font-bold">資産データがありません</h2>
        <p className="text-muted text-sm max-w-xs">
          まず「資産入力」画面で保有資産を登録してください。
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fadein p-4 sm:p-6 space-y-4">
      {/* Hero card */}
      <div className="glow-gold bg-gradient-to-br from-[#1a1520] to-bg border border-border rounded-2xl p-5">
        <div className="text-muted text-xs font-medium uppercase tracking-widest mb-2">総資産</div>
        <div className="flex items-end gap-4">
          <div className="font-serif text-3xl font-bold text-gold-2 font-mono">
            ¥{totalValue.toLocaleString()}
          </div>
          {snapshots.length >= 2 && (() => {
            const delta = monthlyDelta();
            return (
              <div className={`text-sm font-mono mb-0.5 ${delta >= 0 ? 'text-gain' : 'text-loss'}`}>
                {delta >= 0 ? '+' : ''}¥{delta.toLocaleString()}
                <span className="text-muted text-xs ml-1">前月比</span>
              </div>
            );
          })()}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted mt-2">
          <span>{assets.length}銘柄保有</span>
          <span className="text-border">·</span>
          <span>{snapshots.length}ヶ月分のデータ</span>
        </div>
      </div>

      {/* 資産推移グラフ */}
      <div className="bg-surface-2/50 border border-border rounded-2xl p-4">
        <div className="text-xs text-muted font-medium mb-3">資産推移</div>
        <PortfolioChart snapshots={snapshots} />
      </div>

      {/* タブバー（横スクロール対応） */}
      <div className="-mx-4 sm:-mx-6">
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-1 px-4 sm:px-6 pb-1 min-w-max">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                aria-pressed={activeTab === tab.id}
                className={`
                  flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-150
                  ${activeTab === tab.id
                    ? 'bg-gold/15 text-gold'
                    : 'text-muted hover:text-text hover:bg-surface-2'
                  }
                `}
              >
                <span className="text-base">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="h-px bg-border mx-4 sm:mx-6" />
      </div>

      {/* ビュー本体 */}
      <div className="min-h-[400px]">
        {activeTab === 'asset'    && <AssetClassView assets={assets} />}
        {activeTab === 'country'  && <CountryView assets={assets} />}
        {activeTab === 'currency' && <CurrencyView assets={assets} />}
        {activeTab === 'sector'   && <SectorView assets={assets} />}
        {activeTab === 'company'  && <CompanyView assets={assets} />}
        {activeTab === 'account'  && <AccountView assets={assets} />}
      </div>
    </div>
  );
}
