import { useState, useRef, useEffect, useCallback } from 'react';
import { PRESET_ASSETS } from '../../constants/presets';
import type { PresetAsset } from '../../constants/presets';
import { ASSET_CLASS_LABELS } from '../../constants/labels';

interface Props {
  onSelect: (preset: PresetAsset) => void;
  onFreeText: (name: string) => void;
}

function normalize(s: string) {
  return s.toLowerCase().replace(/[\s・\-_]/g, '');
}

function searchPresets(query: string): PresetAsset[] {
  if (!query.trim()) return [];
  const q = normalize(query);
  return PRESET_ASSETS.filter((p) => {
    if (normalize(p.name).includes(q)) return true;
    if (p.ticker && normalize(p.ticker).includes(q)) return true;
    if (p.stockCode && p.stockCode.includes(q)) return true;
    return p.tags.some((t) => normalize(t).includes(q));
  }).slice(0, 8);
}

export function SearchInput({ onSelect, onFreeText }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PresetAsset[]>([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const r = searchPresets(query);
    setResults(r);
    setOpen(r.length > 0 || query.length > 0);
    setActiveIdx(-1);
  }, [query]);

  const handleSelect = useCallback(
    (preset: PresetAsset) => {
      onSelect(preset);
      setQuery('');
      setOpen(false);
    },
    [onSelect]
  );

  const handleFreeText = useCallback(() => {
    if (query.trim()) {
      onFreeText(query.trim());
      setQuery('');
      setOpen(false);
    }
  }, [query, onFreeText]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    const totalItems = results.length + 1; // +1 for free-text option
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % totalItems);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + totalItems) % totalItems);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx >= 0 && activeIdx < results.length) {
        handleSelect(results[activeIdx]);
      } else {
        handleFreeText();
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={(e) => {
        if (query) setOpen(true);
        setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 300);
      }}
          placeholder="銘柄名・ティッカー・証券コードで検索（例: オルカン、VOO、7203）"
          className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text placeholder-slate-400 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-indigo-500 text-sm"
          autoComplete="off"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text"
            type="button"
          >
            ✕
          </button>
        )}
      </div>

      {open && (
        <ul
          ref={listRef}
          className="absolute z-50 w-full mt-1 bg-surface-2 border border-border rounded-xl shadow-2xl overflow-hidden"
        >
          {results.map((preset, idx) => (
            <li key={preset.name}>
              <button
                type="button"
                onClick={() => handleSelect(preset)}
                className={`w-full text-left px-4 py-3 hover:bg-border transition-colors ${
                  activeIdx === idx ? 'bg-border' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-text text-sm font-medium truncate">
                      {preset.name}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gold">
                        {ASSET_CLASS_LABELS[preset.assetClass]}
                      </span>
                      {preset.annualCostRate !== undefined && (
                        <span className="text-xs text-muted">
                          信託報酬 {(preset.annualCostRate * 100).toFixed(4)}%
                        </span>
                      )}
                      {preset.benchmark && (
                        <span className="text-xs text-muted truncate">
                          {preset.benchmark}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-xs text-muted font-mono">
                    {preset.ticker ?? preset.currency}
                  </div>
                </div>
              </button>
            </li>
          ))}

          {/* フリーテキスト入力オプション */}
          {query.trim() && (
            <li>
              <button
                type="button"
                onClick={handleFreeText}
                className={`w-full text-left px-4 py-3 border-t border-border hover:bg-border transition-colors ${
                  activeIdx === results.length ? 'bg-border' : ''
                }`}
              >
                <div className="text-sm text-text">
                  <span className="text-muted">手動で追加：</span>{' '}
                  <span className="text-text font-medium">{query}</span>
                </div>
                <div className="text-xs text-muted mt-0.5">
                  アセットクラスなどは後から設定できます
                </div>
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
