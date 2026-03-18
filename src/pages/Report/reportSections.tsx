import type { Asset, AppSettings } from '../../types';
import type { PortfolioMetrics } from '../../hooks/usePortfolioSummary';
import type { TaxSimulatorResult } from '../../hooks/useTaxSimulator';
import { ASSET_CLASS_LABELS, ASSET_CLASS_COLORS, ACCOUNT_TYPE_LABELS } from '../../constants/labels';
import { getCurrentTier, calcFireNeeds, WEALTH_TIERS } from '../FirePlan/fireUtils';
import { calcDividendBreakdown, calcMonthlyCalendar } from '../Dividend/dividendUtils';
import { projectValue } from '../FutureProjection/projectionUtils';

// ─────────────────────────────────────────────────
// ヘルパー
// ─────────────────────────────────────────────────
export function fmtYen(n: number, hide = false): string {
  if (hide) {
    const abs = Math.abs(n);
    if (abs >= 1e8) return '**.** 億円';
    if (abs >= 10000) return '****万円';
    return '****円';
  }
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (abs >= 1e8) return `${sign}${(abs / 1e8).toFixed(2)}億円`;
  if (abs >= 10000) return `${sign}¥${Math.round(abs / 10000).toLocaleString()}万円`;
  return `${sign}¥${Math.round(abs).toLocaleString()}`;
}

function fmtPct(r: number): string {
  const sign = r >= 0 ? '+' : '';
  return `${sign}${(r * 100).toFixed(2)}%`;
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

const MONTH_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

// ─────────────────────────────────────────────────
// 共通スタイル
// ─────────────────────────────────────────────────
const PAGE: React.CSSProperties = {
  width: 794,
  minHeight: 1123,
  background: '#ffffff',
  fontFamily: "'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', sans-serif",
  color: '#111827',
  position: 'relative',
  overflow: 'hidden',
  boxSizing: 'border-box',
};

const SECTION_HEADER: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#4f46e5',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: 4,
};

const H2: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  color: '#111827',
  marginBottom: 16,
  paddingBottom: 8,
  borderBottom: '2px solid #e5e7eb',
};

const TABLE: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 11,
};

const TH: React.CSSProperties = {
  background: '#f9fafb',
  color: '#374151',
  fontWeight: 600,
  padding: '6px 10px',
  textAlign: 'left',
  borderBottom: '1px solid #e5e7eb',
  fontSize: 10,
};

const TD: React.CSSProperties = {
  padding: '6px 10px',
  borderBottom: '1px solid #f3f4f6',
  color: '#374151',
  fontSize: 11,
};

// ─────────────────────────────────────────────────
// SVGドーナツチャート
// ─────────────────────────────────────────────────
function DonutChart({ data }: {
  data: { label: string; value: number; color: string }[];
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total <= 0) return <div style={{ color: '#9ca3af', fontSize: 11 }}>データなし</div>;

  const R = 60; const CX = 70; const CY = 70; const thickness = 22;
  let startAngle = -Math.PI / 2;
  const paths: React.ReactNode[] = [];

  for (const d of data) {
    const ratio = d.value / total;
    const sweep = ratio * 2 * Math.PI;
    const endAngle = startAngle + sweep;
    const x1 = CX + R * Math.cos(startAngle);
    const y1 = CY + R * Math.sin(startAngle);
    const x2 = CX + R * Math.cos(endAngle);
    const y2 = CY + R * Math.sin(endAngle);
    const ri = R - thickness;
    const xi1 = CX + ri * Math.cos(endAngle);
    const yi1 = CY + ri * Math.sin(endAngle);
    const xi2 = CX + ri * Math.cos(startAngle);
    const yi2 = CY + ri * Math.sin(startAngle);
    const large = sweep > Math.PI ? 1 : 0;
    paths.push(
      <path
        key={d.label}
        d={`M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${xi1} ${yi1} A ${ri} ${ri} 0 ${large} 0 ${xi2} ${yi2} Z`}
        fill={d.color}
      />
    );
    startAngle = endAngle;
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <svg width={140} height={140}>{paths}</svg>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {data.slice(0, 8).map((d) => (
          <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: d.color, flexShrink: 0 }} />
            <span style={{ flex: 1, color: '#374151' }}>{d.label}</span>
            <span style={{ color: '#6b7280' }}>{((d.value / total) * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// SVG横棒チャート（月別配当カレンダー用）
// ─────────────────────────────────────────────────
function MonthlyBarChart({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  const BAR_MAX_W = 320;
  const thisMonth = new Date().getMonth();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {values.map((v, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10 }}>
          <span style={{ width: 18, color: '#6b7280', textAlign: 'right' }}>{MONTH_LABELS[i]}月</span>
          <div style={{ width: BAR_MAX_W, background: '#f3f4f6', borderRadius: 3, height: 14 }}>
            <div style={{
              width: (v / max) * BAR_MAX_W,
              height: 14,
              background: i === thisMonth ? '#059669' : '#4f46e5',
              borderRadius: 3,
            }} />
          </div>
          <span style={{ color: '#374151' }}>¥{Math.round(v / 10000).toLocaleString()}万</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────
// P1: 表紙
// ─────────────────────────────────────────────────
export function CoverSection({ summary, settings, hideAmounts }: {
  summary: PortfolioMetrics;
  settings: AppSettings;
  hideAmounts: boolean;
}) {
  const tier = getCurrentTier(summary.totalValue);
  return (
    <div style={PAGE}>
      {/* 上部バナー */}
      <div style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', padding: '40px 60px 32px', color: '#fff' }}>
        <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.12em', opacity: 0.8, marginBottom: 8 }}>
          PORTFOLIO MANAGER
        </div>
        <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.2 }}>
          資産運用レポート
        </div>
        <div style={{ marginTop: 12, fontSize: 13, opacity: 0.85 }}>
          作成日: {today()}
        </div>
      </div>

      {/* 中央メインコンテンツ */}
      <div style={{ padding: '48px 60px', flex: 1 }}>
        {/* 総資産 */}
        <div style={{ textAlign: 'center', marginBottom: 40, padding: '32px 0' }}>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>総資産</div>
          <div style={{ fontSize: 44, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em' }}>
            {fmtYen(summary.totalValue, hideAmounts)}
          </div>
          <div style={{ marginTop: 8, fontSize: 13, color: summary.totalGainLoss >= 0 ? '#059669' : '#dc2626' }}>
            評価損益: {fmtYen(summary.totalGainLoss, hideAmounts)}{' '}
            ({fmtPct(summary.totalGainLossRate)})
          </div>
        </div>

        {/* 資産階級バッジ */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 40 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '12px 24px', borderRadius: 12,
            border: `2px solid ${tier.color}`,
            background: `${tier.color}15`,
          }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: tier.color }} />
            <div>
              <div style={{ fontSize: 10, color: '#6b7280' }}>野村総研分類</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: tier.color }}>{tier.label}</div>
            </div>
          </div>
        </div>

        {/* サマリー指標グリッド */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          {[
            { label: '年間配当（概算）', value: fmtYen(summary.annualDividendYen, hideAmounts), color: '#059669' },
            { label: '実効コスト率', value: `${(summary.weightedCostRate * 100).toFixed(3)}%`, color: '#f59e0b' },
            { label: '年間コスト（概算）', value: fmtYen(summary.annualCostYen, hideAmounts), color: '#6b7280' },
          ].map((m) => (
            <div key={m.label} style={{
              padding: 16, borderRadius: 10, border: '1px solid #e5e7eb', background: '#f9fafb',
            }}>
              <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 4 }}>{m.label}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: m.color }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* 保有銘柄数・口座数 */}
        <div style={{ marginTop: 24, display: 'flex', gap: 24, color: '#6b7280', fontSize: 12 }}>
          <span>保有銘柄数: <strong style={{ color: '#111827' }}>{summary.byAssetClass.length > 0 ? 'アセット' : '0'}種</strong></span>
          <span>口座区分: <strong style={{ color: '#111827' }}>{summary.byAccount.length}口座</strong></span>
          <span>設定年齢: <strong style={{ color: '#111827' }}>{settings.currentAge}歳</strong></span>
        </div>
      </div>

      {/* フッター */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '16px 60px', background: '#f9fafb',
        borderTop: '1px solid #e5e7eb',
        display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#9ca3af',
      }}>
        <span>Portfolio Manager — AI運用レポート</span>
        <span>本レポートは参考情報であり、投資助言・税務助言には該当しません</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// P2: サマリー
// ─────────────────────────────────────────────────
export function SummarySection({ summary, settings, hideAmounts }: {
  summary: PortfolioMetrics;
  settings: AppSettings;
  hideAmounts: boolean;
}) {
  const tier = getCurrentTier(summary.totalValue);
  const nextTier = WEALTH_TIERS[WEALTH_TIERS.indexOf(tier) + 1];
  const gapToNext = nextTier ? fmtYen(nextTier.min - summary.totalValue, hideAmounts) : '—';

  return (
    <div style={{ ...PAGE, padding: '48px 60px' }}>
      <div style={SECTION_HEADER}>Portfolio Summary</div>
      <div style={H2}>ポートフォリオ サマリー</div>

      {/* 主要指標 2×3 グリッド */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 32 }}>
        {[
          { label: '総資産', value: fmtYen(summary.totalValue, hideAmounts), color: '#4f46e5', large: true },
          { label: '評価損益', value: fmtYen(summary.totalGainLoss, hideAmounts), color: summary.totalGainLoss >= 0 ? '#059669' : '#dc2626', large: true },
          { label: '損益率', value: fmtPct(summary.totalGainLossRate), color: summary.totalGainLossRate >= 0 ? '#059669' : '#dc2626', large: false },
          { label: '年間配当（概算）', value: fmtYen(summary.annualDividendYen, hideAmounts), color: '#059669', large: false },
          { label: '実効コスト率', value: `${(summary.weightedCostRate * 100).toFixed(3)}%/年`, color: '#f59e0b', large: false },
          { label: '年間コスト（概算）', value: fmtYen(summary.annualCostYen, hideAmounts), color: '#6b7280', large: false },
        ].map((m) => (
          <div key={m.label} style={{
            padding: '14px 16px', borderRadius: 8, border: '1px solid #e5e7eb',
            background: '#fafafa',
          }}>
            <div style={{ fontSize: 9, color: '#9ca3af', marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: m.large ? 18 : 14, fontWeight: 700, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* 口座区分別内訳 */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: '#374151' }}>口座区分別内訳</div>
        <table style={TABLE}>
          <thead>
            <tr>
              <th style={TH}>口座区分</th>
              <th style={{ ...TH, textAlign: 'right' }}>評価額</th>
              <th style={{ ...TH, textAlign: 'right' }}>比率</th>
              <th style={{ ...TH, textAlign: 'right' }}>比率グラフ</th>
            </tr>
          </thead>
          <tbody>
            {summary.byAccount.map((a) => (
              <tr key={a.account}>
                <td style={TD}>{ACCOUNT_TYPE_LABELS[a.account]}</td>
                <td style={{ ...TD, textAlign: 'right', fontWeight: 600 }}>{fmtYen(a.value, hideAmounts)}</td>
                <td style={{ ...TD, textAlign: 'right' }}>{(a.ratio * 100).toFixed(1)}%</td>
                <td style={{ ...TD }}>
                  <div style={{ width: 120, background: '#f3f4f6', borderRadius: 3, height: 10 }}>
                    <div style={{ width: a.ratio * 120, height: 10, background: '#4f46e5', borderRadius: 3 }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FIRE・資産階級 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ padding: 16, border: '1px solid #e5e7eb', borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>資産階級</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: tier.color }}>{tier.label}</div>
          {nextTier && (
            <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>
              次の階級まで {gapToNext}
            </div>
          )}
        </div>
        <div style={{ padding: 16, border: '1px solid #e5e7eb', borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>FIRE目標</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>{fmtYen(settings.targetAmount, hideAmounts)}</div>
          <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>
            達成率 {Math.min((summary.totalValue / (settings.targetAmount || 1)) * 100, 999).toFixed(1)}%
          </div>
        </div>
      </div>

      <PageFooter page={2} />
    </div>
  );
}

// ─────────────────────────────────────────────────
// P3: ポートフォリオ構成（チャート）
// ─────────────────────────────────────────────────
export function PortfolioChartSection({ summary }: {
  summary: PortfolioMetrics;
}) {
  const assetData = summary.byAssetClass.map((a) => ({
    label: ASSET_CLASS_LABELS[a.assetClass],
    value: a.value,
    color: ASSET_CLASS_COLORS[a.assetClass],
  }));

  const countryData = summary.byCountry.slice(0, 8).map((c, i) => ({
    label: c.country,
    value: c.value,
    color: ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#f97316', '#8b5cf6', '#ec4899', '#6b7280'][i] ?? '#6b7280',
  }));

  return (
    <div style={{ ...PAGE, padding: '48px 60px' }}>
      <div style={SECTION_HEADER}>Portfolio Allocation</div>
      <div style={H2}>ポートフォリオ構成</div>

      {/* アセットクラス別 */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: '#374151' }}>アセットクラス別</div>
        <DonutChart data={assetData} />
      </div>

      {/* 国別 */}
      {countryData.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: '#374151' }}>地域別（AI分析ベース）</div>
          <DonutChart data={countryData} />
        </div>
      )}

      {/* セクター別 */}
      {summary.bySector.length > 0 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: '#374151' }}>セクター別（AI分析ベース）</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {summary.bySector.slice(0, 10).map((s, i) => {
              const colors = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#f97316', '#8b5cf6', '#ec4899', '#14b8a6', '#eab308', '#64748b'];
              return (
                <div key={s.sector} style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '4px 10px', borderRadius: 20,
                  background: `${colors[i % colors.length]}15`,
                  border: `1px solid ${colors[i % colors.length]}40`,
                  fontSize: 10, color: '#374151',
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: colors[i % colors.length] }} />
                  {s.sector} {(s.ratio * 100).toFixed(1)}%
                </div>
              );
            })}
          </div>
        </div>
      )}

      <PageFooter page={3} />
    </div>
  );
}

// ─────────────────────────────────────────────────
// P4: 銘柄別上位10社
// ─────────────────────────────────────────────────
export function PortfolioDetailSection({ assets, summary, hideAmounts }: {
  assets: Asset[];
  summary: PortfolioMetrics;
  hideAmounts: boolean;
}) {
  const top10 = [...assets].sort((a, b) => b.currentValue - a.currentValue).slice(0, 10);

  // AI分析から上位保有企業を集計
  const companyMap = new Map<string, number>();
  for (const a of assets) {
    if (a.aiAnalysis?.estimatedTopHoldings) {
      for (const h of a.aiAnalysis.estimatedTopHoldings) {
        companyMap.set(h.company, (companyMap.get(h.company) ?? 0) + a.currentValue * h.ratio);
      }
    }
  }
  const topCompanies = [...companyMap.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  return (
    <div style={{ ...PAGE, padding: '48px 60px' }}>
      <div style={SECTION_HEADER}>Holdings Detail</div>
      <div style={H2}>保有銘柄 上位10</div>

      <table style={TABLE}>
        <thead>
          <tr>
            <th style={{ ...TH, width: 24 }}>#</th>
            <th style={TH}>銘柄名</th>
            <th style={TH}>口座</th>
            <th style={TH}>種別</th>
            <th style={{ ...TH, textAlign: 'right' }}>評価額</th>
            <th style={{ ...TH, textAlign: 'right' }}>比率</th>
            <th style={{ ...TH, textAlign: 'right' }}>損益</th>
          </tr>
        </thead>
        <tbody>
          {top10.map((a, i) => {
            const gainLoss = a.acquisitionPrice !== undefined ? a.currentValue - a.acquisitionPrice : null;
            const ratio = summary.totalValue > 0 ? a.currentValue / summary.totalValue : 0;
            return (
              <tr key={a.id}>
                <td style={{ ...TD, color: '#9ca3af' }}>{i + 1}</td>
                <td style={{ ...TD, fontWeight: 500 }}>{a.name}</td>
                <td style={{ ...TD, fontSize: 9, color: '#6b7280' }}>{ACCOUNT_TYPE_LABELS[a.account]}</td>
                <td style={{ ...TD, fontSize: 9, color: '#6b7280' }}>{ASSET_CLASS_LABELS[a.assetClass]}</td>
                <td style={{ ...TD, textAlign: 'right', fontWeight: 600 }}>{fmtYen(a.currentValue, hideAmounts)}</td>
                <td style={{ ...TD, textAlign: 'right' }}>{(ratio * 100).toFixed(1)}%</td>
                <td style={{ ...TD, textAlign: 'right', color: gainLoss === null ? '#9ca3af' : gainLoss >= 0 ? '#059669' : '#dc2626' }}>
                  {gainLoss !== null ? fmtYen(gainLoss, hideAmounts) : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {topCompanies.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: '#374151' }}>
            推定主要保有企業 TOP10（AI分析ベース）
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {topCompanies.map(([company, value], i) => (
              <div key={company} style={{
                padding: '4px 10px', borderRadius: 20,
                background: i === 0 ? '#4f46e515' : '#f3f4f6',
                border: `1px solid ${i === 0 ? '#4f46e5' : '#e5e7eb'}`,
                fontSize: 10, color: '#374151',
              }}>
                {i + 1}. {company} （{fmtYen(value, hideAmounts)}）
              </div>
            ))}
          </div>
        </div>
      )}

      <PageFooter page={4} />
    </div>
  );
}

// ─────────────────────────────────────────────────
// P5: コスト分析
// ─────────────────────────────────────────────────
export function CostSection({ assets, summary, hideAmounts }: {
  assets: Asset[];
  summary: PortfolioMetrics;
  hideAmounts: boolean;
}) {
  const withCost = assets
    .filter((a) => a.annualCostRate !== undefined && a.annualCostRate > 0)
    .sort((a, b) => (b.annualCostRate ?? 0) - (a.annualCostRate ?? 0));

  const THRESHOLD = 0.005; // 0.5%を割高とみなす
  const expensiveAssets = withCost.filter((a) => (a.annualCostRate ?? 0) >= THRESHOLD);
  const potentialSaving = expensiveAssets.reduce((s, a) => {
    return s + ((a.annualCostRate ?? 0) - 0.001) * a.currentValue;
  }, 0);

  return (
    <div style={{ ...PAGE, padding: '48px 60px' }}>
      <div style={SECTION_HEADER}>Cost Analysis</div>
      <div style={H2}>コスト分析</div>

      {/* 概要 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
        <div style={{ padding: '14px 16px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fafafa' }}>
          <div style={{ fontSize: 9, color: '#9ca3af', marginBottom: 4 }}>加重平均コスト率</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#f59e0b' }}>
            {(summary.weightedCostRate * 100).toFixed(3)}%/年
          </div>
        </div>
        <div style={{ padding: '14px 16px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fafafa' }}>
          <div style={{ fontSize: 9, color: '#9ca3af', marginBottom: 4 }}>年間コスト総額（概算）</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#f97316' }}>
            {fmtYen(summary.annualCostYen, hideAmounts)}
          </div>
        </div>
        <div style={{ padding: '14px 16px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fafafa' }}>
          <div style={{ fontSize: 9, color: '#9ca3af', marginBottom: 4 }}>改善余地（概算）</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#059669' }}>
            {fmtYen(potentialSaving, hideAmounts)}/年
          </div>
        </div>
      </div>

      {/* 銘柄別コスト一覧 */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: '#374151' }}>
          銘柄別コスト一覧（コスト率の高い順）
        </div>
        <table style={TABLE}>
          <thead>
            <tr>
              <th style={TH}>銘柄名</th>
              <th style={{ ...TH, textAlign: 'right' }}>信託報酬</th>
              <th style={{ ...TH, textAlign: 'right' }}>評価額</th>
              <th style={{ ...TH, textAlign: 'right' }}>年間コスト</th>
              <th style={{ ...TH, textAlign: 'center' }}>評価</th>
            </tr>
          </thead>
          <tbody>
            {withCost.map((a) => {
              const rate = a.annualCostRate ?? 0;
              const annualCost = rate * a.currentValue;
              const isExpensive = rate >= THRESHOLD;
              return (
                <tr key={a.id} style={{ background: isExpensive ? '#fef3c710' : undefined }}>
                  <td style={{ ...TD, fontWeight: 500 }}>{a.name}</td>
                  <td style={{ ...TD, textAlign: 'right', color: isExpensive ? '#f59e0b' : '#374151', fontWeight: isExpensive ? 600 : 400 }}>
                    {(rate * 100).toFixed(3)}%
                  </td>
                  <td style={{ ...TD, textAlign: 'right' }}>{fmtYen(a.currentValue, hideAmounts)}</td>
                  <td style={{ ...TD, textAlign: 'right' }}>{fmtYen(annualCost, hideAmounts)}</td>
                  <td style={{ ...TD, textAlign: 'center', fontSize: 10 }}>
                    {isExpensive ? (
                      <span style={{ color: '#f59e0b', background: '#fef3c7', padding: '2px 6px', borderRadius: 10 }}>割高</span>
                    ) : (
                      <span style={{ color: '#059669', background: '#d1fae5', padding: '2px 6px', borderRadius: 10 }}>適正</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {expensiveAssets.length > 0 && (
        <div style={{ padding: 14, background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 8, fontSize: 11 }}>
          <strong>💡 改善提案:</strong> 信託報酬0.5%以上の銘柄 {expensiveAssets.length}本 を低コスト代替品に乗り換えた場合、
          年間最大 {fmtYen(potentialSaving, hideAmounts)} のコスト削減が見込まれます。
        </div>
      )}

      <PageFooter page={5} />
    </div>
  );
}

// ─────────────────────────────────────────────────
// P6: 将来予測
// ─────────────────────────────────────────────────
export function FutureSection({ summary, settings, hideAmounts }: {
  summary: PortfolioMetrics;
  settings: AppSettings;
  hideAmounts: boolean;
}) {
  const YEARS = [1, 5, 10, 20, 30];
  const rates = { pessimistic: 0.02, neutral: 0.05, optimistic: 0.08 };
  const monthly = settings.monthlyInvestment;
  const base = summary.totalValue;
  const effectiveCost = summary.weightedCostRate;

  const rows = YEARS.map((y) => ({
    year: y,
    pessimistic: projectValue(base, rates.pessimistic - effectiveCost, y, monthly),
    neutral: projectValue(base, rates.neutral - effectiveCost, y, monthly),
    optimistic: projectValue(base, rates.optimistic - effectiveCost, y, monthly),
  }));

  // ビジュアルバー用（30年後の楽観シナリオが最大）
  const maxVal = rows[rows.length - 1].optimistic;

  return (
    <div style={{ ...PAGE, padding: '48px 60px' }}>
      <div style={SECTION_HEADER}>Future Projection</div>
      <div style={H2}>将来予測（積立シミュレーション）</div>

      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 20 }}>
        現在資産: {fmtYen(base, hideAmounts)} ／ 月次積立: {fmtYen(monthly, hideAmounts)}
        ／ コスト控除後実質リターン（中立シナリオ）: {((rates.neutral - effectiveCost) * 100).toFixed(2)}%
      </div>

      {/* 数値テーブル */}
      <table style={{ ...TABLE, marginBottom: 28 }}>
        <thead>
          <tr>
            <th style={TH}>年数</th>
            <th style={{ ...TH, textAlign: 'right', color: '#f97316' }}>悲観（年2%）</th>
            <th style={{ ...TH, textAlign: 'right', color: '#4f46e5' }}>中立（年5%）</th>
            <th style={{ ...TH, textAlign: 'right', color: '#059669' }}>楽観（年8%）</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.year}>
              <td style={{ ...TD, fontWeight: 500 }}>{r.year}年後 ({new Date().getFullYear() + r.year}年)</td>
              <td style={{ ...TD, textAlign: 'right', color: '#f97316' }}>{fmtYen(r.pessimistic, hideAmounts)}</td>
              <td style={{ ...TD, textAlign: 'right', color: '#4f46e5', fontWeight: 600 }}>{fmtYen(r.neutral, hideAmounts)}</td>
              <td style={{ ...TD, textAlign: 'right', color: '#059669' }}>{fmtYen(r.optimistic, hideAmounts)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ビジュアルバーチャート */}
      {!hideAmounts && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12, color: '#374151' }}>シナリオ別 将来資産推移</div>
          {rows.map((r) => (
            <div key={r.year} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 3 }}>{r.year}年後</div>
              {[
                { label: '悲観', value: r.pessimistic, color: '#f97316' },
                { label: '中立', value: r.neutral, color: '#4f46e5' },
                { label: '楽観', value: r.optimistic, color: '#059669' },
              ].map((s) => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ width: 24, fontSize: 9, color: '#9ca3af' }}>{s.label}</span>
                  <div style={{ width: 400, background: '#f3f4f6', borderRadius: 3, height: 12 }}>
                    <div style={{ width: (s.value / maxVal) * 400, height: 12, background: s.color, borderRadius: 3 }} />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <PageFooter page={6} />
    </div>
  );
}

// ─────────────────────────────────────────────────
// P7: FIRE・ライフプラン
// ─────────────────────────────────────────────────
export function FireSection({ summary, settings, hideAmounts }: {
  summary: PortfolioMetrics;
  settings: AppSettings;
  hideAmounts: boolean;
}) {
  const tier = getCurrentTier(summary.totalValue);
  const fireNeeds = calcFireNeeds(
    settings.monthlyExpense,
    settings.pensionMonthly,
    settings.idecoMonthly ?? 0,
    settings.rentalMonthly ?? 0,
    settings.sideIncomeMonthly ?? 0,
  );
  const progressFull = Math.min(summary.totalValue / (fireNeeds.fullFire || 1), 1);
  const progressSide = Math.min(summary.totalValue / (fireNeeds.sideFire || 1), 1);

  const currentTierIdx = WEALTH_TIERS.indexOf(tier);

  return (
    <div style={{ ...PAGE, padding: '48px 60px' }}>
      <div style={SECTION_HEADER}>FIRE &amp; Life Plan</div>
      <div style={H2}>FIRE・ライフプラン</div>

      {/* 資産階級プログレス */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12, color: '#374151' }}>野村総研 資産階級（純金融資産）</div>
        <div style={{ display: 'flex', gap: 0, height: 20, borderRadius: 10, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
          {WEALTH_TIERS.map((t) => (
            <div
              key={t.key}
              title={t.label}
              style={{
                flex: 1, background: t.color,
                opacity: currentTierIdx >= WEALTH_TIERS.indexOf(t) ? 1 : 0.25,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 8, color: '#fff', fontWeight: 600,
              }}
            >
              {t.label.slice(0, 4)}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#9ca3af', marginTop: 3 }}>
          <span>¥0</span><span>3,000万</span><span>5,000万</span><span>1億</span><span>5億</span>
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: tier.color, fontWeight: 700 }}>
          現在: {tier.label}（{fmtYen(summary.totalValue, hideAmounts)}）
        </div>
      </div>

      {/* FIRE目標 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'フルFIRE（4%ルール）', target: fireNeeds.fullFire, progress: progressFull, monthly: fireNeeds.fullFireMonthlyDrawdown, color: '#4f46e5' },
          { label: 'サイドFIRE（副業月15万）', target: fireNeeds.sideFire, progress: progressSide, monthly: fireNeeds.sideFireMonthlyDrawdown, color: '#059669' },
        ].map((f) => (
          <div key={f.label} style={{ padding: 16, border: `1px solid ${f.color}40`, borderRadius: 8, background: `${f.color}08` }}>
            <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 4 }}>{f.label}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: f.color }}>{fmtYen(f.target, hideAmounts)}</div>
            <div style={{ marginTop: 8, width: '100%', background: '#e5e7eb', borderRadius: 6, height: 10, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(f.progress * 100, 100)}%`, height: 10, background: f.color, borderRadius: 6 }} />
            </div>
            <div style={{ marginTop: 4, fontSize: 10, color: '#6b7280' }}>達成率 {(f.progress * 100).toFixed(1)}%</div>
            <div style={{ fontSize: 10, color: '#9ca3af' }}>月次取り崩し目標: {fmtYen(f.monthly, hideAmounts)}</div>
          </div>
        ))}
      </div>

      {/* 設定情報 */}
      <table style={TABLE}>
        <tbody>
          {[
            ['現在年齢', `${settings.currentAge}歳`],
            ['FIRE目標年齢', `${settings.targetAge}歳`],
            ['月次生活費', fmtYen(settings.monthlyExpense, hideAmounts)],
            ['月次積立', fmtYen(settings.monthlyInvestment, hideAmounts)],
            ['年金（月額）', fmtYen(settings.pensionMonthly, hideAmounts)],
          ].map(([label, value]) => (
            <tr key={label}>
              <td style={{ ...TD, color: '#6b7280', width: 180 }}>{label}</td>
              <td style={{ ...TD, fontWeight: 500 }}>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <PageFooter page={7} />
    </div>
  );
}

// ─────────────────────────────────────────────────
// P8: 配当・インカム分析
// ─────────────────────────────────────────────────
export function DividendSection({ assets, summary, settings, hideAmounts }: {
  assets: Asset[];
  summary: PortfolioMetrics;
  settings: AppSettings;
  hideAmounts: boolean;
}) {
  const breakdown = calcDividendBreakdown(assets, summary.totalValue);
  const calendar = calcMonthlyCalendar(assets);
  const requiredAnnual = settings.monthlyExpense * 12;
  const coverageRatio = requiredAnnual > 0 ? breakdown.totalAfterTax / requiredAnnual : 0;

  return (
    <div style={{ ...PAGE, padding: '48px 60px' }}>
      <div style={SECTION_HEADER}>Dividend &amp; Income</div>
      <div style={H2}>配当・インカム分析</div>

      {/* 配当サマリー */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
        {[
          { label: '年間配当（税引前）', value: fmtYen(breakdown.totalAnnual, hideAmounts), color: '#374151' },
          { label: '年間配当（税引後）', value: fmtYen(breakdown.totalAfterTax, hideAmounts), color: '#059669' },
          { label: 'ポートフォリオ利回り', value: `${(breakdown.portfolioYield * 100).toFixed(2)}%`, color: '#4f46e5' },
          { label: 'NISA口座（非課税）', value: fmtYen(breakdown.nisaAnnual, hideAmounts), color: '#0ea5e9' },
          { label: '課税口座（税引前）', value: fmtYen(breakdown.taxableAnnual, hideAmounts), color: '#f59e0b' },
          { label: '月平均配当（税引後）', value: fmtYen(breakdown.totalAfterTax / 12, hideAmounts), color: '#374151' },
        ].map((m) => (
          <div key={m.label} style={{ padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fafafa' }}>
            <div style={{ fontSize: 9, color: '#9ca3af', marginBottom: 3 }}>{m.label}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* 配当生活達成率 */}
      <div style={{ padding: 16, border: '1px solid #4f46e5', borderRadius: 8, background: '#f0f0ff', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>配当生活達成率</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#4f46e5' }}>{(coverageRatio * 100).toFixed(1)}%</div>
        </div>
        <div style={{ width: '100%', background: '#e5e7eb', borderRadius: 6, height: 12, overflow: 'hidden' }}>
          <div style={{ width: `${Math.min(coverageRatio * 100, 100)}%`, height: 12, background: '#4f46e5', borderRadius: 6 }} />
        </div>
        <div style={{ marginTop: 6, fontSize: 10, color: '#6b7280' }}>
          年間生活費 {fmtYen(requiredAnnual, hideAmounts)} に対して 税引後配当 {fmtYen(breakdown.totalAfterTax, hideAmounts)}
        </div>
      </div>

      {/* 月別配当カレンダー */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, color: '#374151' }}>月別配当カレンダー（予測）</div>
        <MonthlyBarChart values={calendar} />
      </div>

      <PageFooter page={8} />
    </div>
  );
}

// ─────────────────────────────────────────────────
// P9: 税務サマリー
// ─────────────────────────────────────────────────
export function TaxSection({ taxResult, hideAmounts }: {
  taxResult: TaxSimulatorResult;
  hideAmounts: boolean;
}) {
  const TAX_RATE = 0.20315;

  return (
    <div style={{ ...PAGE, padding: '48px 60px' }}>
      <div style={SECTION_HEADER}>Tax Summary</div>
      <div style={H2}>税務サマリー</div>

      {/* 含み損益サマリー */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
        {[
          { label: '課税口座 含み益', value: fmtYen(taxResult.totalGain, hideAmounts), color: '#059669' },
          { label: '課税口座 含み損', value: '−' + fmtYen(taxResult.totalLoss, hideAmounts), color: '#dc2626' },
          { label: '概算税額（現時点）', value: fmtYen(taxResult.estimatedTax, hideAmounts), color: '#f59e0b' },
          { label: 'NISA含み益（非課税）', value: fmtYen(taxResult.nisaUnrealizedGain, hideAmounts), color: '#0ea5e9' },
          { label: '損出し節税余地', value: fmtYen(taxResult.harvesting.estimatedTaxSaving, hideAmounts), color: '#059669' },
          { label: '純損益（課税口座）', value: fmtYen(taxResult.netGainLoss, hideAmounts), color: taxResult.netGainLoss >= 0 ? '#374151' : '#dc2626' },
        ].map((m) => (
          <div key={m.label} style={{ padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fafafa' }}>
            <div style={{ fontSize: 9, color: '#9ca3af', marginBottom: 3 }}>{m.label}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* 損出し対象銘柄 */}
      {taxResult.harvesting.lossAssets.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: '#374151' }}>
            損出し候補銘柄（損失大きい順）
          </div>
          <table style={TABLE}>
            <thead>
              <tr>
                <th style={TH}>銘柄名</th>
                <th style={{ ...TH, textAlign: 'right' }}>含み損</th>
                <th style={{ ...TH, textAlign: 'right' }}>節税効果</th>
              </tr>
            </thead>
            <tbody>
              {taxResult.harvesting.lossAssets.slice(0, 5).map((g) => (
                <tr key={g.assetId}>
                  <td style={TD}>{g.assetName}</td>
                  <td style={{ ...TD, textAlign: 'right', color: '#dc2626' }}>{fmtYen(g.gainLoss, hideAmounts)}</td>
                  <td style={{ ...TD, textAlign: 'right', color: '#059669' }}>
                    {fmtYen(Math.abs(g.gainLoss) * TAX_RATE, hideAmounts)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 含み益銘柄（NISA移行候補） */}
      {taxResult.harvesting.gainAssets.length > 0 && (
        <div style={{ padding: 14, background: '#f0fdf4', border: '1px solid #059669', borderRadius: 8, fontSize: 11 }}>
          <strong>💡 NISA移行推奨:</strong> 含み益のある銘柄のうち、NISA枠に余裕がある場合は
          特定口座からNISA口座への移行（売却→買い直し）で将来の税負担を軽減できます。<br />
          特に長期保有・高配当銘柄は移行効果が大きくなります。
        </div>
      )}

      <PageFooter page={9} />
    </div>
  );
}

// ─────────────────────────────────────────────────
// P10: 保有資産明細（全銘柄）
// ─────────────────────────────────────────────────
export function AssetDetailSection({ assets, summary, hideAmounts }: {
  assets: Asset[];
  summary: PortfolioMetrics;
  hideAmounts: boolean;
}) {
  const sorted = [...assets].sort((a, b) => b.currentValue - a.currentValue);
  const MAX_ROWS = 25;
  const shown = sorted.slice(0, MAX_ROWS);

  return (
    <div style={{ ...PAGE, padding: '48px 60px' }}>
      <div style={SECTION_HEADER}>Asset Detail</div>
      <div style={H2}>保有資産 明細一覧</div>

      <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 12 }}>
        全{assets.length}銘柄 ／ 総資産 {fmtYen(summary.totalValue, hideAmounts)}
        {assets.length > MAX_ROWS && `（表示: 上位${MAX_ROWS}銘柄）`}
      </div>

      <table style={{ ...TABLE, fontSize: 10 }}>
        <thead>
          <tr>
            <th style={{ ...TH, fontSize: 9 }}>銘柄名</th>
            <th style={{ ...TH, fontSize: 9 }}>口座</th>
            <th style={{ ...TH, fontSize: 9 }}>種別</th>
            <th style={{ ...TH, textAlign: 'right', fontSize: 9 }}>評価額</th>
            <th style={{ ...TH, textAlign: 'right', fontSize: 9 }}>比率</th>
            <th style={{ ...TH, textAlign: 'right', fontSize: 9 }}>損益</th>
            <th style={{ ...TH, textAlign: 'right', fontSize: 9 }}>信託報酬</th>
            <th style={{ ...TH, textAlign: 'right', fontSize: 9 }}>配当利回り</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((a) => {
            const gainLoss = a.acquisitionPrice !== undefined ? a.currentValue - a.acquisitionPrice : null;
            const ratio = summary.totalValue > 0 ? a.currentValue / summary.totalValue : 0;
            return (
              <tr key={a.id}>
                <td style={{ ...TD, fontSize: 10, fontWeight: 500, maxWidth: 160, overflow: 'hidden' }}>{a.name}</td>
                <td style={{ ...TD, fontSize: 8, color: '#6b7280' }}>
                  {ACCOUNT_TYPE_LABELS[a.account].replace('NISA（', 'NISA(').replace('）', ')')}
                </td>
                <td style={{ ...TD, fontSize: 8, color: '#6b7280' }}>
                  {ASSET_CLASS_LABELS[a.assetClass].slice(0, 4)}
                </td>
                <td style={{ ...TD, textAlign: 'right', fontSize: 10 }}>{fmtYen(a.currentValue, hideAmounts)}</td>
                <td style={{ ...TD, textAlign: 'right', fontSize: 10 }}>{(ratio * 100).toFixed(1)}%</td>
                <td style={{ ...TD, textAlign: 'right', fontSize: 10, color: gainLoss === null ? '#9ca3af' : gainLoss >= 0 ? '#059669' : '#dc2626' }}>
                  {gainLoss !== null ? fmtYen(gainLoss, hideAmounts) : '—'}
                </td>
                <td style={{ ...TD, textAlign: 'right', fontSize: 10 }}>
                  {a.annualCostRate !== undefined ? `${(a.annualCostRate * 100).toFixed(3)}%` : '—'}
                </td>
                <td style={{ ...TD, textAlign: 'right', fontSize: 10 }}>
                  {a.dividendYield !== undefined ? `${(a.dividendYield * 100).toFixed(2)}%` : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <PageFooter page={10} />
    </div>
  );
}

// ─────────────────────────────────────────────────
// P11: AI運用戦略コメント
// ─────────────────────────────────────────────────
export function AiCommentSection({ comment, status }: {
  comment: string;
  status: 'idle' | 'loading' | 'done' | 'error';
}) {
  const sections = comment
    ? comment.split(/\n(?=\d\.\s)/)
    : [];

  return (
    <div style={{ ...PAGE, padding: '48px 60px' }}>
      <div style={SECTION_HEADER}>AI Strategy Comment</div>
      <div style={H2}>AI 運用戦略コメント</div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20,
        padding: '8px 12px', background: '#f0f0ff', borderRadius: 8,
        fontSize: 10, color: '#4f46e5', border: '1px solid #c7d2fe',
      }}>
        <span>🤖</span>
        <span>Claude AIによるポートフォリオ分析レポートです。投資助言・税務助言には該当しません。</span>
      </div>

      {status === 'loading' && (
        <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
          <div style={{ fontSize: 14 }}>AIコメントを生成中です…</div>
        </div>
      )}

      {status === 'error' && (
        <div style={{ padding: 16, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, color: '#dc2626', fontSize: 12 }}>
          AIコメントの生成に失敗しました。APIキーを設定して再度お試しください。
        </div>
      )}

      {(status === 'idle') && (
        <div style={{ padding: 16, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, color: '#6b7280', fontSize: 12 }}>
          このセクションにはAI生成コメントが入ります。レポート生成時にAPIキーが設定されている場合は自動生成されます。
        </div>
      )}

      {status === 'done' && sections.length > 0 && sections.map((sec, i) => {
        const lines = sec.trim().split('\n');
        const heading = lines[0];
        const body = lines.slice(1).join('\n').trim();
        return (
          <div key={i} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#4f46e5', marginBottom: 6 }}>{heading}</div>
            <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.8 }}>{body}</div>
          </div>
        );
      })}

      {status === 'done' && sections.length === 0 && comment && (
        <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.9, whiteSpace: 'pre-line' }}>
          {comment}
        </div>
      )}

      <PageFooter page={11} />
    </div>
  );
}

// ─────────────────────────────────────────────────
// P12: 免責事項
// ─────────────────────────────────────────────────
export function DisclaimerSection() {
  return (
    <div style={{ ...PAGE, padding: '48px 60px' }}>
      <div style={SECTION_HEADER}>Disclaimer</div>
      <div style={H2}>免責事項</div>

      <div style={{ padding: 24, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 16 }}>
          本レポートに関する重要な注意事項
        </div>
        {[
          '本レポートはAIが生成した参考情報であり、投資助言・税務助言には該当しません。',
          '投資判断・税務判断はご自身の責任で行い、必要に応じて専門家（ファイナンシャルプランナー・税理士等）にご相談ください。',
          '記載されている将来予測・シミュレーション結果は、一定の前提条件に基づく試算であり、将来の投資収益を保証するものではありません。',
          '損益通算・繰越控除・NISA制度の適用については、証券会社の取引報告書または税理士にご確認ください。',
          '本レポートに含まれる税率・制度の情報は作成時点のものであり、将来変更される可能性があります。',
          '本アプリおよびレポートの利用によって生じた損害について、開発者は一切の責任を負いません。',
        ].map((text, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 12, fontSize: 12, color: '#374151', lineHeight: 1.7 }}>
            <span style={{ color: '#9ca3af', flexShrink: 0 }}>•</span>
            <span>{text}</span>
          </div>
        ))}
      </div>

      <div style={{ padding: 16, background: '#f0f0ff', borderRadius: 8, fontSize: 11, color: '#4f46e5', lineHeight: 1.7 }}>
        <strong>税金について:</strong> 税率は申告分離課税（所得税15.315%＋住民税5%）を適用しています。
        損益通算・繰越控除の利用には確定申告が必要です。iDeCo・NISAに関する詳細は金融機関または
        専門家にお問い合わせください。
      </div>

      <div style={{ marginTop: 40, textAlign: 'center', color: '#9ca3af', fontSize: 10 }}>
        <div>Portfolio Manager — AI資産管理ツール</div>
        <div style={{ marginTop: 4 }}>作成日: {today()} ／ 本レポートは個人の資産管理の参考情報としてご活用ください</div>
      </div>

      <PageFooter page={12} />
    </div>
  );
}

// ─────────────────────────────────────────────────
// フッター（各ページ共通）
// ─────────────────────────────────────────────────
function PageFooter({ page }: { page: number }) {
  return (
    <div style={{
      position: 'absolute', bottom: 24, left: 60, right: 60,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      borderTop: '1px solid #e5e7eb', paddingTop: 10,
      fontSize: 9, color: '#9ca3af',
    }}>
      <span>Portfolio Manager — AI資産管理ツール</span>
      <span>P{page}</span>
    </div>
  );
}
