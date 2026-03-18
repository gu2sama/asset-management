import type { AssetClass } from '../types';

export interface PresetAsset {
  name: string;
  ticker?: string;
  stockCode?: string;
  assetClass: AssetClass;
  currency: string;
  annualCostRate?: number;   // 小数（0.0005 = 0.05%）
  benchmark?: string;
  dividendYield?: number;
  tags: string[];            // 検索キーワード
}

export const PRESET_ASSETS: PresetAsset[] = [
  // ─── 国内人気投資信託 ────────────────────────────────
  {
    name: 'eMAXIS Slim 全世界株式（オール・カントリー）',
    assetClass: 'investment_trust',
    currency: 'JPY',
    annualCostRate: 0.000578,
    benchmark: 'MSCIオール・カントリー・ワールド・インデックス',
    tags: ['emaxis', 'slim', 'オルカン', 'allcountry', '全世界', '三菱UFJ', 'eMAXIS'],
  },
  {
    name: 'eMAXIS Slim 米国株式（S&P500）',
    assetClass: 'investment_trust',
    currency: 'JPY',
    annualCostRate: 0.000938,
    benchmark: 'S&P500',
    tags: ['emaxis', 'slim', 'sp500', 's&p500', '米国', '三菱UFJ', 'eMAXIS'],
  },
  {
    name: 'eMAXIS Slim 先進国株式インデックス',
    assetClass: 'investment_trust',
    currency: 'JPY',
    annualCostRate: 0.001023,
    benchmark: 'MSCIコクサイ・インデックス',
    tags: ['emaxis', 'slim', '先進国', 'msciコクサイ', '三菱UFJ'],
  },
  {
    name: 'eMAXIS Slim 国内株式（TOPIX）',
    assetClass: 'investment_trust',
    currency: 'JPY',
    annualCostRate: 0.00143,
    benchmark: 'TOPIX',
    tags: ['emaxis', 'slim', '国内株式', 'topix', '東証', '三菱UFJ'],
  },
  {
    name: 'eMAXIS Slim バランス（8資産均等型）',
    assetClass: 'investment_trust',
    currency: 'JPY',
    annualCostRate: 0.00143,
    benchmark: '8資産均等',
    tags: ['emaxis', 'slim', 'バランス', '8資産', '均等', '三菱UFJ'],
  },
  {
    name: 'eMAXIS Slim 新興国株式インデックス',
    assetClass: 'investment_trust',
    currency: 'JPY',
    annualCostRate: 0.001518,
    benchmark: 'MSCIエマージング・マーケット・インデックス',
    tags: ['emaxis', 'slim', '新興国', 'emerging', '三菱UFJ'],
  },
  {
    name: 'ひふみプラス',
    assetClass: 'investment_trust',
    currency: 'JPY',
    annualCostRate: 0.01078,
    benchmark: 'TOPIX',
    tags: ['ひふみ', 'hifumi', 'レオス', 'アクティブ', '国内株式'],
  },
  {
    name: '楽天・全世界株式インデックス・ファンド',
    assetClass: 'investment_trust',
    currency: 'JPY',
    annualCostRate: 0.00192,
    benchmark: 'FTSEグローバル・オールキャップ・インデックス',
    tags: ['楽天', 'vt', '全世界', '楽天VT'],
  },
  {
    name: '楽天・全米株式インデックス・ファンド',
    assetClass: 'investment_trust',
    currency: 'JPY',
    annualCostRate: 0.00162,
    benchmark: 'CRSP USトータル・マーケット・インデックス',
    tags: ['楽天', 'vti', '全米', '楽天VTI'],
  },
  {
    name: 'SBI・V・S&P500インデックス・ファンド',
    assetClass: 'investment_trust',
    currency: 'JPY',
    annualCostRate: 0.000938,
    benchmark: 'S&P500',
    tags: ['sbi', 'voo', 'sp500', 's&p500', '米国', 'SBI証券'],
  },
  // ─── 海外ETF ─────────────────────────────────────
  {
    name: 'VOO（バンガード・S&P500 ETF）',
    ticker: 'VOO',
    assetClass: 'foreign_etf',
    currency: 'USD',
    annualCostRate: 0.0003,
    benchmark: 'S&P500',
    dividendYield: 0.013,
    tags: ['voo', 'vanguard', 'sp500', 's&p500', '米国', 'バンガード'],
  },
  {
    name: 'VTI（バンガード・トータル・ストック・マーケット ETF）',
    ticker: 'VTI',
    assetClass: 'foreign_etf',
    currency: 'USD',
    annualCostRate: 0.0003,
    benchmark: 'CRSPトータル',
    dividendYield: 0.013,
    tags: ['vti', 'vanguard', '全米', 'バンガード', 'total'],
  },
  {
    name: 'VT（バンガード・トータル・ワールド・ストック ETF）',
    ticker: 'VT',
    assetClass: 'foreign_etf',
    currency: 'USD',
    annualCostRate: 0.0007,
    benchmark: 'FTSEグローバル・オールキャップ',
    dividendYield: 0.02,
    tags: ['vt', 'vanguard', '全世界', 'バンガード', 'world'],
  },
  {
    name: 'QQQ（インベスコ QQQ トラスト ETF）',
    ticker: 'QQQ',
    assetClass: 'foreign_etf',
    currency: 'USD',
    annualCostRate: 0.002,
    benchmark: 'NASDAQ100',
    dividendYield: 0.006,
    tags: ['qqq', 'nasdaq', 'nasdaq100', 'invesco', 'ナスダック'],
  },
  {
    name: 'VEA（バンガード・FTSE先進国市場 ETF）',
    ticker: 'VEA',
    assetClass: 'foreign_etf',
    currency: 'USD',
    annualCostRate: 0.0005,
    benchmark: 'FTSE先進国',
    dividendYield: 0.032,
    tags: ['vea', 'vanguard', '先進国', 'developed'],
  },
  {
    name: 'VWO（バンガード・FTSE・エマージング・マーケッツ ETF）',
    ticker: 'VWO',
    assetClass: 'foreign_etf',
    currency: 'USD',
    annualCostRate: 0.0008,
    benchmark: 'FTSEエマージング',
    dividendYield: 0.035,
    tags: ['vwo', 'vanguard', '新興国', 'emerging'],
  },
  {
    name: 'AGG（iシェアーズ・コア 米国総合債券市場 ETF）',
    ticker: 'AGG',
    assetClass: 'foreign_etf',
    currency: 'USD',
    annualCostRate: 0.0003,
    benchmark: 'ブルームバーグ米国総合債券',
    dividendYield: 0.035,
    tags: ['agg', 'ishares', '債券', 'bond', 'blackrock'],
  },
  {
    name: 'GLD（SPDR ゴールド・シェアーズ ETF）',
    ticker: 'GLD',
    assetClass: 'commodity',
    currency: 'USD',
    annualCostRate: 0.004,
    tags: ['gld', 'gold', '金', 'コモディティ', 'spdr'],
  },
  // ─── 主要暗号資産 ────────────────────────────────
  {
    name: 'ビットコイン（BTC）',
    ticker: 'BTC',
    assetClass: 'crypto',
    currency: 'JPY',
    tags: ['btc', 'bitcoin', 'ビットコイン', '暗号資産', '仮想通貨'],
  },
  {
    name: 'イーサリアム（ETH）',
    ticker: 'ETH',
    assetClass: 'crypto',
    currency: 'JPY',
    tags: ['eth', 'ethereum', 'イーサリアム', '暗号資産', '仮想通貨'],
  },
  {
    name: 'ソラナ（SOL）',
    ticker: 'SOL',
    assetClass: 'crypto',
    currency: 'JPY',
    tags: ['sol', 'solana', 'ソラナ', '暗号資産'],
  },
  // ─── 国内ETF ─────────────────────────────────────
  {
    name: '1306（NEXT FUNDS TOPIX連動型上場投資信託）',
    ticker: '1306',
    stockCode: '1306',
    assetClass: 'domestic_etf',
    currency: 'JPY',
    annualCostRate: 0.00132,
    benchmark: 'TOPIX',
    dividendYield: 0.02,
    tags: ['1306', 'topix', 'nf', 'nextfunds', '国内etf'],
  },
  {
    name: '1321（日経225連動型上場投資信託）',
    ticker: '1321',
    stockCode: '1321',
    assetClass: 'domestic_etf',
    currency: 'JPY',
    annualCostRate: 0.0022,
    benchmark: '日経225',
    dividendYield: 0.018,
    tags: ['1321', '日経225', '日経平均', '国内etf'],
  },
];

// アセットクラス自動判定用パターン
export const ASSET_CLASS_PATTERNS: {
  pattern: RegExp;
  assetClass: AssetClass;
}[] = [
  { pattern: /^[0-9]{4}$/, assetClass: 'domestic_stock' },           // 4桁証券コード
  { pattern: /^(BTC|ETH|SOL|XRP|BNB|ADA|DOGE|MATIC|DOT|AVAX)$/i, assetClass: 'crypto' },
  { pattern: /^(VOO|VTI|VT|QQQ|VEA|VWO|AGG|TLT|SPY|IVV|GLD|SLV|USO)$/i, assetClass: 'foreign_etf' },
  { pattern: /^1[0-9]{3}$/, assetClass: 'domestic_etf' },             // 1XXX 東証ETF
  { pattern: /(投資信託|インデックス|ファンド|eMAXIS|楽天|SBI.*V|ひふみ)/i, assetClass: 'investment_trust' },
  { pattern: /(REIT|リート|不動産)/i, assetClass: 'real_estate' },
  { pattern: /(gold|silver|金|銀|原油|oil|コモディティ)/i, assetClass: 'commodity' },
  { pattern: /(ソーシャルレンディング|lending|クラウドファンディング)/i, assetClass: 'social_lending' },
  { pattern: /(預金|普通預金|定期預金|外貨預金|cash|現金)/i, assetClass: 'cash' },
];
