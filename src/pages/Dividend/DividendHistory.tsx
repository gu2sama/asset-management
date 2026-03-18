import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import type { AccountType, Asset, DividendRecord } from '../../types';
import { ACCOUNT_TYPE_LABELS } from '../../constants/labels';
import { fmtYen } from './dividendUtils';

interface Props {
  dividends: DividendRecord[];
  assets: Asset[];
  onAdd: (input: Omit<DividendRecord, 'id' | 'isTaxFree'>) => void;
  onDelete: (id: string) => void;
}

const ACCOUNT_OPTIONS: AccountType[] = ['nisa_growth', 'nisa_tsumitate', 'ideco', 'tokutei', 'ippan'];

type ViewMode = 'list' | 'chart';

export function DividendHistory({ dividends, assets, onAdd, onDelete }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // フォーム状態
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [manualName, setManualName]           = useState('');
  const [receivedDate, setReceivedDate]       = useState(new Date().toISOString().slice(0, 10));
  const [amountYen, setAmountYen]             = useState(0);
  const [account, setAccount]                 = useState<AccountType>('tokutei');

  const handleSubmit = () => {
    if (amountYen <= 0) return;
    const asset = assets.find((a) => a.id === selectedAssetId);
    const assetName = asset?.name ?? manualName;
    if (!assetName) return;

    onAdd({
      assetId: selectedAssetId || '',
      assetName,
      receivedDate,
      amountYen,
      account,
    });

    // リセット
    setSelectedAssetId('');
    setManualName('');
    setAmountYen(0);
    setShowForm(false);
  };

  // 年別集計チャートデータ
  const yearChartData = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of dividends) {
      const year = d.receivedDate.slice(0, 4);
      map.set(year, (map.get(year) ?? 0) + d.amountYen);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([year, total]) => ({ year, total: Math.round(total) }));
  }, [dividends]);

  const sorted = [...dividends].sort((a, b) => b.receivedDate.localeCompare(a.receivedDate));
  const totalAll = dividends.reduce((s, d) => s + d.amountYen, 0);

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted">
          受取合計：<span className="text-text font-mono">{fmtYen(totalAll)}</span>
          <span className="text-muted/60 ml-2">（{dividends.length}件）</span>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-surface-2 rounded-lg p-0.5 text-xs">
            {(['list', 'chart'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  viewMode === m ? 'bg-border text-text' : 'text-muted hover:text-text'
                }`}
              >
                {m === 'list' ? '一覧' : 'グラフ'}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1 px-3 py-1.5 bg-gold hover:bg-gold text-text rounded-lg text-xs font-medium transition-colors"
          >
            + 記録する
          </button>
        </div>
      </div>

      {/* 入力フォーム */}
      {showForm && (
        <div className="bg-surface-2 border border-gold/30 rounded-2xl p-4 space-y-3">
          <h3 className="text-text text-sm font-semibold">配当受取を記録</h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-muted mb-1 block">銘柄（保有資産から選択）</label>
              <select
                value={selectedAssetId}
                onChange={(e) => {
                  setSelectedAssetId(e.target.value);
                  setManualName('');
                }}
                className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-text text-sm focus:outline-none focus:border-gold/50"
              >
                <option value="">手動入力…</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            {!selectedAssetId && (
              <div className="col-span-2">
                <label className="text-xs text-muted mb-1 block">銘柄名（手動）</label>
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="例：VOO"
                  className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-text text-sm focus:outline-none focus:border-gold/50"
                />
              </div>
            )}

            <div>
              <label className="text-xs text-muted mb-1 block">受取日</label>
              <input
                type="date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-text text-sm focus:outline-none focus:border-gold/50"
              />
            </div>

            <div>
              <label className="text-xs text-muted mb-1 block">金額（円）</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">¥</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={amountYen || ''}
                  onChange={(e) => setAmountYen(Number(e.target.value))}
                  placeholder="0"
                  className="w-full bg-surface border border-border rounded-xl pl-7 pr-3 py-2 text-text text-sm font-mono focus:outline-none focus:border-gold/50"
                />
              </div>
            </div>

            <div className="col-span-2">
              <label className="text-xs text-muted mb-1 block">口座</label>
              <select
                value={account}
                onChange={(e) => setAccount(e.target.value as AccountType)}
                className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-text text-sm focus:outline-none focus:border-gold/50"
              >
                {ACCOUNT_OPTIONS.map((a) => (
                  <option key={a} value={a}>{ACCOUNT_TYPE_LABELS[a]}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSubmit}
              disabled={amountYen <= 0 || (!selectedAssetId && !manualName)}
              className="flex-1 bg-gain hover:bg-gain disabled:bg-border disabled:text-muted text-text rounded-xl py-2.5 text-sm font-semibold transition-colors"
            >
              記録する
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2.5 bg-border hover:bg-border text-text rounded-xl text-sm transition-colors"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {dividends.length === 0 ? (
        <div className="bg-surface-2 border border-border rounded-2xl p-8 text-center">
          <div className="text-4xl mb-3">📋</div>
          <div className="text-muted text-sm">配当受取履歴がありません。</div>
          <div className="text-muted text-xs mt-1">「記録する」ボタンから配当受取を追加できます。</div>
        </div>
      ) : viewMode === 'chart' ? (
        <div className="space-y-4">
          {yearChartData.length > 0 && (
            <div className="bg-surface-2 border border-border rounded-2xl p-4">
              <h3 className="text-text text-sm font-semibold mb-3">年別受取合計</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={yearChartData} margin={{ left: 0, right: 4, top: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tickFormatter={(v: number) => `${Math.round(v / 10000)}万`}
                    tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} width={40}
                  />
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <Tooltip content={(p: any) => {
                    if (!p.active || !p.payload?.length) return null;
                    return (
                      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '8px 12px' }}>
                        <div style={{ color: '#94a3b8', fontSize: 11 }}>{p.label}年</div>
                        <div style={{ color: '#10b981', fontFamily: 'monospace', fontSize: 13, fontWeight: 700 }}>
                          {fmtYen(p.payload[0]?.value as number)}
                        </div>
                      </div>
                    );
                  }} />
                  <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((d) => (
            <div key={d.id} className="bg-surface-2 border border-border rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-text text-sm font-medium truncate">{d.assetName}</span>
                  {d.isTaxFree ? (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-900/40 text-gain border border-gain/30 flex-shrink-0">
                      非課税
                    </span>
                  ) : (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-border text-muted flex-shrink-0">課税</span>
                  )}
                </div>
                <div className="text-muted text-xs mt-0.5">
                  {d.receivedDate}
                  <span className="mx-1.5">·</span>
                  {ACCOUNT_TYPE_LABELS[d.account]}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-gain font-mono font-semibold">+{fmtYen(d.amountYen)}</div>
                {!d.isTaxFree && (
                  <div className="text-muted text-xs">税後 ¥{Math.round(d.amountYen * 0.79685).toLocaleString()}</div>
                )}
              </div>
              <button
                onClick={() => onDelete(d.id)}
                className="text-muted/60 hover:text-loss text-xs flex-shrink-0 px-1"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
