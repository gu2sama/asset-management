import { useState, useCallback } from 'react';
import type { Asset } from '../../types';
import { ASSET_CLASS_LABELS, ACCOUNT_TYPE_LABELS } from '../../constants/labels';
import { useSettings } from '../../hooks/useSettings';

interface EditRow {
  id: string;
  value: string;       // 円建て入力値
  rateStr: string;     // 増減率入力値（%）
  foreignStr: string;  // 外貨額入力値
  touched: boolean;
}

interface Props {
  assets: Asset[];
  onSave: (updates: Record<string, number>, foreignAmounts: Record<string, number>) => void;
}

type InputMode = 'amount' | 'rate' | 'foreign';

function formatYen(n: number) {
  return n.toLocaleString('ja-JP');
}

function parseValue(s: string): number {
  return Number(s.replace(/[,，]/g, '')) || 0;
}

export function MonthlyUpdate({ assets, onSave }: Props) {
  const { settings } = useSettings();
  const rates = settings.exchangeRates ?? { USD: 150, EUR: 163, GBP: 190, AUD: 98, CAD: 110 };

  const [mode, setMode] = useState<InputMode>('amount');
  const [bulkRate, setBulkRate] = useState('');
  const [rows, setRows] = useState<EditRow[]>(() =>
    assets.map((a) => ({
      id: a.id,
      value: String(a.currentValue),
      rateStr: '',
      foreignStr: a.foreignAmount ? String(a.foreignAmount) : '',
      touched: false,
    }))
  );
  const [saved, setSaved] = useState(false);

  const hasForeignAssets = assets.some((a) => a.currency !== 'JPY');

  const MODES: { id: InputMode; label: string }[] = [
    { id: 'amount', label: '金額入力' },
    { id: 'rate',   label: '増減率 ±%' },
    ...(hasForeignAssets ? [{ id: 'foreign' as InputMode, label: '外貨額入力' }] : []),
  ];

  const updateRow = useCallback((id: string, field: keyof EditRow, val: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const asset = assets.find((a) => a.id === id)!;
        const updated = { ...r, [field]: val, touched: true };

        if (field === 'rateStr') {
          const pct = parseFloat(val) || 0;
          updated.value = String(Math.round(asset.currentValue * (1 + pct / 100)));
        }
        if (field === 'foreignStr') {
          const foreign = parseFloat(val) || 0;
          const fxRate = rates[asset.currency] ?? 1;
          updated.value = String(Math.round(foreign * fxRate));
        }
        return updated;
      })
    );
  }, [assets, rates]);

  // 一括増減率適用
  const applyBulkRate = () => {
    const pct = parseFloat(bulkRate);
    if (isNaN(pct)) return;
    setRows((prev) =>
      prev.map((r, i) => ({
        ...r,
        rateStr: String(pct),
        value: String(Math.round(assets[i].currentValue * (1 + pct / 100))),
        touched: true,
      }))
    );
  };

  const handleSave = () => {
    const updates: Record<string, number> = {};
    const foreignAmounts: Record<string, number> = {};
    for (const row of rows) {
      const v = parseValue(row.value);
      if (v > 0) updates[row.id] = v;
      const f = parseFloat(row.foreignStr);
      if (f > 0) foreignAmounts[row.id] = f;
    }
    onSave(updates, foreignAmounts);
    setSaved(true);
  };

  const totalNew = rows.reduce((s, r) => s + parseValue(r.value), 0);
  const totalOld = assets.reduce((s, a) => s + a.currentValue, 0);
  const delta = totalNew - totalOld;
  const touchedCount = rows.filter((r) => r.touched).length;

  return (
    <div className="space-y-4">
      {/* サマリー */}
      <div className="bg-surface-2/50 border border-border rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted">前月合計 → 今月合計</div>
            <div className="text-text font-bold text-lg mt-0.5">
              ¥{formatYen(totalOld)}
              <span className="text-muted mx-2">→</span>
              ¥{formatYen(totalNew)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted">変化額</div>
            <div className={`font-bold text-lg ${delta >= 0 ? 'text-gain' : 'text-loss'}`}>
              {delta >= 0 ? '+' : ''}¥{formatYen(delta)}
            </div>
          </div>
        </div>
        {touchedCount > 0 && (
          <div className="mt-2 text-xs text-muted">
            {touchedCount} / {rows.length} 銘柄を更新済み
          </div>
        )}
      </div>

      {/* 入力モード切替 */}
      <div className="flex gap-1 bg-surface-2/50 p-1 rounded-xl border border-border">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-colors ${
              mode === m.id ? 'bg-surface border border-gold/40 text-gold' : 'text-muted hover:text-text'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* 増減率モード：一括入力 */}
      {mode === 'rate' && (
        <div className="bg-surface-2 border border-border rounded-xl p-3 flex items-center gap-3">
          <span className="text-xs text-muted shrink-0">全銘柄に一括適用</span>
          <div className="relative flex-1">
            <input
              type="number"
              value={bulkRate}
              onChange={(e) => setBulkRate(e.target.value)}
              placeholder="例: +5 や -3"
              step="0.1"
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-text text-sm font-mono focus:outline-none focus:border-gold/50 pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-xs">%</span>
          </div>
          <button
            onClick={applyBulkRate}
            disabled={!bulkRate}
            className="px-3 py-2 bg-gold hover:bg-gold-2 disabled:bg-border disabled:text-muted text-bg text-xs font-semibold rounded-lg transition-colors shrink-0"
          >
            適用
          </button>
        </div>
      )}

      {/* 銘柄リスト */}
      <div className="space-y-2">
        {assets.map((asset, i) => {
          const row = rows[i];
          const newVal = parseValue(row.value);
          const diff = newVal - asset.currentValue;
          const isForeign = asset.currency !== 'JPY';
          const fxRate = rates[asset.currency] ?? 1;

          return (
            <div
              key={asset.id}
              className={`bg-surface-2 border rounded-xl p-3 transition-colors ${
                row.touched ? 'border-gold/30' : 'border-border'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-text text-sm font-medium truncate">{asset.name}</div>
                  <div className="flex gap-2 mt-0.5">
                    <span className="text-xs text-muted">{ASSET_CLASS_LABELS[asset.assetClass]}</span>
                    <span className="text-xs text-muted/60">{ACCOUNT_TYPE_LABELS[asset.account]}</span>
                    {isForeign && <span className="text-xs text-info">{asset.currency}</span>}
                  </div>
                </div>

                <div className="text-right hidden sm:block shrink-0">
                  <div className="text-xs text-muted">前回</div>
                  <div className="text-muted text-sm font-mono">¥{formatYen(asset.currentValue)}</div>
                  {isForeign && asset.foreignAmount && (
                    <div className="text-muted/60 text-xs font-mono">
                      {asset.foreignAmount.toLocaleString()} {asset.currency}
                    </div>
                  )}
                </div>

                {/* 入力フィールド */}
                <div className="shrink-0 w-36 space-y-1">
                  {mode === 'amount' && (
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted text-sm">¥</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={row.value ? Number(row.value).toLocaleString() : ''}
                        onChange={(e) => updateRow(asset.id, 'value', e.target.value.replace(/[^\d]/g, ''))}
                        className={`w-full bg-bg border rounded-lg pl-6 pr-2 py-2 text-text text-sm font-mono text-right focus:outline-none focus:border-gold/50 ${
                          row.touched ? 'border-gold/50' : 'border-border'
                        }`}
                      />
                    </div>
                  )}

                  {mode === 'rate' && (
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        value={row.rateStr}
                        onChange={(e) => updateRow(asset.id, 'rateStr', e.target.value)}
                        placeholder="0.0"
                        className={`w-full bg-bg border rounded-lg px-2 py-2 text-text text-sm font-mono text-right focus:outline-none focus:border-gold/50 pr-6 ${
                          row.touched ? 'border-gold/50' : 'border-border'
                        }`}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted text-xs">%</span>
                    </div>
                  )}

                  {mode === 'foreign' && isForeign && (
                    <div className="relative">
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        value={row.foreignStr}
                        onChange={(e) => updateRow(asset.id, 'foreignStr', e.target.value)}
                        placeholder="0.00"
                        className={`w-full bg-bg border rounded-lg px-2 py-2 text-text text-sm font-mono text-right focus:outline-none focus:border-gold/50 ${
                          row.touched ? 'border-gold/50' : 'border-border'
                        }`}
                      />
                    </div>
                  )}
                  {mode === 'foreign' && !isForeign && (
                    <div className="text-xs text-muted text-center py-2">JPY</div>
                  )}

                  {row.touched && diff !== 0 && (
                    <div className={`text-xs text-right font-mono ${diff > 0 ? 'text-gain' : 'text-loss'}`}>
                      {diff > 0 ? '+' : ''}¥{formatYen(diff)}
                    </div>
                  )}
                  {mode === 'foreign' && row.touched && row.foreignStr && isForeign && (
                    <div className="text-xs text-muted text-right">
                      ×{fxRate} = ¥{formatYen(parseValue(row.value))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {saved ? (
        <div className="text-center py-4">
          <div className="text-gain text-lg font-bold">✓ 保存しました</div>
          <div className="text-muted text-sm mt-1">スナップショットを作成しました</div>
        </div>
      ) : (
        <button
          onClick={handleSave}
          className="w-full bg-gold hover:bg-gold-2 text-bg rounded-xl py-4 font-bold text-base transition-colors"
        >
          保存して分析へ →
        </button>
      )}
    </div>
  );
}
