import { useState, useCallback, useRef } from 'react';
import type { RebalanceTarget, AssetClass } from '../../types';
import { useSettings } from '../../hooks/useSettings';
import { useAssets } from '../../hooks/useAssets';
import { useClaudeAI } from '../../hooks/useClaudeAI';
import { ASSET_CLASS_LABELS } from '../../constants/labels';
import { isAnalysable } from '../../services/claudeService';

const ANALYSABLE_CLASSES: AssetClass[] = [
  'investment_trust', 'domestic_etf', 'foreign_etf',
];

type Section = 'api' | 'profile' | 'fire' | 'rebalance' | 'display' | 'data';

const SECTIONS: { id: Section; label: string; icon: string }[] = [
  { id: 'api',       label: 'AI連携',       icon: '🤖' },
  { id: 'profile',   label: 'プロフィール', icon: '👤' },
  { id: 'fire',      label: 'FIRE目標',     icon: '🔥' },
  { id: 'rebalance', label: 'リバランス',   icon: '⚖️' },
  { id: 'display',   label: '表示設定',     icon: '◑' },
  { id: 'data',      label: 'データ管理',   icon: '◈' },
];

export function SettingsPage() {
  const { settings, updateSettings } = useSettings();
  const { assets, updateAsset } = useAssets();
  const { analysisStates, analyzeAll } = useClaudeAI();

  const [apiKeyInput, setApiKeyInput] = useState(settings.apiKey);
  const [showKey, setShowKey]         = useState(false);
  const [apiSaved, setApiSaved]       = useState(false);
  const [activeSection, setActiveSection] = useState<Section>('api');

  const apiValid = apiKeyInput === '' || apiKeyInput.startsWith('sk-ant-');
  const apiIsSet = apiKeyInput.startsWith('sk-ant-');

  const analysableCount = assets.filter((a) => isAnalysable(a.assetClass) && !a.aiAnalysis).length;
  const analyzingCount  = Object.values(analysisStates).filter((s) => s.status === 'loading').length;
  const doneCount       = Object.values(analysisStates).filter((s) => s.status === 'done').length;

  const handleSaveApiKey = useCallback(() => {
    if (!apiIsSet) return;
    updateSettings({ apiKey: apiKeyInput.trim() });
    setApiSaved(true);
    setTimeout(() => setApiSaved(false), 2000);
  }, [apiKeyInput, apiIsSet, updateSettings]);

  const handleBulkAnalyze = useCallback(() => {
    if (!settings.apiKey) return;
    analyzeAll(assets, settings.apiKey, (id, result) => {
      updateAsset(id, { aiAnalysis: result });
    });
  }, [settings.apiKey, assets, analyzeAll, updateAsset]);

  return (
    <div className="animate-fadein px-5 py-4 sm:px-8 sm:py-6 mx-auto space-y-5">
      {/* Hero */}
      <div className="glow-gold bg-gradient-to-br from-[#1a1520] to-bg border border-border rounded-2xl p-5">
        <div className="text-muted text-xs font-medium uppercase tracking-widest mb-2">設定</div>
        <div className={`font-serif text-2xl font-bold mb-1 ${settings.apiKey ? 'text-gold' : 'text-muted'}`}>
          {settings.apiKey ? 'AI連携済み' : 'APIキー未設定'}
        </div>
        <div className="flex gap-4 text-xs text-muted mt-3 border-t border-border pt-3">
          {settings.apiKey
            ? <span className="text-gain font-semibold">✓ Anthropic API 連携済み</span>
            : <span>AIレポート・分析機能にはAPIキーが必要です</span>
          }
        </div>
      </div>

      {/* Section tabs */}
      <div className="grid grid-cols-3 gap-1.5">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl text-xs font-medium transition-colors ${
              activeSection === s.id
                ? 'bg-gold/15 text-gold'
                : 'text-muted hover:text-text hover:bg-surface-2'
            }`}
          >
            <span className="text-base">{s.icon}</span>
            <span>{s.label}</span>
          </button>
        ))}
      </div>

      {/* ─── AI連携 ─── */}
      {activeSection === 'api' && (
        <div className="space-y-4">
          {/* APIキー */}
          <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔑</span>
              <h2 className="text-text font-semibold">Anthropic APIキー</h2>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted block">APIキー</label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKeyInput}
                  onChange={(e) => { setApiKeyInput(e.target.value); setApiSaved(false); }}
                  placeholder="sk-ant-..."
                  className={`w-full bg-bg border rounded-xl px-4 py-3 text-text font-mono text-sm focus:outline-none pr-20 transition-colors ${
                    apiKeyInput && !apiValid
                      ? 'border-loss/60 focus:border-loss'
                      : apiIsSet
                      ? 'border-gain/50 focus:border-gain/50'
                      : 'border-border focus:border-gold/50'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text text-xs"
                >
                  {showKey ? '隠す' : '表示'}
                </button>
              </div>

              {apiKeyInput && !apiValid && (
                <p className="text-loss text-xs flex items-center gap-1">
                  <span>⚠</span> APIキーは「sk-ant-」で始まる必要があります
                </p>
              )}
              {apiIsSet && (
                <p className="text-gain text-xs flex items-center gap-1">
                  <span>✓</span> 有効なAPIキー形式です
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSaveApiKey}
                disabled={!apiIsSet}
                className="flex-1 bg-gold hover:bg-gold-2 disabled:bg-border disabled:text-muted text-bg rounded-xl py-2.5 text-sm font-semibold transition-colors"
              >
                {apiSaved ? '✓ 保存しました' : 'APIキーを保存'}
              </button>
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-4 py-2.5 bg-surface-2 hover:bg-border text-text rounded-xl text-sm transition-colors border border-border"
              >
                取得 ↗
              </a>
            </div>

            {/* コスト目安 */}
            <div className="bg-surface-2 border border-border rounded-xl p-3 text-xs space-y-1">
              <div className="text-text font-medium">月間API使用料の目安</div>
              <div className="text-muted leading-relaxed">
                AIレポートコメント生成（月1回）：<span className="text-text font-mono">約2〜5円</span><br/>
                銘柄追加時の自動分析（1銘柄あたり）：<span className="text-text font-mono">約0.01〜0.05円</span>
              </div>
              <div className="text-muted/60 mt-1 space-y-0.5">
                <div>※ 銘柄分析: claude-haiku（低コスト）</div>
                <div>※ レポートコメント: claude-sonnet</div>
                <div>※ 同じ銘柄の分析は1回のみ（再登録不要）</div>
              </div>
            </div>

            {/* セキュリティ */}
            <div className="bg-surface-2 border border-border rounded-xl p-3 text-xs text-muted space-y-1 leading-relaxed">
              <div className="text-text font-medium flex items-center gap-1.5"><span className="text-gain">🔒</span> セキュリティ</div>
              <ul className="space-y-0.5">
                <li>・APIキーはブラウザのLocalStorageにのみ保存</li>
                <li>・資産データはサーバーに一切送信されません</li>
                <li>・AI通信はブラウザから直接Anthropic APIへ</li>
              </ul>
            </div>
          </div>

          {/* 一括AI分析 */}
          <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔬</span>
                <h2 className="text-text font-semibold">AI組み入れ分析</h2>
              </div>
              <span className="text-xs text-muted">対象: {analysableCount}銘柄未分析</span>
            </div>

            <div className="text-xs text-muted leading-relaxed">
              投資信託・ETFの組み入れ国・セクター・銘柄をAIで推定します。
            </div>

            {analysableCount > 0 && (
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {assets
                  .filter((a) => isAnalysable(a.assetClass) && !a.aiAnalysis)
                  .map((a) => {
                    const st = analysisStates[a.id];
                    return (
                      <div key={a.id} className="flex items-center gap-2 text-xs py-1">
                        <StatusDot status={st?.status ?? 'idle'} />
                        <span className="text-text truncate flex-1">{a.name}</span>
                        <span className="text-muted flex-shrink-0">{ASSET_CLASS_LABELS[a.assetClass]}</span>
                        {st?.error && <span className="text-loss text-xs">{st.error}</span>}
                      </div>
                    );
                  })}
              </div>
            )}

            {analyzingCount > 0 && (
              <div className="flex items-center gap-2 text-gold text-sm">
                <span className="animate-spin">⟳</span>
                <span>{analyzingCount}銘柄を分析中…（{doneCount}完了）</span>
              </div>
            )}

            <button
              onClick={handleBulkAnalyze}
              disabled={!settings.apiKey || analysableCount === 0 || analyzingCount > 0}
              className="w-full bg-gold hover:bg-gold-2 disabled:bg-border disabled:text-muted text-bg rounded-xl py-3 text-sm font-semibold transition-colors"
            >
              {!settings.apiKey
                ? 'APIキーを先に設定してください'
                : analysableCount === 0
                ? '✓ 全銘柄分析済み'
                : analyzingCount > 0
                ? `分析中…`
                : `${analysableCount}銘柄を一括分析する`
              }
            </button>

            <div className="text-xs text-muted">
              分析対象：{ANALYSABLE_CLASSES.map((c) => ASSET_CLASS_LABELS[c]).join('・')}
            </div>
          </div>
        </div>
      )}

      {/* ─── プロフィール ─── */}
      {activeSection === 'profile' && (
        <div className="space-y-4">
          <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">👤</span>
              <h2 className="text-text font-semibold">プロフィール設定</h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <NumberField
                label="現在の年齢"
                value={settings.currentAge}
                onChange={(v) => updateSettings({ currentAge: v })}
                min={18} max={100} unit="歳"
              />
              <SelectField
                label="リスク許容度"
                value={settings.riskTolerance}
                options={[
                  { value: 'low',    label: '低（安定重視）' },
                  { value: 'medium', label: '中（バランス）' },
                  { value: 'high',   label: '高（成長重視）' },
                ]}
                onChange={(v) => updateSettings({ riskTolerance: v as 'low' | 'medium' | 'high' })}
              />
              <YenField
                label="月々の投資額"
                value={settings.monthlyInvestment}
                onChange={(v) => updateSettings({ monthlyInvestment: v })}
              />
              <YenField
                label="月々の生活費"
                value={settings.monthlyExpense}
                onChange={(v) => updateSettings({ monthlyExpense: v })}
              />
            </div>
          </div>

          {/* 収入設定 */}
          <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">💴</span>
              <h2 className="text-text font-semibold">収入設定</h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <YenField
                label="国民/厚生年金（月額）"
                value={settings.pensionMonthly}
                onChange={(v) => updateSettings({ pensionMonthly: v })}
              />
              <NumberField
                label="年金受取開始年齢"
                value={settings.pensionStartAge}
                onChange={(v) => updateSettings({ pensionStartAge: v })}
                min={60} max={75} unit="歳"
              />
              <YenField
                label="iDeCo受取（月額）"
                value={settings.idecoMonthly ?? 0}
                onChange={(v) => updateSettings({ idecoMonthly: v })}
              />
              <NumberField
                label="iDeCo開始年齢"
                value={settings.idecoStartAge ?? 60}
                onChange={(v) => updateSettings({ idecoStartAge: v })}
                min={60} max={75} unit="歳"
              />
              <YenField
                label="家賃収入（月額）"
                value={settings.rentalMonthly ?? 0}
                onChange={(v) => updateSettings({ rentalMonthly: v })}
              />
              <YenField
                label="パート・副業収入（月額）"
                value={settings.sideIncomeMonthly ?? 0}
                onChange={(v) => updateSettings({ sideIncomeMonthly: v })}
              />
            </div>

            <div className="bg-surface-2 rounded-xl p-3 text-xs text-muted">
              ※ 家賃収入・副業収入は全期間継続と仮定してシミュレーションに反映されます
            </div>
          </div>
        </div>
      )}

      {/* ─── FIRE目標 ─── */}
      {activeSection === 'fire' && (
        <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔥</span>
            <h2 className="text-text font-semibold">FIRE目標設定</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <NumberField
              label="目標FIRE年齢"
              value={settings.targetAge}
              onChange={(v) => updateSettings({ targetAge: v })}
              min={30} max={80} unit="歳"
            />
            <YenField
              label="目標資産額"
              value={settings.targetAmount}
              onChange={(v) => updateSettings({ targetAmount: v })}
            />
          </div>

          <div className="bg-surface-2 rounded-xl p-3 text-xs space-y-1.5">
            <div className="text-muted">現在の設定での試算</div>
            <div className="flex justify-between">
              <span className="text-muted">FIRE達成まで</span>
              <span className="text-text font-mono">{Math.max(settings.targetAge - settings.currentAge, 0)}年</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">目標資産</span>
              <span className="text-text font-mono">¥{(settings.targetAmount / 1e8).toFixed(1)}億</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">4%ルール 安全引出額/年</span>
              <span className="text-text font-mono">¥{(settings.targetAmount * 0.04 / 1e4).toFixed(0)}万</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── リバランス目標 ─── */}
      {activeSection === 'rebalance' && (
        <RebalanceTargetEditor
          targets={settings.rebalanceTargets ?? []}
          onChange={(t: RebalanceTarget[]) => updateSettings({ rebalanceTargets: t })}
        />
      )}

      {/* ─── 表示設定 ─── */}
      {activeSection === 'display' && (
        <div className="space-y-4">
          <div className="bg-surface border border-border rounded-2xl p-5 space-y-5">
            <div className="flex items-center gap-2">
              <span className="text-xl">◑</span>
              <h2 className="text-text font-semibold">表示設定</h2>
            </div>

            {/* 基準通貨 */}
            <div>
              <label className="block text-xs text-muted mb-1.5">基準通貨</label>
              <select
                value={settings.baseCurrency}
                onChange={(e) => updateSettings({ baseCurrency: e.target.value })}
                className="w-full bg-bg border border-border rounded-xl px-3 py-2.5 text-text text-sm focus:outline-none focus:border-gold/50 transition-colors"
              >
                <option value="JPY">JPY — 日本円</option>
                <option value="USD">USD — 米ドル</option>
                <option value="EUR">EUR — ユーロ</option>
              </select>
            </div>

            {/* リスク許容度 */}
            <div>
              <label className="block text-xs text-muted mb-1.5">リスク許容度</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: 'low',    label: '低',    sub: '安定重視' },
                  { value: 'medium', label: '中',    sub: 'バランス' },
                  { value: 'high',   label: '高',    sub: '成長重視' },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updateSettings({ riskTolerance: opt.value })}
                    className={`py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                      settings.riskTolerance === opt.value
                        ? 'border-gold/50 bg-gold/10 text-gold'
                        : 'border-border bg-surface-2 text-muted hover:text-text hover:border-border'
                    }`}
                  >
                    <div>{opt.label}</div>
                    <div className="text-xs font-normal mt-0.5 opacity-70">{opt.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* コストアラート閾値 */}
            <div>
              <label className="block text-xs text-muted mb-1.5">
                コストアラート閾値
                <span className="ml-1 text-muted/60">（この信託報酬率を超えたらアラート）</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={(settings.costAlertThreshold * 100).toFixed(2)}
                  onChange={(e) => updateSettings({ costAlertThreshold: Number(e.target.value) / 100 })}
                  step="0.05"
                  min="0"
                  max="3"
                  className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 text-text font-mono text-sm focus:outline-none focus:border-gold/50 transition-colors pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-sm">%</span>
              </div>
              <p className="text-xs text-muted/60 mt-1">
                現在: {(settings.costAlertThreshold * 100).toFixed(2)}%（推奨: 0.50%以下）
              </p>
            </div>
          </div>

          {/* 為替レート */}
          <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">💱</span>
                <h2 className="text-text font-semibold">為替レート（対円）</h2>
              </div>
              <span className="text-xs text-muted">手動設定</span>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              外貨建て資産の円換算に使用します。定期的に更新してください。
            </p>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(settings.exchangeRates ?? { USD: 150, EUR: 163, GBP: 190, AUD: 98, CAD: 110 }).map(([ccy, rate]) => (
                <div key={ccy}>
                  <label className="block text-xs text-muted mb-1">{ccy} / JPY</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={rate}
                      min={1}
                      step={0.1}
                      onChange={(e) => updateSettings({
                        exchangeRates: {
                          ...(settings.exchangeRates ?? {}),
                          [ccy]: Number(e.target.value),
                        },
                      })}
                      className="w-full bg-bg border border-border rounded-xl px-3 py-2.5 text-text font-mono text-sm focus:outline-none focus:border-gold/50 transition-colors pr-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-xs">円</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── データ管理 ─── */}
      {activeSection === 'data' && (
        <DataManagementSection />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────
// データ管理セクション
// ─────────────────────────────────────────────────
function DataManagementSection() {
  const [resetConfirm, setResetConfirm] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // JSONフルエクスポート（全LocalStorageキー）
  const handleExportJson = () => {
    const KEYS = [
      'portfolio_assets',
      'portfolio_settings',
      'portfolio_snapshots',
    ];
    const data: Record<string, unknown> = { exportedAt: new Date().toISOString() };
    KEYS.forEach((k) => {
      const raw = localStorage.getItem(k);
      if (raw) {
        try { data[k] = JSON.parse(raw); }
        catch { data[k] = raw; }
      }
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // CSVエクスポート（資産データのみ）
  const handleExportCsv = () => {
    const raw = localStorage.getItem('portfolio_assets');
    if (!raw) return;
    const assets = JSON.parse(raw) as Array<Record<string, unknown>>;
    const headers = ['id', 'name', 'assetClass', 'account', 'quantity', 'acquisitionPrice', 'currentPrice', 'currency'];
    const rows = assets.map((a) =>
      headers.map((h) => {
        const v = a[h];
        return typeof v === 'string' && v.includes(',') ? `"${v}"` : String(v ?? '');
      }).join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio_assets_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // JSONインポート
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string) as Record<string, unknown>;
        const KEYS = ['portfolio_assets', 'portfolio_settings', 'portfolio_snapshots'];
        let imported = 0;
        KEYS.forEach((k) => {
          if (data[k] !== undefined) {
            localStorage.setItem(k, JSON.stringify(data[k]));
            imported++;
          }
        });
        if (imported === 0) throw new Error('対応するデータキーが見つかりません');
        setImportStatus('success');
        setImportError('');
        setTimeout(() => setImportStatus('idle'), 3000);
        // ページをリロードして反映
        window.location.reload();
      } catch (err) {
        setImportStatus('error');
        setImportError(err instanceof Error ? err.message : 'ファイルの読み込みに失敗しました');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // 全データリセット
  const handleReset = () => {
    const KEYS = ['portfolio_assets', 'portfolio_settings', 'portfolio_snapshots', 'portfolio_onboarding_complete'];
    KEYS.forEach((k) => localStorage.removeItem(k));
    window.location.reload();
  };

  return (
    <div className="space-y-4">
      {/* エクスポート */}
      <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">◈</span>
          <h2 className="text-text font-semibold">データエクスポート</h2>
        </div>

        <div className="space-y-2">
          <button
            onClick={handleExportJson}
            className="w-full flex items-center gap-3 bg-surface-2 hover:bg-border border border-border rounded-xl px-4 py-3.5 text-sm text-text transition-colors text-left"
          >
            <span className="text-gold text-base">▣</span>
            <div>
              <div className="font-medium">JSONバックアップ（全データ）</div>
              <div className="text-xs text-muted mt-0.5">設定・資産・スナップショットをすべて保存</div>
            </div>
            <span className="ml-auto text-muted text-xs">↓</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="w-full flex items-center gap-3 bg-surface-2 hover:bg-border border border-border rounded-xl px-4 py-3.5 text-sm text-text transition-colors text-left"
          >
            <span className="text-info text-base">◇</span>
            <div>
              <div className="font-medium">CSVエクスポート（資産データ）</div>
              <div className="text-xs text-muted mt-0.5">Excelなどで開ける形式で保存</div>
            </div>
            <span className="ml-auto text-muted text-xs">↓</span>
          </button>
        </div>
      </div>

      {/* インポート */}
      <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">↑</span>
          <h2 className="text-text font-semibold">データインポート</h2>
        </div>

        <p className="text-xs text-muted leading-relaxed">
          JSONバックアップファイルを読み込みます。<br/>
          <span className="text-warn">既存のデータは上書きされます。</span>
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full bg-surface-2 hover:bg-border border border-border rounded-xl py-3 text-sm text-text font-medium transition-colors"
        >
          JSONファイルを選択してインポート
        </button>

        {importStatus === 'success' && (
          <p className="text-gain text-xs flex items-center gap-1">
            <span>✓</span> インポートしました。ページを再読み込みします…
          </p>
        )}
        {importStatus === 'error' && (
          <p className="text-loss text-xs flex items-center gap-1">
            <span>⚠</span> {importError}
          </p>
        )}
      </div>

      {/* リセット */}
      <div className="bg-surface border border-loss/20 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">⚠</span>
          <h2 className="text-text font-semibold">データ全削除</h2>
        </div>

        <p className="text-xs text-muted leading-relaxed">
          すべての資産データ・設定・スナップショットを削除します。<br/>
          <span className="text-loss font-medium">この操作は取り消せません。</span>
        </p>

        {!resetConfirm ? (
          <button
            onClick={() => setResetConfirm(true)}
            className="w-full bg-loss/10 hover:bg-loss/20 border border-loss/30 text-loss rounded-xl py-3 text-sm font-medium transition-colors"
          >
            全データを削除する
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-loss text-xs font-medium text-center">
              本当に全データを削除しますか？
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setResetConfirm(false)}
                className="flex-1 bg-surface-2 hover:bg-border border border-border text-text rounded-xl py-2.5 text-sm transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleReset}
                className="flex-1 bg-loss hover:bg-loss/80 text-bg rounded-xl py-2.5 text-sm font-semibold transition-colors"
              >
                削除を確定
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// 小コンポーネント
// ─────────────────────────────────────────────────
function StatusDot({ status }: { status: string }) {
  const map: Record<string, string> = {
    idle:    'bg-border',
    loading: 'bg-gold animate-pulse',
    done:    'bg-gain',
    error:   'bg-loss',
  };
  return <div className={`w-2 h-2 rounded-full flex-shrink-0 ${map[status] ?? map.idle}`} />;
}

function NumberField({
  label, value, onChange, min, max, unit,
}: {
  label: string; value: number; onChange: (v: number) => void;
  min?: number; max?: number; unit?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-muted mb-1">{label}</label>
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          min={min} max={max}
          className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-text text-sm focus:outline-none focus:border-gold/50 transition-colors pr-8"
        />
        {unit && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted text-xs">{unit}</span>
        )}
      </div>
    </div>
  );
}

function YenField({
  label, value, onChange,
}: {
  label: string; value: number; onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="block text-xs text-muted mb-1">{label}</label>
      <div className="relative">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted text-sm">¥</span>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          min={0}
          step={10000}
          className="w-full bg-bg border border-border rounded-lg pl-6 pr-3 py-2 text-text text-sm focus:outline-none focus:border-gold/50 transition-colors"
        />
      </div>
      <div className="text-xs text-muted/60 mt-0.5">¥{value.toLocaleString()}</div>
    </div>
  );
}

function SelectField({
  label, value, options, onChange,
}: {
  label: string; value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs text-muted mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-text text-sm focus:outline-none focus:border-gold/50 transition-colors"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

// ─────────────────────────────────────────────────
// リバランス目標エディター
// ─────────────────────────────────────────────────
const REBALANCE_CLASSES: AssetClass[] = [
  'investment_trust', 'domestic_etf', 'foreign_etf',
  'domestic_stock', 'foreign_stock', 'crypto',
  'commodity', 'real_estate', 'social_lending', 'cash',
];

function RebalanceTargetEditor({
  targets, onChange,
}: {
  targets: RebalanceTarget[];
  onChange: (t: RebalanceTarget[]) => void;
}) {
  const totalRatio = targets.reduce((s, t) => s + t.targetRatio, 0);

  const update = (idx: number, partial: Partial<RebalanceTarget>) => {
    const next = targets.map((t, i) => i === idx ? { ...t, ...partial } : t);
    onChange(next);
  };

  const add = (assetClass: AssetClass) => {
    onChange([...targets, { assetClass, targetRatio: 0.10, minRatio: 0.05, maxRatio: 0.20 }]);
  };

  const remove = (idx: number) => {
    onChange(targets.filter((_, i) => i !== idx));
  };

  const unusedClasses = REBALANCE_CLASSES.filter(
    (c) => !targets.find((t) => t.assetClass === c)
  );

  return (
    <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">⚖️</span>
          <h2 className="text-text font-semibold">リバランス目標配分</h2>
        </div>
        <div className={`text-xs font-mono px-2 py-1 rounded-full ${
          Math.abs(totalRatio - 1) < 0.01 ? 'bg-gain/10 text-gain' : 'bg-warn/10 text-warn'
        }`}>
          合計 {(totalRatio * 100).toFixed(0)}%
        </div>
      </div>

      {targets.length > 0 ? (
        <div className="space-y-2">
          {targets.map((t, i) => (
            <div key={i} className="bg-surface-2 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-text text-sm font-medium">{ASSET_CLASS_LABELS[t.assetClass]}</span>
                <button onClick={() => remove(i)} className="text-muted hover:text-loss text-xs">✕ 削除</button>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {([['targetRatio', '目標%'], ['minRatio', '下限%'], ['maxRatio', '上限%']] as const).map(([key, label]) => (
                  <div key={key}>
                    <div className="text-muted mb-0.5">{label}</div>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      value={Math.round(t[key] * 100)}
                      onChange={(e) => update(i, { [key]: Number(e.target.value) / 100 })}
                      className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-text text-xs font-mono focus:outline-none focus:border-gold/50"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-muted text-sm">
          アセットクラスを追加して目標配分を設定してください
        </div>
      )}

      {unusedClasses.length > 0 && (
        <div>
          <div className="text-xs text-muted mb-2">追加するアセットクラス</div>
          <div className="flex flex-wrap gap-2">
            {unusedClasses.map((c) => (
              <button
                key={c}
                onClick={() => add(c)}
                className="text-xs px-2.5 py-1.5 bg-surface-2 hover:bg-border border border-border text-text rounded-lg transition-colors"
              >
                + {ASSET_CLASS_LABELS[c]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
