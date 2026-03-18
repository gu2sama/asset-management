import { useState, useCallback } from 'react';
import type { AssetClass } from '../../types';
import { PRESET_ASSETS, ASSET_CLASS_PATTERNS } from '../../constants/presets';
import { ASSET_CLASS_LABELS } from '../../constants/labels';
import type { AssetInput } from '../../hooks/useAssets';

interface ParsedRow {
  raw: string;
  name: string;
  currentValue: number;
  assetClass: AssetClass;
  ticker?: string;
  annualCostRate?: number;
  currency: string;
  error?: string;
}

function detectAssetClass(name: string): AssetClass {
  const upper = name.toUpperCase().trim();

  // プリセットで一致確認
  const preset = PRESET_ASSETS.find(
    (p) =>
      p.name.includes(name) ||
      p.ticker?.toUpperCase() === upper ||
      p.stockCode === name ||
      p.tags.some((t) => t.toLowerCase() === name.toLowerCase())
  );
  if (preset) return preset.assetClass;

  // パターンマッチ
  for (const { pattern, assetClass } of ASSET_CLASS_PATTERNS) {
    if (pattern.test(name)) return assetClass;
  }

  // ティッカーっぽい文字列（2-5大文字英字）→ 海外株式
  if (/^[A-Z]{2,5}$/.test(upper)) return 'foreign_stock';

  return 'investment_trust'; // デフォルト
}

function parseLine(line: string): ParsedRow | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) return null;

  // カンマ or タブ or スペース区切り
  const sep = trimmed.includes(',')
    ? ','
    : trimmed.includes('\t')
    ? '\t'
    : /\s{2,}/;

  const parts = trimmed.split(sep).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return { raw: line, name: trimmed, currentValue: 0, assetClass: 'investment_trust', currency: 'JPY', error: '評価額が見つかりません' };

  const name = parts[0];
  const valueStr = parts[parts.length - 1].replace(/[,，¥￥\s]/g, '');
  const currentValue = Number(valueStr);

  if (isNaN(currentValue) || currentValue <= 0) {
    return { raw: line, name, currentValue: 0, assetClass: 'investment_trust', currency: 'JPY', error: `金額が不正: "${parts[parts.length - 1]}"` };
  }

  // プリセットから詳細情報を補完
  const preset = PRESET_ASSETS.find(
    (p) =>
      p.name.toLowerCase().includes(name.toLowerCase()) ||
      p.ticker?.toLowerCase() === name.toLowerCase() ||
      p.stockCode === name ||
      p.tags.some((t) => t.toLowerCase() === name.toLowerCase())
  );

  const assetClass = preset?.assetClass ?? detectAssetClass(name);

  return {
    raw: line,
    name: preset?.name ?? name,
    currentValue,
    assetClass,
    ticker: preset?.ticker,
    annualCostRate: preset?.annualCostRate,
    currency: preset?.currency ?? (assetClass === 'foreign_etf' || assetClass === 'foreign_stock' ? 'USD' : 'JPY'),
  };
}

function parseText(text: string): ParsedRow[] {
  return text
    .split('\n')
    .map(parseLine)
    .filter((r): r is ParsedRow => r !== null);
}

const EXAMPLE_TEXT = `eMAXIS Slim 全世界株式, 5000000
VOO, 1500000
BTC, 800000
トヨタ自動車, 300000
7203, 250000`;

interface Props {
  onImport: (assets: AssetInput[]) => void;
}

export function BulkImport({ onImport }: Props) {
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<ParsedRow[] | null>(null);
  const [imported, setImported] = useState(false);

  const handleParse = useCallback(() => {
    const rows = parseText(text);
    setPreview(rows);
  }, [text]);

  const handleImport = useCallback(() => {
    if (!preview) return;
    const validRows = preview.filter((r) => !r.error && r.currentValue > 0);
    const assets: AssetInput[] = validRows.map((r) => ({
      name: r.name,
      assetClass: r.assetClass,
      account: 'tokutei',
      currentValue: r.currentValue,
      ticker: r.ticker,
      annualCostRate: r.annualCostRate,
      currency: r.currency,
    }));
    onImport(assets);
    setImported(true);
  }, [preview, onImport]);

  const validCount = preview?.filter((r) => !r.error).length ?? 0;
  const errorCount = preview?.filter((r) => !!r.error).length ?? 0;

  if (imported) {
    return (
      <div className="text-center py-8">
        <div className="text-5xl mb-4">✓</div>
        <div className="text-gain text-xl font-bold">{validCount} 銘柄を登録しました</div>
        <button
          onClick={() => { setImported(false); setPreview(null); setText(''); }}
          className="mt-4 text-muted hover:text-text text-sm underline"
        >
          続けてインポート
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-surface-2/30 border border-border rounded-xl p-4 text-sm">
        <div className="text-text font-medium mb-2">入力フォーマット</div>
        <pre className="text-muted font-mono text-xs leading-relaxed">
{`銘柄名（またはティッカー）, 評価額（円）
eMAXIS Slim 全世界株式, 5000000
VOO, 1500000
BTC, 800000`}
        </pre>
        <div className="mt-2 text-xs text-muted">
          ・アセットクラスは自動判定（後から変更可）<br/>
          ・カンマ・タブ・スペース区切りに対応<br/>
          ・#または//で始まる行はコメントとして無視
        </div>
      </div>

      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); setPreview(null); }}
        placeholder={EXAMPLE_TEXT}
        rows={8}
        className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text font-mono text-sm focus:outline-none focus:border-gold/50 resize-none"
        spellCheck={false}
      />

      <div className="flex gap-3">
        <button
          onClick={() => setText(EXAMPLE_TEXT)}
          className="text-xs text-muted hover:text-text underline"
          type="button"
        >
          サンプルを挿入
        </button>
        <button
          onClick={handleParse}
          disabled={!text.trim()}
          className="flex-1 bg-border hover:bg-border disabled:opacity-50 text-text rounded-xl py-3 text-sm font-medium transition-colors"
          type="button"
        >
          解析してプレビュー
        </button>
      </div>

      {preview && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-text">
              解析結果：
              <span className="text-gain font-bold ml-1">{validCount}件OK</span>
              {errorCount > 0 && (
                <span className="text-loss font-bold ml-2">{errorCount}件エラー</span>
              )}
            </div>
            <div className="text-xs text-muted">
              合計 ¥{preview.filter((r) => !r.error).reduce((s, r) => s + r.currentValue, 0).toLocaleString()}
            </div>
          </div>

          <div className="space-y-1 max-h-64 overflow-y-auto">
            {preview.map((row, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                  row.error
                    ? 'bg-loss/10 border border-red-800'
                    : 'bg-surface-2 border border-border'
                }`}
              >
                {row.error ? (
                  <>
                    <span className="text-loss">✕</span>
                    <span className="text-loss flex-1 truncate">{row.raw}</span>
                    <span className="text-loss text-xs">{row.error}</span>
                  </>
                ) : (
                  <>
                    <span className="text-gain">✓</span>
                    <span className="text-text flex-1 truncate">{row.name}</span>
                    <span className="text-xs text-gold flex-shrink-0">
                      {ASSET_CLASS_LABELS[row.assetClass]}
                    </span>
                    <span className="text-text font-mono text-xs flex-shrink-0">
                      ¥{row.currentValue.toLocaleString()}
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>

          {validCount > 0 && (
            <div className="bg-warn/10 border border-amber-800 rounded-xl p-3 text-xs text-warn">
              口座区分は「特定口座」で一括登録されます。登録後に個別変更してください。
            </div>
          )}

          <button
            onClick={handleImport}
            disabled={validCount === 0}
            className="w-full bg-gold hover:bg-gold disabled:opacity-50 text-text rounded-xl py-4 font-bold text-base transition-colors"
            type="button"
          >
            {validCount}件を登録する
          </button>
        </div>
      )}
    </div>
  );
}
