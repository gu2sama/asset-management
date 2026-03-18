import { useState, useRef } from 'react';
import { useAssets } from '../../hooks/useAssets';
import { useSettings } from '../../hooks/useSettings';
import { usePortfolioSummary } from '../../hooks/usePortfolioSummary';
import { useTaxSimulator } from '../../hooks/useTaxSimulator';
import { useClaudeAI } from '../../hooks/useClaudeAI';
import { ReportDocument, type ReportDocumentHandle, type SectionKey } from './ReportDocument';
import { generatePdf } from './pdfGenerator';
import type { PortfolioReportData } from '../../services/claudeService';

// ─────────────────────────────────────────────────
// セクション定義
// ─────────────────────────────────────────────────
const SECTIONS: { key: SectionKey; label: string; icon: string; page: string }[] = [
  { key: 'cover',       label: '表紙',                 icon: '📄', page: 'P1' },
  { key: 'summary',     label: 'ポートフォリオ サマリー', icon: '📊', page: 'P2' },
  { key: 'portfolio',   label: '構成チャート',           icon: '🥧', page: 'P3' },
  { key: 'cost',        label: 'コスト分析',             icon: '💸', page: 'P4' },
  { key: 'future',      label: '将来予測',               icon: '📈', page: 'P5' },
  { key: 'fire',        label: 'FIRE・ライフプラン',     icon: '🔥', page: 'P6' },
  { key: 'dividend',    label: '配当・インカム分析',     icon: '💰', page: 'P7' },
  { key: 'tax',         label: '税務サマリー',           icon: '🧾', page: 'P8' },
  { key: 'assetDetail', label: '保有資産 明細',          icon: '📋', page: 'P9' },
  { key: 'aiComment',   label: 'AI運用戦略コメント',    icon: '🤖', page: 'P10' },
  { key: 'disclaimer',  label: '免責事項',               icon: '⚖️', page: 'P11' },
];

const DEFAULT_ENABLED = Object.fromEntries(
  SECTIONS.map((s) => [s.key, true])
) as Record<SectionKey, boolean>;

// ─────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────
export function ReportPage() {
  const { assets }  = useAssets();
  const settings    = useSettings();
  const summary     = usePortfolioSummary(assets);
  const taxResult   = useTaxSimulator(assets);
  const { reportState, generateReport } = useClaudeAI();

  const docRef = useRef<ReportDocumentHandle>(null);

  const [enabled, setEnabled]           = useState<Record<SectionKey, boolean>>(DEFAULT_ENABLED);
  const [hideAmounts, setHideAmounts]   = useState(false);
  const [generating, setGenerating]     = useState(false);
  const [progress, setProgress]         = useState(0);
  const [error, setError]               = useState<string | null>(null);
  const [done, setDone]                 = useState(false);
  const [forceRegenAI, setForceRegenAI] = useState(false);

  const apiKey = settings.settings.apiKey;

  const toggleSection = (key: SectionKey) => {
    setEnabled((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAll = (val: boolean) => {
    setEnabled(Object.fromEntries(SECTIONS.map((s) => [s.key, val])) as Record<SectionKey, boolean>);
  };

  const handleGenerate = async () => {
    if (!docRef.current) return;
    setError(null);
    setDone(false);
    setGenerating(true);
    setProgress(0);

    try {
      // AIコメントを先に生成（未生成 or 強制再生成の場合のみ）
      const needsAI = enabled.aiComment && apiKey && (!reportState.text || forceRegenAI);
      if (needsAI) {
        setForceRegenAI(false);
        const reportData: PortfolioReportData = {
          assetAllocation: Object.fromEntries(
            summary.byAssetClass.map((a) => [a.assetClass, a.ratio])
          ),
          countryAllocation: summary.byCountry.map((c) => ({ name: c.country, ratio: c.ratio })),
          sectorAllocation: summary.bySector.map((s) => ({ sector: s.sector, ratio: s.ratio })),
          topCompanies: assets
            .flatMap((a) => a.aiAnalysis?.estimatedTopHoldings ?? [])
            .slice(0, 5)
            .map((h) => ({ company: h.company, ratio: h.ratio })),
          accountAllocation: Object.fromEntries(
            summary.byAccount.map((a) => [a.account, a.ratio])
          ),
          effectiveCostRate: summary.weightedCostRate,
          highestCostAsset: (() => {
            const top = [...assets].sort((a, b) => (b.annualCostRate ?? 0) - (a.annualCostRate ?? 0))[0];
            return top?.annualCostRate ? { name: top.name, rate: top.annualCostRate } : null;
          })(),
          projections: {
            year1:  summary.totalValue > 0 ? ((summary.totalValue * 1.05) / summary.totalValue) : 1.05,
            year5:  1.05 ** 5,
            year10: 1.05 ** 10,
            returnRate: 0.05,
          },
          fire: {
            targetAge: settings.settings.targetAge,
            currentAge: settings.settings.currentAge,
            targetAmount: settings.settings.targetAmount,
            currentTotal: summary.totalValue,
            achieveRate: settings.settings.targetAmount > 0
              ? Math.min(summary.totalValue / settings.settings.targetAmount, 1)
              : 0,
          },
          dividend: {
            annualYen: summary.annualDividendYen,
            yieldRate: summary.totalValue > 0 ? summary.annualDividendYen / summary.totalValue : 0,
            monthlyYen: summary.monthlyDividendYen,
          },
          rebalance: {
            needsRebalance: false,
            maxDeviation: 0,
          },
          taxHarvesting: {
            potentialSavingYen: taxResult.harvesting.estimatedTaxSaving,
            hasLossAssets: taxResult.harvesting.lossAssets.length > 0,
          },
        };
        await generateReport(apiKey, reportData);
      } else if (enabled.aiComment && apiKey && reportState.text) {
        // キャッシュ済みのコメントをそのまま使用（API呼び出しなし）
      }

      // セクション取得
      const sections = docRef.current.getSections(enabled);
      if (sections.length === 0) {
        setError('出力するセクションを1つ以上選択してください。');
        setGenerating(false);
        return;
      }

      // ファイル名
      const d = new Date();
      const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

      await generatePdf(sections, `portfolio_${dateStr}.pdf`, (pct) => {
        setProgress(Math.round(pct * 100));
      });

      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : '不明なエラーが発生しました。');
    } finally {
      setGenerating(false);
    }
  };

  const selectedCount = Object.values(enabled).filter(Boolean).length;

  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center gap-4">
        <div className="text-6xl">📄</div>
        <h2 className="text-text text-xl font-bold">資産データがありません</h2>
        <p className="text-muted text-sm">資産入力画面で保有資産を登録してください。</p>
      </div>
    );
  }

  return (
    <div className="animate-fadein p-4 sm:p-6 mx-auto space-y-5">
      {/* ヘッダー */}
      <div>
        <h1 className="font-serif text-2xl font-bold text-text">PDFレポート出力</h1>
        <p className="text-muted text-sm mt-1">
          ポートフォリオの現状分析・税務・FIRE計画を1枚のレポートにまとめます
        </p>
      </div>

      {/* オプション */}
      <div className="bg-surface-2 border border-border rounded-2xl p-5 space-y-4">
        <h2 className="text-text font-semibold text-sm">出力設定</h2>

        {/* 金額非表示 */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={hideAmounts}
            onChange={(e) => setHideAmounts(e.target.checked)}
            className="accent-gold w-4 h-4"
          />
          <div>
            <span className="text-text text-sm">金額を非表示にする</span>
            <div className="text-muted text-xs mt-0.5">
              「****万円」「**.** 億円」のように伏せて出力します
            </div>
          </div>
        </label>

        {/* AIコメント状態表示 */}
        {enabled.aiComment && (
          <div className={`flex items-start gap-2 text-xs px-3 py-2 rounded-lg ${
            !apiKey
              ? 'bg-warn/10 text-warn border border-warn/30'
              : 'bg-gold/10 text-gold border border-gold/30'
          }`}>
            <span className="mt-0.5">🤖</span>
            <div className="flex-1">
              {apiKey ? (
                reportState.text ? (
                  <div className="flex items-center justify-between gap-2">
                    <span>AIコメント生成済み（キャッシュを使用します）</span>
                    <button
                      onClick={() => setForceRegenAI(true)}
                      className="text-gold/70 hover:text-gold underline whitespace-nowrap"
                    >
                      再生成
                    </button>
                  </div>
                ) : (
                  'AIコメント (P10) はレポート生成時に1回だけ生成されます'
                )
              ) : (
                'APIキー未設定のため、AIコメントはスキップされます。設定画面でAPIキーを入力できます。'
              )}
            </div>
          </div>
        )}
      </div>

      {/* セクション選択 */}
      <div className="bg-surface-2 border border-border rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-text font-semibold text-sm">出力セクション</h2>
          <div className="flex gap-2">
            <button
              onClick={() => toggleAll(true)}
              className="text-xs text-gold hover:text-gold px-2 py-1 rounded-lg hover:bg-border"
            >
              全選択
            </button>
            <button
              onClick={() => toggleAll(false)}
              className="text-xs text-muted hover:text-text px-2 py-1 rounded-lg hover:bg-border"
            >
              全解除
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SECTIONS.map((sec) => (
            <label
              key={sec.key}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer border transition-colors ${
                enabled[sec.key]
                  ? 'border-gold/30 bg-gold/10'
                  : 'border-border bg-surface-2/50 hover:border-border/80'
              }`}
            >
              <input
                type="checkbox"
                checked={enabled[sec.key]}
                onChange={() => toggleSection(sec.key)}
                className="accent-gold w-4 h-4 flex-shrink-0"
              />
              <span className="text-base">{sec.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-text text-xs font-medium">{sec.label}</div>
              </div>
              <span className="text-muted/60 text-xs flex-shrink-0">{sec.page}</span>
            </label>
          ))}
        </div>

        <div className="text-muted text-xs pt-1">
          {selectedCount}セクション選択中
        </div>
      </div>

      {/* プレビュー情報 */}
      <div className="bg-surface border border-border rounded-2xl p-4 space-y-2 text-sm">
        <div className="flex justify-between text-muted text-xs">
          <span>総資産</span>
          <span className="text-text font-mono">
            {hideAmounts ? '伏せ字' : `¥${Math.round(summary.totalValue / 10000).toLocaleString()}万円`}
          </span>
        </div>
        <div className="flex justify-between text-muted text-xs">
          <span>保有銘柄数</span>
          <span className="text-text">{assets.length}銘柄</span>
        </div>
        <div className="flex justify-between text-muted text-xs">
          <span>出力ページ数（概算）</span>
          <span className="text-text">{selectedCount}ページ</span>
        </div>
        <div className="flex justify-between text-muted text-xs">
          <span>フォーマット</span>
          <span className="text-text">A4縦・PDF</span>
        </div>
      </div>

      {/* エラー */}
      {error && (
        <div className="bg-loss/10 border border-loss/30 rounded-2xl px-4 py-3 text-loss text-sm">
          {error}
        </div>
      )}

      {/* 完了メッセージ */}
      {done && (
        <div className="bg-gain/10 border border-gain/30 rounded-2xl px-4 py-3 flex items-center gap-2 text-gain text-sm">
          <span>✅</span>
          <span>PDFの生成が完了しました。ダウンロードフォルダを確認してください。</span>
        </div>
      )}

      {/* 生成ボタン */}
      <button
        onClick={handleGenerate}
        disabled={generating || selectedCount === 0}
        className={`w-full py-4 rounded-2xl font-semibold text-sm transition-all ${
          generating || selectedCount === 0
            ? 'bg-surface-2 text-muted cursor-not-allowed border border-border'
            : 'bg-gold hover:bg-gold text-text shadow-gold/20'
        }`}
      >
        {generating ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            生成中… {progress}%
          </span>
        ) : (
          `📄 PDFレポートを生成 (${selectedCount}ページ)`
        )}
      </button>

      {/* プログレスバー */}
      {generating && (
        <div className="h-1.5 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-gold rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* 注意事項 */}
      <div className="bg-surface-2 border border-border rounded-xl p-4 text-xs text-muted space-y-1.5 leading-relaxed">
        <div>・PDF生成中はブラウザが重くなる場合があります（特にチャートがある場合）</div>
        <div>・日本語フォント（Noto Sans JP）はインターネット接続が必要です</div>
        <div>・AIコメントの生成にはAnthropicのAPIキーが必要です（設定画面から入力）</div>
        <div>・本レポートは概算値であり、投資助言・税務助言には該当しません</div>
      </div>

      {/* 非表示レンダリング領域 */}
      <ReportDocument
        ref={docRef}
        assets={assets}
        settings={settings.settings}
        summary={summary}
        taxResult={taxResult}
        aiComment={reportState.text}
        aiStatus={reportState.status}
        hideAmounts={hideAmounts}
      />
    </div>
  );
}
