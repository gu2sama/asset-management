import type { AssetClass, AccountType } from '../types';

export const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  investment_trust: '投資信託',
  domestic_etf: '国内ETF',
  foreign_etf: '海外ETF',
  domestic_stock: '国内株式',
  foreign_stock: '海外株式',
  crypto: '暗号資産',
  commodity: 'コモディティ',
  real_estate: '不動産・REIT',
  social_lending: 'ソーシャルレンディング',
  cash: '現預金',
};

export const ASSET_CLASS_COLORS: Record<AssetClass, string> = {
  investment_trust: '#6366f1',
  domestic_etf: '#0ea5e9',
  foreign_etf: '#10b981',
  domestic_stock: '#f59e0b',
  foreign_stock: '#f97316',
  crypto: '#8b5cf6',
  commodity: '#eab308',
  real_estate: '#ec4899',
  social_lending: '#14b8a6',
  cash: '#94a3b8',
};

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  nisa_growth: 'NISA（成長投資枠）',
  nisa_tsumitate: 'NISA（つみたて投資枠）',
  ideco: 'iDeCo',
  tokutei: '特定口座',
  ippan: '一般口座',
  none: '区分なし',
};
