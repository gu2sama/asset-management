import './index.css';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { useOnboarding } from './hooks/useOnboarding';
import { Onboarding }    from './components/Onboarding';
import { PortfolioAnalysisPage }   from './pages/PortfolioAnalysis';
import { AssetInputPage }          from './pages/AssetInput';
import { CostAnalysisPage }        from './pages/CostAnalysis';
import { FutureProjectionPage }    from './pages/FutureProjection';
import { FirePlanPage }            from './pages/FirePlan';
import { DividendPage }            from './pages/Dividend';
import { RebalancePage }           from './pages/Rebalance';
import { TaxSimulatorPage }        from './pages/TaxSimulator';
import { ReportPage }              from './pages/Report';
import { SettingsPage }            from './pages/Settings';

// ─────────────────────────────────────────────────
// Navigation definition
// ─────────────────────────────────────────────────
const NAV_ITEMS = [
  { to: '/',          icon: '◈',  label: 'ポートフォリオ' },
  { to: '/assets',    icon: '✦',  label: '資産入力' },
  { to: '/cost',      icon: '◇',  label: 'コスト' },
  { to: '/future',    icon: '↗',  label: '将来予測' },
  { to: '/fire',      icon: '◉',  label: 'FIRE' },
  { to: '/dividend',  icon: '◎',  label: '配当' },
  { to: '/rebalance', icon: '⊜',  label: 'リバランス' },
  { to: '/tax',       icon: '◑',  label: '税金' },
  { to: '/report',    icon: '▣',  label: 'レポート' },
  { to: '/settings',  icon: '◐',  label: '設定' },
] as const;

// ─────────────────────────────────────────────────
// Sidebar (PC ≥ 768px)
// ─────────────────────────────────────────────────
function Sidebar() {
  return (
    <aside
      className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-[240px] bg-surface border-r border-border z-30"
      aria-label="サイドバーナビゲーション"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
        <div className="w-7 h-7 rounded-lg bg-gold/20 border border-gold/40 flex items-center justify-center">
          <span className="text-gold text-xs font-bold">P</span>
        </div>
        <div>
          <div className="text-text text-sm font-semibold leading-none">Portfolio</div>
          <div className="text-muted text-[10px] mt-0.5">Manager</div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-4 px-3">
        <div className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              aria-label={item.label}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 min-h-[44px] ${
                  isActive
                    ? 'bg-gold/12 text-gold font-medium'
                    : 'text-muted hover:text-text hover:bg-surface-2'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`text-base w-5 text-center flex-shrink-0 ${isActive ? 'text-gold' : 'text-muted'}`}>
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                  {isActive && (
                    <span className="ml-auto w-1 h-1 rounded-full bg-gold flex-shrink-0" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-border">
        <p className="text-muted text-[10px] leading-relaxed">
          本アプリは参考情報の提供を目的とし、<br />投資助言には該当しません。
        </p>
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────────
// Bottom navigation (mobile < 768px)
// ─────────────────────────────────────────────────
function BottomNav() {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface/95 backdrop-blur-md border-t border-border pb-safe"
      aria-label="ボトムナビゲーション"
    >
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex min-w-max px-2 py-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              aria-label={item.label}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-150 min-w-[56px] min-h-[44px] ${
                  isActive ? 'text-gold' : 'text-muted hover:text-text'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`text-lg leading-none ${isActive ? 'text-gold' : ''}`}>
                    {item.icon}
                  </span>
                  <span className={`text-[9px] font-medium whitespace-nowrap leading-tight ${
                    isActive ? 'text-gold' : 'text-muted'
                  }`}>
                    {item.label}
                  </span>
                  {isActive && (
                    <span className="absolute top-1 w-1 h-1 rounded-full bg-gold" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}

// ─────────────────────────────────────────────────
// Top header bar (mobile only — shows page title)
// ─────────────────────────────────────────────────
function TopBar() {
  const location = useLocation();
  const active = NAV_ITEMS.find((n) =>
    n.to === '/' ? location.pathname === '/' : location.pathname.startsWith(n.to)
  );

  return (
    <header className="md:hidden sticky top-0 z-20 bg-surface/95 backdrop-blur-md border-b border-border px-5 h-14 flex items-center gap-3 shrink-0">
      <div className="w-6 h-6 rounded-md bg-gold/20 border border-gold/30 flex items-center justify-center flex-shrink-0">
        <span className="text-gold text-xs font-bold">P</span>
      </div>
      <span className="text-text font-semibold text-sm truncate">{active?.label ?? 'Portfolio Manager'}</span>
    </header>
  );
}

// ─────────────────────────────────────────────────
// App layout
// ─────────────────────────────────────────────────
function AppLayout() {
  const { isComplete, markComplete } = useOnboarding();

  if (!isComplete) {
    return <Onboarding onComplete={markComplete} />;
  }

  return (
    <div className="h-svh bg-bg flex overflow-hidden">
      {/* PC Sidebar */}
      <Sidebar />

      {/* Main area */}
      <div className="flex-1 min-w-0 md:ml-[240px] overflow-y-auto pb-24 md:pb-8 [scroll-padding-top:3.5rem] md:[scroll-padding-top:0]">
        {/* Mobile top bar — sticky inside scroll container so scroll-padding-top works */}
        <TopBar />

        {/* Page content */}
        <main>
          {/* Narrow content column (mobile-first feel on desktop too) */}
          <div className="w-full max-w-[480px] mx-auto">
            <Routes>
              <Route path="/"          element={<PortfolioAnalysisPage />} />
              <Route path="/assets"    element={<AssetInputPage />} />
              <Route path="/cost"      element={<CostAnalysisPage />} />
              <Route path="/future"    element={<FutureProjectionPage />} />
              <Route path="/fire"      element={<FirePlanPage />} />
              <Route path="/dividend"  element={<DividendPage />} />
              <Route path="/rebalance" element={<RebalancePage />} />
              <Route path="/tax"       element={<TaxSimulatorPage />} />
              <Route path="/report"    element={<ReportPage />} />
              <Route path="/settings"  element={<SettingsPage />} />
            </Routes>
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
