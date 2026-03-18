import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Asset, AccountType, AssetClass } from '../../types';
import type { PresetAsset } from '../../constants/presets';
import { PRESET_ASSETS } from '../../constants/presets';
import { ASSET_CLASS_LABELS, ACCOUNT_TYPE_LABELS } from '../../constants/labels';
import type { AssetInput } from '../../hooks/useAssets';
import { useSettings } from '../../hooks/useSettings';

function normalize(s: string) {
  return s.toLowerCase().replace(/[\s・\-_]/g, '');
}
function searchPresets(query: string): PresetAsset[] {
  if (!query.trim()) return [];
  const q = normalize(query);
  return PRESET_ASSETS.filter((p) =>
    normalize(p.name).includes(q) ||
    (p.ticker && normalize(p.ticker).includes(q)) ||
    p.tags.some((t) => normalize(t).includes(q))
  ).slice(0, 6);
}

const ACCOUNT_TYPES: AccountType[] = [
  'nisa_growth', 'nisa_tsumitate', 'ideco', 'tokutei', 'ippan', 'none',
];
const ASSET_CLASSES: AssetClass[] = [
  'investment_trust', 'domestic_etf', 'foreign_etf', 'domestic_stock',
  'foreign_stock', 'crypto', 'commodity', 'real_estate', 'social_lending', 'cash',
];

interface Props {
  initial: Partial<PresetAsset> & { name: string };
  editTarget?: Asset;
  onSubmit: (data: AssetInput) => void;
  onCancel: () => void;
}

function formatNumber(v: string) {
  const num = v.replace(/[^\d]/g, '');
  return num.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function AssetFormModal({ initial, editTarget, onSubmit, onCancel }: Props) {
  const { settings } = useSettings();
  const rates = settings.exchangeRates ?? { USD: 150, EUR: 163, GBP: 190, AUD: 98, CAD: 110 };
  const [name, setName] = useState(editTarget?.name ?? initial.name);
  const [assetClass, setAssetClass] = useState<AssetClass>(
    editTarget?.assetClass ?? initial.assetClass ?? 'investment_trust'
  );
  const [account, setAccount] = useState<AccountType>(
    editTarget?.account ?? 'tokutei'
  );
  const [currentValueStr, setCurrentValueStr] = useState(
    editTarget ? String(editTarget.currentValue) : ''
  );
  const [acquisitionPriceStr, setAcquisitionPriceStr] = useState(
    editTarget?.acquisitionPrice ? String(editTarget.acquisitionPrice) : ''
  );
  const [ticker, setTicker] = useState(editTarget?.ticker ?? initial.ticker ?? '');
  const [currency, setCurrency] = useState(editTarget?.currency ?? initial.currency ?? 'JPY');
  const [annualCostRate, setAnnualCostRate] = useState(
    editTarget?.annualCostRate != null
      ? String((editTarget.annualCostRate * 100).toFixed(4))
      : initial.annualCostRate != null
      ? String((initial.annualCostRate * 100).toFixed(4))
      : ''
  );
  const [dividendYield, setDividendYield] = useState(
    editTarget?.dividendYield != null
      ? String((editTarget.dividendYield * 100).toFixed(2))
      : initial.dividendYield != null
      ? String((initial.dividendYield * 100).toFixed(2))
      : ''
  );
  const [memo, setMemo] = useState(editTarget?.memo ?? '');
  const [foreignAmountStr, setForeignAmountStr] = useState(
    editTarget?.foreignAmount ? String(editTarget.foreignAmount) : ''
  );
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState<PresetAsset[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const isForeign = currency !== 'JPY';
  const fxRate = rates[currency] ?? 1;

  // 外貨額から円換算を自動計算
  const handleForeignAmountChange = (v: string) => {
    setForeignAmountStr(v);
    const foreign = Number(v);
    if (foreign > 0) {
      setCurrentValueStr(String(Math.round(foreign * fxRate)));
    }
  };

  // プリセット選択後に自動セット
  useEffect(() => {
    if (!editTarget && initial.assetClass) setAssetClass(initial.assetClass);
    if (!editTarget && initial.currency) setCurrency(initial.currency);
  }, [initial, editTarget]);

  const handleNameChange = (v: string) => {
    setName(v);
    setSuggestions(searchPresets(v));
    setShowSuggestions(true);
  };

  const handleSelectPreset = (preset: PresetAsset) => {
    setName(preset.name);
    setAssetClass(preset.assetClass);
    setCurrency(preset.currency);
    if (preset.ticker) setTicker(preset.ticker);
    if (preset.annualCostRate != null) setAnnualCostRate(String((preset.annualCostRate * 100).toFixed(4)));
    if (preset.dividendYield != null) setDividendYield(String((preset.dividendYield * 100).toFixed(2)));
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const currentValue = Number(currentValueStr.replace(/,/g, ''));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('銘柄名を入力してください'); return; }
    if (!currentValue || currentValue <= 0) { setError('評価額を正しく入力してください'); return; }
    setError('');

    const data: AssetInput = {
      name: name.trim(),
      assetClass,
      account,
      currentValue,
      foreignAmount: isForeign && foreignAmountStr ? Number(foreignAmountStr) : undefined,
      acquisitionPrice: acquisitionPriceStr ? Number(acquisitionPriceStr.replace(/,/g, '')) : undefined,
      ticker: ticker || undefined,
      currency,
      annualCostRate: annualCostRate ? Number(annualCostRate) / 100 : undefined,
      dividendYield: dividendYield ? Number(dividendYield) / 100 : undefined,
      memo: memo || undefined,
    };
    onSubmit(data);
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end md:items-center md:justify-center bg-black/60 backdrop-blur-sm md:p-4">
      <div className="bg-surface border border-border rounded-t-2xl md:rounded-2xl w-full md:max-w-lg shadow-2xl max-h-[calc(100svh-3.5rem)] md:max-h-[90vh] overflow-y-auto [scroll-padding-top:4rem]">
        <div className="sticky top-0 bg-surface px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-text font-semibold text-lg">
            {editTarget ? '資産を編集' : '資産を追加'}
          </h2>
          <button onClick={onCancel} className="text-muted hover:text-text text-xl leading-none">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 銘柄名 */}
          <div className="relative">
            <label className="block text-xs text-muted mb-1">銘柄名</label>
            <input
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              onFocus={() => name && setSuggestions(searchPresets(name))}
              autoComplete="off"
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-text text-sm focus:outline-none focus:border-gold/50"
            />
            {showSuggestions && suggestions.length > 0 && (
              <ul className="absolute z-10 w-full mt-1 bg-surface border border-border rounded-xl shadow-xl overflow-hidden">
                {suggestions.map((p) => (
                  <li key={p.name}>
                    <button
                      type="button"
                      onMouseDown={() => handleSelectPreset(p)}
                      className="w-full text-left px-4 py-2.5 hover:bg-surface-2 transition-colors"
                    >
                      <div className="text-text text-sm truncate">{p.name}</div>
                      <div className="flex gap-2 mt-0.5">
                        <span className="text-xs text-gold">{ASSET_CLASS_LABELS[p.assetClass]}</span>
                        {p.annualCostRate != null && (
                          <span className="text-xs text-muted">{(p.annualCostRate * 100).toFixed(4)}%</span>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* アセットクラス */}
          <div>
            <label className="block text-xs text-muted mb-1">アセットクラス</label>
            <select
              value={assetClass}
              onChange={(e) => setAssetClass(e.target.value as AssetClass)}
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-text text-sm focus:outline-none focus:border-gold/50"
            >
              {ASSET_CLASSES.map((c) => (
                <option key={c} value={c}>{ASSET_CLASS_LABELS[c]}</option>
              ))}
            </select>
          </div>

          {/* 外貨額入力（非JPY資産のみ） */}
          {isForeign && (
            <div>
              <label className="block text-xs text-muted mb-1">
                保有額（{currency}）<span className="text-loss ml-1">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm font-mono">{currency}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={foreignAmountStr}
                  onChange={(e) => handleForeignAmountChange(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-surface-2 border border-border rounded-lg pl-14 pr-3 py-3 text-text text-xl font-bold focus:outline-none focus:border-gold/50"
                />
              </div>
              {foreignAmountStr && Number(foreignAmountStr) > 0 && (
                <p className="text-xs text-muted mt-1">
                  ≈ ¥{Math.round(Number(foreignAmountStr) * fxRate).toLocaleString()}
                  <span className="ml-1 text-muted/60">（{currency}/JPY = {fxRate}）</span>
                </p>
              )}
            </div>
          )}

          {/* 評価額（円）★最重要・大きく表示 */}
          <div>
            <label className="block text-xs text-muted mb-1">
              評価額（円）<span className="text-loss ml-1">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-lg">¥</span>
              <input
                type="text"
                inputMode="numeric"
                value={currentValueStr ? formatNumber(currentValueStr.replace(/,/g, '')) : ''}
                onChange={(e) => setCurrentValueStr(e.target.value.replace(/,/g, ''))}
                placeholder="0"
                className="w-full bg-surface-2 border border-border rounded-lg pl-8 pr-3 py-3 text-text text-xl font-bold focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-indigo-500"
                autoFocus={false}
              />
            </div>
            {currentValue > 0 && (
              <div className="text-xs text-muted mt-1">
                {currentValue.toLocaleString()} 円
              </div>
            )}
          </div>

          {/* 口座区分 */}
          <div>
            <label className="block text-xs text-muted mb-1">
              口座区分<span className="text-loss ml-1">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ACCOUNT_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setAccount(t)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                    account === t
                      ? 'bg-gold border-gold/50 text-text'
                      : 'bg-surface-2 border-border text-text hover:border-border/80'
                  }`}
                >
                  {ACCOUNT_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {/* 詳細（折りたたみ） */}
          <details className="group">
            <summary className="cursor-pointer text-xs text-muted hover:text-text select-none list-none flex items-center gap-1">
              <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
              詳細情報（任意）
            </summary>
            <div className="mt-3 space-y-3 pl-3 border-l border-border">
              {/* 取得価格 */}
              <div>
                <label className="block text-xs text-muted mb-1">取得価格（円）</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={acquisitionPriceStr ? formatNumber(acquisitionPriceStr.replace(/,/g, '')) : ''}
                  onChange={(e) => setAcquisitionPriceStr(e.target.value.replace(/,/g, ''))}
                  placeholder="未入力の場合は損益計算不可"
                  className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-text text-sm focus:outline-none focus:border-gold/50"
                />
              </div>
              {/* ティッカー */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted mb-1">ティッカー</label>
                  <input
                    type="text"
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value.toUpperCase())}
                    placeholder="VOO, BTC..."
                    className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-text text-sm focus:outline-none focus:border-gold/50 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">通貨</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-text text-sm focus:outline-none focus:border-gold/50"
                  >
                    {['JPY', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'CHF'].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              {/* 信託報酬・配当利回り */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted mb-1">信託報酬 (%)</label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    max="5"
                    value={annualCostRate}
                    onChange={(e) => setAnnualCostRate(e.target.value)}
                    placeholder="0.0938"
                    className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-text text-sm focus:outline-none focus:border-gold/50 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">配当利回り (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="30"
                    value={dividendYield}
                    onChange={(e) => setDividendYield(e.target.value)}
                    placeholder="1.30"
                    className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-text text-sm focus:outline-none focus:border-gold/50 font-mono"
                  />
                </div>
              </div>
              {/* メモ */}
              <div>
                <label className="block text-xs text-muted mb-1">メモ</label>
                <input
                  type="text"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="任意のメモ"
                  className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-text text-sm focus:outline-none focus:border-gold/50"
                />
              </div>
            </div>
          </details>

          {error && (
            <div className="text-loss text-xs bg-loss/10 border border-red-800 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-border hover:bg-border text-text rounded-xl py-3 text-sm font-medium transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="flex-1 bg-gold hover:bg-gold text-text rounded-xl py-3 text-sm font-bold transition-colors"
            >
              {editTarget ? '更新する' : '追加する'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
