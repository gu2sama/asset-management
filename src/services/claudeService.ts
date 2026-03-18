import type { AIAnalysis } from '../types';

// ─────────────────────────────────────────────────
// 定数
// ─────────────────────────────────────────────────
const ENDPOINT    = 'https://api.anthropic.com/v1/messages';
const MODEL_HAIKU = 'claude-haiku-4-5-20251001';   // 銘柄分析（JSON返すだけ）
const MODEL_SONNET = 'claude-sonnet-4-20250514';   // レポートコメント（文章生成）
const API_VERSION = '2023-06-01';

// AI分析対象アセットクラス
const ANALYSABLE_CLASSES = new Set([
  'investment_trust', 'domestic_etf', 'foreign_etf',
]);

// ─────────────────────────────────────────────────
// エラー型
// ─────────────────────────────────────────────────
export class ClaudeApiError extends Error {
  readonly status: number | undefined;
  readonly isRateLimit: boolean;
  constructor(message: string, status?: number, isRateLimit = false) {
    super(message);
    this.name = 'ClaudeApiError';
    this.status = status;
    this.isRateLimit = isRateLimit;
  }
}

export class ClaudeApiKeyError extends Error {
  constructor() {
    super('APIキーが設定されていません。設定画面からAPIキーを入力してください。');
    this.name = 'ClaudeApiKeyError';
  }
}

// ─────────────────────────────────────────────────
// 内部: fetch with リトライ（指数バックオフ）
// ─────────────────────────────────────────────────
async function fetchWithRetry(
  apiKey: string,
  prompt: string,
  maxTokens: number,
  model: string,
  maxRetries = 3,
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': API_VERSION,
          'anthropic-dangerous-allow-browser': 'true',
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      // レートリミット → 指数バックオフでリトライ
      if (res.status === 429) {
        const wait = Math.pow(2, attempt) * 1000 + Math.random() * 500;
        await new Promise((r) => setTimeout(r, wait));
        lastError = new ClaudeApiError('レートリミットに達しました', 429, true);
        continue;
      }

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new ClaudeApiError(`APIエラー (${res.status}): ${body}`, res.status);
      }

      const data = await res.json() as {
        content?: Array<{ type: string; text?: string }>;
      };
      const text = data.content?.find((c) => c.type === 'text')?.text ?? '';
      return text;

    } catch (err) {
      if (err instanceof ClaudeApiError && !err.isRateLimit) throw err;
      lastError = err as Error;
    }
  }

  throw lastError ?? new ClaudeApiError('APIリクエストに失敗しました');
}

// ─────────────────────────────────────────────────
// 機能1: 投資信託・ETF 自動組み入れ分析
// ─────────────────────────────────────────────────
export function isAnalysable(assetClass: string): boolean {
  return ANALYSABLE_CLASSES.has(assetClass);
}

const FUND_ANALYSIS_PROMPT = (name: string) => `以下の投資信託またはETFについて、組み入れ情報をJSON形式のみで返してください。
説明文・前置き・コードブロック記号は不要です。

銘柄名: ${name}

返答形式:
{
  "estimatedCountries": [
    {"country": "国名（日本語）", "code": "ISO2文字コード", "ratio": 0.60}
  ],
  "estimatedSectors": [
    {"sector": "セクター名（日本語）", "ratio": 0.25}
  ],
  "estimatedTopHoldings": [
    {"company": "企業名", "ticker": "ティッカー", "ratio": 0.04}
  ],
  "benchmark": "ベンチマーク名",
  "confidence": "high"
}

ratioは合計が1.0になるようにしてください。
不明な場合はconfidenceをlowにして推定値を返してください。`;

export async function analyzeFund(
  apiKey: string,
  assetName: string,
): Promise<AIAnalysis> {
  if (!apiKey) throw new ClaudeApiKeyError();

  const empty: AIAnalysis = {
    estimatedCountries: [],
    estimatedSectors: [],
    estimatedTopHoldings: [],
    confidence: 'low',
    lastAnalyzed: new Date().toISOString(),
  };

  try {
    const raw = await fetchWithRetry(apiKey, FUND_ANALYSIS_PROMPT(assetName), 1024, MODEL_HAIKU);

    // JSON抽出（コードブロックや余分な文字を除去）
    const jsonStr = raw
      .replace(/```(?:json)?/g, '')
      .replace(/```/g, '')
      .trim();

    const parsed = JSON.parse(jsonStr) as Partial<AIAnalysis>;

    // ratioの合計を1.0に正規化
    const normalizeRatios = <T extends { ratio: number }>(arr: T[]): T[] => {
      const total = arr.reduce((s, x) => s + x.ratio, 0);
      if (total === 0) return arr;
      return arr.map((x) => ({ ...x, ratio: x.ratio / total }));
    };

    return {
      estimatedCountries: normalizeRatios(parsed.estimatedCountries ?? []),
      estimatedSectors:   normalizeRatios(parsed.estimatedSectors ?? []),
      estimatedTopHoldings: normalizeRatios(parsed.estimatedTopHoldings ?? []),
      benchmark: parsed.benchmark,
      confidence: parsed.confidence ?? 'medium',
      lastAnalyzed: new Date().toISOString(),
    };

  } catch (err) {
    if (err instanceof ClaudeApiKeyError || err instanceof ClaudeApiError) throw err;
    // JSONパース失敗 → 空データで続行
    console.warn('[ClaudeService] JSON parse failed:', err);
    return empty;
  }
}

// ─────────────────────────────────────────────────
// 機能2: 運用戦略コメント生成（PDF用）
// ─────────────────────────────────────────────────
export interface PortfolioReportData {
  assetAllocation:    Record<string, number>; // assetClass → ratio
  countryAllocation:  Array<{ name: string; ratio: number }>;
  sectorAllocation:   Array<{ sector: string; ratio: number }>;
  topCompanies:       Array<{ company: string; ratio: number }>;
  accountAllocation:  Record<string, number>;
  effectiveCostRate:  number;
  highestCostAsset:   { name: string; rate: number } | null;
  projections: {
    year1:  number; // 想定倍率 (1.07 = 7%増)
    year5:  number;
    year10: number;
    returnRate: number;
  };
  fire: {
    targetAge:      number;
    currentAge:     number;
    targetAmount:   number;
    currentTotal:   number;
    achieveRate:    number; // 達成率 0〜1
  };
  dividend: {
    annualYen:    number;
    yieldRate:    number;
    monthlyYen:   number;
  };
  rebalance: {
    needsRebalance: boolean;
    maxDeviation:   number; // 最大乖離率
  };
  taxHarvesting: {
    potentialSavingYen: number;
    hasLossAssets:      boolean;
  };
}

const REPORT_PROMPT = (data: PortfolioReportData) => `以下のポートフォリオデータを分析し、日本語で運用戦略コメントを作成してください。
500〜700文字程度でまとめてください。

【ポートフォリオデータ】
${JSON.stringify(data, null, 2)}

以下の5項目の見出しで構成してください：
1. 現状分析
2. リスクの偏り・注意点
3. 改善提案（優先順位順・具体的に）
4. FIRE・老後に向けたコメント
5. 配当・節税の観点からのアドバイス

投資助言・税務助言にあたらない範囲で、参考情報として記載してください。`;

export async function generateReportComment(
  apiKey: string,
  data: PortfolioReportData,
): Promise<string> {
  if (!apiKey) throw new ClaudeApiKeyError();
  return fetchWithRetry(apiKey, REPORT_PROMPT(data), 1500, MODEL_SONNET);
}
