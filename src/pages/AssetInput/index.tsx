import { useState, useCallback } from 'react';
import type { Asset } from '../../types';
import { useAssets } from '../../hooks/useAssets';
import type { AssetInput } from '../../hooks/useAssets';
import { useSnapshots } from '../../hooks/useSnapshots';
import { useSettings } from '../../hooks/useSettings';
import { useClaudeAI } from '../../hooks/useClaudeAI';
import type { PresetAsset } from '../../constants/presets';
import { ASSET_CLASS_LABELS, ACCOUNT_TYPE_LABELS } from '../../constants/labels';
import { isAnalysable } from '../../services/claudeService';
import { SearchInput } from './SearchInput';
import { AssetFormModal } from './AssetFormModal';
import { MonthlyUpdate } from './MonthlyUpdate';
import { BulkImport } from './BulkImport';

type Tab = 'new' | 'monthly' | 'bulk';

export function AssetInputPage() {
  const { assets, addAsset, updateAsset, deleteAsset } = useAssets();
  const { takeSnapshot } = useSnapshots();
  const { settings } = useSettings();
  const { analysisStates, analyzeAsset } = useClaudeAI();

  const [activeTab, setActiveTab] = useState<Tab>(assets.length > 0 ? 'monthly' : 'new');
  const [modalState, setModalState] = useState<{
    open: boolean;
    initial?: Partial<PresetAsset> & { name: string };
    editTarget?: Asset;
  }>({ open: false });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // ── 新規追加フロー ─────────────────────────────────
  const handlePresetSelect = useCallback((preset: PresetAsset) => {
    setModalState({ open: true, initial: preset });
  }, []);

  const handleFreeText = useCallback((name: string) => {
    setModalState({ open: true, initial: { name } });
  }, []);

  const handleFormSubmit = useCallback(
    (data: AssetInput) => {
      if (modalState.editTarget) {
        updateAsset(modalState.editTarget.id, data);
      } else {
        const newAsset = addAsset(data);
        // バックグラウンドでAI分析（投資信託・ETFのみ）
        if (settings.apiKey && isAnalysable(newAsset.assetClass)) {
          analyzeAsset(newAsset, settings.apiKey, (id, result) => {
            updateAsset(id, { aiAnalysis: result });
          });
        }
      }
      setModalState({ open: false });
    },
    [modalState.editTarget, addAsset, updateAsset, settings.apiKey, analyzeAsset]
  );

  // ── 月次更新フロー ─────────────────────────────────
  const handleMonthlySave = useCallback(
    (updates: Record<string, number>, foreignAmounts: Record<string, number>) => {
      for (const [id, value] of Object.entries(updates)) {
        updateAsset(id, {
          currentValue: value,
          ...(foreignAmounts[id] !== undefined ? { foreignAmount: foreignAmounts[id] } : {}),
        });
      }
      // 更新後の最新資産一覧でスナップショット
      const updated = assets.map((a) => {
        if (!updates[a.id]) return a;
        return {
          ...a,
          currentValue: updates[a.id],
          ...(foreignAmounts[a.id] !== undefined ? { foreignAmount: foreignAmounts[a.id] } : {}),
        };
      });
      takeSnapshot(updated);
    },
    [assets, updateAsset, takeSnapshot]
  );

  // ── 一括インポート ─────────────────────────────────
  const handleBulkImport = useCallback(
    (newAssets: AssetInput[]) => {
      for (const a of newAssets) addAsset(a);
    },
    [addAsset]
  );

  // ── 削除 ──────────────────────────────────────────
  const handleDelete = (id: string) => {
    deleteAsset(id);
    setDeleteConfirmId(null);
  };

  const TABS: { id: Tab; label: string; desc: string }[] = [
    { id: 'new', label: '+ 新規追加', desc: '銘柄を検索して追加' },
    { id: 'monthly', label: '月次更新', desc: `${assets.length}銘柄の評価額を更新` },
    { id: 'bulk', label: '一括インポート', desc: 'テキスト貼り付けで一括登録' },
  ];

  return (
    <div className="animate-fadein p-4 sm:p-6 mx-auto space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-text">資産入力</h1>
        <p className="text-muted text-sm mt-1">
          保有資産を入力してポートフォリオを作成します
        </p>
      </div>

      {/* タブ */}
      <div className="flex gap-2 bg-surface-2/50 p-1 rounded-xl border border-border">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            disabled={tab.id === 'monthly' && assets.length === 0}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 ${
              activeTab === tab.id
                ? 'bg-surface border border-gold/40 text-gold'
                : 'text-muted hover:text-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── 新規追加タブ ── */}
      {activeTab === 'new' && (
        <div className="space-y-4">
          <SearchInput onSelect={handlePresetSelect} onFreeText={handleFreeText} />
          <div className="text-xs text-muted text-center">
            主要インデックスファンド・ETF・暗号資産など{' '}
            <span className="text-muted font-medium">20銘柄以上</span> 収録済み
          </div>
        </div>
      )}

      {/* ── 月次更新タブ ── */}
      {activeTab === 'monthly' && assets.length > 0 && (
        <MonthlyUpdate assets={assets} onSave={handleMonthlySave} />
      )}

      {/* ── 一括インポートタブ ── */}
      {activeTab === 'bulk' && (
        <BulkImport onImport={handleBulkImport} />
      )}

      {/* ── 登録済み資産一覧 ── */}
      {assets.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-text font-semibold">
              登録済み資産
              <span className="text-muted text-sm ml-2 font-normal">{assets.length}銘柄</span>
            </h2>
            <div className="text-muted text-sm font-mono">
              計 ¥{assets.reduce((s, a) => s + a.currentValue, 0).toLocaleString()}
            </div>
          </div>

          <div className="space-y-2">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="bg-surface-2 border border-border rounded-xl px-4 py-3 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-text text-sm font-medium truncate">{asset.name}</div>
                  <div className="flex gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-gold">
                      {ASSET_CLASS_LABELS[asset.assetClass]}
                    </span>
                    <span className="text-xs text-muted">
                      {ACCOUNT_TYPE_LABELS[asset.account]}
                    </span>
                    {asset.annualCostRate !== undefined && (
                      <span className="text-xs text-muted">
                        {(asset.annualCostRate * 100).toFixed(4)}%
                      </span>
                    )}
                    {/* AI分析バッジ */}
                    {(() => {
                      const st = analysisStates[asset.id];
                      if (st?.status === 'loading') return <span className="text-xs text-gold animate-pulse">🤖 分析中…</span>;
                      if (st?.status === 'error')   return <span className="text-xs text-loss" title={st.error}>⚠ AI分析失敗</span>;
                      if (asset.aiAnalysis)          return <span className="text-xs text-gold">🤖 AI推定済</span>;
                      if (isAnalysable(asset.assetClass) && !settings.apiKey)
                        return <span className="text-xs text-muted/60">🤖 API未設定</span>;
                      return null;
                    })()}
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="text-text font-mono text-sm font-semibold">
                    ¥{asset.currentValue.toLocaleString()}
                  </div>
                  {asset.acquisitionPrice && (
                    <div className={`text-xs font-mono ${
                      asset.currentValue >= asset.acquisitionPrice
                        ? 'text-gain'
                        : 'text-loss'
                    }`}>
                      {asset.currentValue >= asset.acquisitionPrice ? '+' : ''}
                      ¥{(asset.currentValue - asset.acquisitionPrice).toLocaleString()}
                    </div>
                  )}
                </div>

                {/* アクションボタン */}
                <div className="flex-shrink-0 flex gap-1">
                  <button
                    onClick={() => setModalState({ open: true, initial: { name: asset.name }, editTarget: asset })}
                    className="p-2 text-muted hover:text-text hover:bg-border rounded-lg transition-colors text-xs"
                    title="編集"
                  >
                    ✏️
                  </button>
                  {deleteConfirmId === asset.id ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleDelete(asset.id)}
                        className="px-2 py-1 bg-red-600 hover:bg-loss text-text rounded text-xs"
                      >
                        削除
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-2 py-1 bg-border text-text rounded text-xs"
                      >
                        cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(asset.id)}
                      className="p-2 text-muted hover:text-loss hover:bg-border rounded-lg transition-colors text-xs"
                      title="削除"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* モーダル */}
      {modalState.open && modalState.initial && (
        <AssetFormModal
          initial={modalState.initial}
          editTarget={modalState.editTarget}
          onSubmit={handleFormSubmit}
          onCancel={() => setModalState({ open: false })}
        />
      )}
    </div>
  );
}
