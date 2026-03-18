import type { Asset, AssetClass, AccountType } from '../../types';

// ─────────────────────────────────────────────────
// 共通
// ─────────────────────────────────────────────────
export const CHART_COLORS = [
  '#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#f97316',
  '#8b5cf6', '#eab308', '#ec4899', '#14b8a6', '#94a3b8',
  '#ef4444', '#22c55e', '#3b82f6', '#a855f7', '#06b6d4',
  '#d946ef', '#84cc16', '#fb923c', '#38bdf8', '#34d399',
];

export function getColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}

/** 国コード → 国旗絵文字 */
export function flagEmoji(code: string): string {
  if (!code || code.length !== 2) return '🌐';
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
}

// ─────────────────────────────────────────────────
// アセットクラス別集計
// ─────────────────────────────────────────────────
export interface ClassEntry {
  key: AssetClass;
  value: number;
  ratio: number;
  color: string;
}

export function calcAssetClassData(assets: Asset[]): ClassEntry[] {
  const map = new Map<AssetClass, number>();
  for (const a of assets) {
    map.set(a.assetClass, (map.get(a.assetClass) ?? 0) + a.currentValue);
  }
  const total = assets.reduce((s, a) => s + a.currentValue, 0);
  return Array.from(map.entries())
    .map(([key, value], i) => ({ key, value, ratio: total > 0 ? value / total : 0, color: getColor(i) }))
    .sort((a, b) => b.value - a.value);
}

// ─────────────────────────────────────────────────
// 国別集計
// ─────────────────────────────────────────────────
export interface CountryEntry {
  code: string;
  name: string;
  value: number;
  ratio: number;
  isEstimated: boolean;
  color: string;
}

const DIRECT_COUNTRY: Partial<Record<AssetClass, { code: string; name: string }>> = {
  domestic_stock: { code: 'JP', name: '日本' },
  domestic_etf:   { code: 'JP', name: '日本' },
  cash:           { code: 'JP', name: '日本' },
  real_estate:    { code: 'JP', name: '日本' },
  social_lending: { code: 'JP', name: '日本' },
};

const CURRENCY_FALLBACK: Record<string, { code: string; name: string }> = {
  USD: { code: 'US', name: 'アメリカ' },
  EUR: { code: 'EU', name: 'ユーロ圏' },
  GBP: { code: 'GB', name: 'イギリス' },
  AUD: { code: 'AU', name: 'オーストラリア' },
  JPY: { code: 'JP', name: '日本' },
};

export function calcCountryData(assets: Asset[]): { entries: CountryEntry[]; hasEstimated: boolean } {
  const map = new Map<string, { name: string; value: number; isEstimated: boolean }>();
  let hasEstimated = false;

  const add = (code: string, name: string, value: number, estimated: boolean) => {
    const prev = map.get(code);
    map.set(code, {
      name,
      value: (prev?.value ?? 0) + value,
      isEstimated: estimated || (prev?.isEstimated ?? false),
    });
    if (estimated) hasEstimated = true;
  };

  for (const a of assets) {
    // 直接保有（国内株・ETF・現預金等）
    const direct = DIRECT_COUNTRY[a.assetClass];
    if (direct) {
      add(direct.code, direct.name, a.currentValue, false);
      continue;
    }
    // AI分析があれば按分
    if (a.aiAnalysis?.estimatedCountries?.length) {
      for (const c of a.aiAnalysis.estimatedCountries) {
        add(c.code, c.country, a.currentValue * c.ratio, true);
      }
      continue;
    }
    // フォールバック：通貨から推定
    const fb = CURRENCY_FALLBACK[a.currency] ?? { code: 'XX', name: 'その他' };
    add(fb.code, fb.name, a.currentValue, true);
  }

  const total = assets.reduce((s, a) => s + a.currentValue, 0);
  const entries: CountryEntry[] = Array.from(map.entries())
    .map(([code, { name, value, isEstimated }], i) => ({
      code, name, value,
      ratio: total > 0 ? value / total : 0,
      isEstimated,
      color: getColor(i),
    }))
    .sort((a, b) => b.value - a.value);

  return { entries, hasEstimated };
}

// ─────────────────────────────────────────────────
// 通貨別集計
// ─────────────────────────────────────────────────
export interface CurrencyEntry {
  currency: string;
  value: number;
  ratio: number;
  color: string;
}

export function calcCurrencyData(assets: Asset[]): CurrencyEntry[] {
  const map = new Map<string, number>();
  for (const a of assets) {
    map.set(a.currency, (map.get(a.currency) ?? 0) + a.currentValue);
  }
  const total = assets.reduce((s, a) => s + a.currentValue, 0);
  return Array.from(map.entries())
    .map(([currency, value], i) => ({ currency, value, ratio: total > 0 ? value / total : 0, color: getColor(i) }))
    .sort((a, b) => b.value - a.value);
}

// ─────────────────────────────────────────────────
// セクター別集計
// ─────────────────────────────────────────────────
export interface SectorEntry {
  sector: string;
  value: number;
  ratio: number;
  color: string;
}

export function calcSectorData(assets: Asset[]): SectorEntry[] {
  const map = new Map<string, number>();
  for (const a of assets) {
    if (a.aiAnalysis?.estimatedSectors?.length) {
      for (const s of a.aiAnalysis.estimatedSectors) {
        map.set(s.sector, (map.get(s.sector) ?? 0) + a.currentValue * s.ratio);
      }
    }
  }
  if (map.size === 0) return [];
  const total = [...map.values()].reduce((s, v) => s + v, 0);
  return Array.from(map.entries())
    .map(([sector, value], i) => ({ sector, value, ratio: total > 0 ? value / total : 0, color: getColor(i) }))
    .sort((a, b) => b.value - a.value);
}

// ─────────────────────────────────────────────────
// 企業別集計
// ─────────────────────────────────────────────────
export interface CompanyEntry {
  company: string;
  ticker?: string;
  totalValue: number;
  ratio: number;
  directValue: number;    // 直接保有額
  indirectValue: number;  // ファンド経由額
  color: string;
}

const DIRECT_STOCK_CLASSES: AssetClass[] = ['domestic_stock', 'foreign_stock'];

export function calcCompanyData(assets: Asset[], portfolioTotal: number): CompanyEntry[] {
  const map = new Map<string, { ticker?: string; direct: number; indirect: number }>();

  const add = (company: string, ticker: string | undefined, direct: number, indirect: number) => {
    const key = ticker ?? company;
    const prev = map.get(key);
    map.set(key, {
      ticker: ticker ?? prev?.ticker,
      direct: (prev?.direct ?? 0) + direct,
      indirect: (prev?.indirect ?? 0) + indirect,
    });
  };

  for (const a of assets) {
    if (DIRECT_STOCK_CLASSES.includes(a.assetClass)) {
      // 直接保有株式
      add(a.name, a.ticker, a.currentValue, 0);
    } else if (a.aiAnalysis?.estimatedTopHoldings?.length) {
      // ファンド経由
      for (const h of a.aiAnalysis.estimatedTopHoldings) {
        add(h.company, h.ticker, 0, a.currentValue * h.ratio);
      }
    }
  }

  const total = portfolioTotal > 0 ? portfolioTotal : 1;
  return Array.from(map.entries())
    .map(([company, { ticker, direct, indirect }], i) => ({
      company,
      ticker,
      totalValue: direct + indirect,
      ratio: (direct + indirect) / total,
      directValue: direct,
      indirectValue: indirect,
      color: getColor(i),
    }))
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 20);
}

// ─────────────────────────────────────────────────
// 口座区分別集計
// ─────────────────────────────────────────────────
export interface AccountEntry {
  key: AccountType;
  value: number;
  ratio: number;
  color: string;
}

export function calcAccountData(assets: Asset[]): AccountEntry[] {
  const map = new Map<AccountType, number>();
  for (const a of assets) {
    map.set(a.account, (map.get(a.account) ?? 0) + a.currentValue);
  }
  const total = assets.reduce((s, a) => s + a.currentValue, 0);
  const ORDER: AccountType[] = ['nisa_growth', 'nisa_tsumitate', 'ideco', 'tokutei', 'ippan', 'none'];
  const COLORS: Record<AccountType, string> = {
    nisa_growth:   '#6366f1',
    nisa_tsumitate:'#0ea5e9',
    ideco:         '#10b981',
    tokutei:       '#f59e0b',
    ippan:         '#94a3b8',
    none:          '#475569',
  };
  return ORDER.filter((k) => map.has(k)).map((key) => ({
    key,
    value: map.get(key)!,
    ratio: total > 0 ? map.get(key)! / total : 0,
    color: COLORS[key],
  }));
}
