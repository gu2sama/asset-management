// ─────────────────────────────────────────────
// アセットクラス
// ─────────────────────────────────────────────
export type AssetClass =
  | 'investment_trust'  // 投資信託
  | 'domestic_etf'      // 国内ETF
  | 'foreign_etf'       // 海外ETF
  | 'domestic_stock'    // 国内個別株
  | 'foreign_stock'     // 海外個別株
  | 'crypto'            // 暗号資産
  | 'commodity'         // コモディティ
  | 'real_estate'       // 不動産・REIT
  | 'social_lending'    // ソーシャルレンディング
  | 'cash';             // 現預金

// ─────────────────────────────────────────────
// 口座区分
// ─────────────────────────────────────────────
export type AccountType =
  | 'nisa_growth'     // NISA成長投資枠
  | 'nisa_tsumitate'  // NISAつみたて投資枠
  | 'ideco'           // iDeCo
  | 'tokutei'         // 特定口座
  | 'ippan'           // 一般口座
  | 'none';           // 区分なし

export type DividendFrequency = 'monthly' | 'quarterly' | 'semiannual' | 'annual';

// ─────────────────────────────────────────────
// AI分析結果
// ─────────────────────────────────────────────
export interface AIAnalysis {
  estimatedCountries: { country: string; code: string; ratio: number }[];
  estimatedSectors: { sector: string; ratio: number }[];
  estimatedTopHoldings: { company: string; ticker?: string; ratio: number }[];
  benchmark?: string;
  confidence: 'high' | 'medium' | 'low';
  lastAnalyzed: string;
}

// ─────────────────────────────────────────────
// アセット（メイン）
// ─────────────────────────────────────────────
export interface Asset {
  id: string;
  assetClass: AssetClass;
  name: string;
  ticker?: string;
  stockCode?: string;
  currentValue: number;          // 評価額（円）
  foreignAmount?: number;        // 外貨建て保有額（USD/EUR等）
  acquisitionPrice?: number;     // 取得価格（円）
  annualCostRate?: number;       // 信託報酬・年率（0.001 = 0.1%）
  dividendYield?: number;        // 配当利回り（0.03 = 3%）
  dividendFrequency?: DividendFrequency;
  account: AccountType;
  currency: string;              // 'JPY' | 'USD' | 'EUR' etc
  memo?: string;
  createdAt: string;
  updatedAt: string;
  aiAnalysis?: AIAnalysis;
}

// ─────────────────────────────────────────────
// 月次スナップショット
// ─────────────────────────────────────────────
export interface SnapshotSummary {
  byAssetClass: Record<string, number>;
  byCountry: Record<string, number>;
  byAccount: Record<string, number>;
  totalCostRate: number;
  annualCostYen: number;
  annualDividendYen: number;
}

export interface Snapshot {
  snapshotId: string;   // 'YYYY-MM'
  date: string;
  totalValue: number;
  assets: Asset[];
  summary: SnapshotSummary;
}

// ─────────────────────────────────────────────
// 配当受取履歴
// ─────────────────────────────────────────────
export interface DividendRecord {
  id: string;
  assetId: string;
  assetName: string;
  receivedDate: string;
  amountYen: number;
  account: AccountType;
  isTaxFree: boolean;   // NISA口座は非課税
}

// ─────────────────────────────────────────────
// リバランス目標配分
// ─────────────────────────────────────────────
export interface RebalanceTarget {
  assetClass: AssetClass;
  targetRatio: number;  // 目標比率（0.60 = 60%）
  minRatio: number;     // 許容下限
  maxRatio: number;     // 許容上限
}

// ─────────────────────────────────────────────
// アプリ設定
// ─────────────────────────────────────────────
export interface AppSettings {
  apiKey: string;
  baseCurrency: string;
  riskTolerance: 'low' | 'medium' | 'high';
  monthlyInvestment: number;
  pensionMonthly: number;
  pensionStartAge: number;
  currentAge: number;
  targetAmount: number;
  targetAge: number;
  monthlyExpense: number;
  costAlertThreshold: number;
  rebalanceTargets: RebalanceTarget[];
  // 収入加味
  idecoMonthly: number;
  idecoStartAge: number;
  rentalMonthly: number;
  sideIncomeMonthly: number;
  // 為替レート（対円）
  exchangeRates: Record<string, number>;
}

// ─────────────────────────────────────────────
// 税金シミュレーター用
// ─────────────────────────────────────────────
export interface TaxableGain {
  assetId: string;
  assetName: string;
  account: AccountType;
  acquisitionPrice: number;
  currentValue: number;
  gainLoss: number;         // 含み益（+）/ 含み損（-）
  estimatedTax: number;     // 概算税額（課税口座のみ）
  isTaxable: boolean;       // 特定・一般口座のみtrue
}

export interface TaxHarvestingSuggestion {
  lossAssets: TaxableGain[];     // 損出し候補（含み損）
  gainAssets: TaxableGain[];     // 利益確定候補（含み益）
  netGainLoss: number;           // 相殺後の損益
  estimatedTaxSaving: number;    // 節税試算額
}
