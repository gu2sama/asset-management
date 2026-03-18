import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../hooks/useSettings';

interface Props {
  onComplete: () => void;
}

type Step = 'welcome' | 'api' | 'assets' | 'done';

export function Onboarding({ onComplete }: Props) {
  const [step, setStep] = useState<Step>('welcome');
  const [apiKey, setApiKey]   = useState('');
  const [showKey, setShowKey] = useState(false);
  const { updateSettings }    = useSettings();
  const navigate = useNavigate();

  const apiValid = apiKey === '' || apiKey.startsWith('sk-ant-');
  const apiSaved = apiKey.startsWith('sk-ant-');

  function handleSaveApi() {
    if (apiKey.startsWith('sk-ant-')) {
      updateSettings({ apiKey: apiKey.trim() });
    }
    setStep('assets');
  }

  function handleSkipApi() {
    setStep('assets');
  }

  function handleGoAssets() {
    onComplete();
    navigate('/assets');
  }

  function handleGoDashboard() {
    onComplete();
    navigate('/');
  }

  return (
    <div className="fixed inset-0 z-50 bg-bg flex flex-col items-center justify-center p-6">
      {/* ── ステップ: ウェルカム ── */}
      {step === 'welcome' && (
        <div className="animate-fadein w-full max-w-sm text-center space-y-8">
          <div className="space-y-3">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gold/15 border border-gold/30 flex items-center justify-center">
              <span className="text-gold font-serif text-2xl font-bold">P</span>
            </div>
            <h1 className="font-serif text-3xl text-text">Portfolio Manager</h1>
            <p className="text-muted text-sm leading-relaxed">
              資産の一元管理・FIRE計画・税金最適化を<br />
              AI と一緒に進める個人向けツールです。
            </p>
          </div>

          <div className="space-y-3 text-left">
            {[
              { icon: '◈', text: 'ポートフォリオを可視化' },
              { icon: '◉', text: 'FIRE達成シミュレーション' },
              { icon: '◑', text: '税金・損出し計算' },
              { icon: '◎', text: '配当カレンダー管理' },
              { icon: '▣', text: 'AIによる運用レポート生成' },
            ].map((f) => (
              <div key={f.text} className="flex items-center gap-3 text-sm text-muted">
                <span className="text-gold text-base w-5 text-center">{f.icon}</span>
                {f.text}
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <button
              onClick={() => setStep('api')}
              className="w-full bg-gold hover:bg-gold-2 text-bg font-semibold rounded-xl py-3.5 text-sm transition-colors"
            >
              はじめる
            </button>
            <p className="text-muted/60 text-xs">
              本アプリはすべてブラウザ内で動作し、資産データはサーバーに送信されません
            </p>
          </div>
        </div>
      )}

      {/* ── ステップ: APIキー設定 ── */}
      {step === 'api' && (
        <div className="animate-fadein w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="text-gold text-3xl">🔑</div>
            <h2 className="font-serif text-2xl text-text">APIキーの設定</h2>
            <p className="text-muted text-sm leading-relaxed">
              AI分析・レポート生成にAnthropicのAPIキーが必要です。<br />
              スキップしても後で設定できます。
            </p>
          </div>

          {/* セキュリティ説明 */}
          <div className="bg-surface border border-border rounded-xl p-4 space-y-2 text-xs text-muted">
            <div className="text-text font-medium text-xs flex items-center gap-2">
              <span className="text-gain">🔒</span> セキュリティについて
            </div>
            <ul className="space-y-1 leading-relaxed">
              <li>・APIキーはブラウザのLocalStorageにのみ保存されます</li>
              <li>・資産データはサーバーに一切送信されません</li>
              <li>・AI通信はブラウザから直接Anthropic APIへ送信されます</li>
            </ul>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted block">Anthropic APIキー</label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-..."
                className={`w-full bg-bg border rounded-xl px-4 py-3 text-text font-mono text-sm focus:outline-none pr-20 transition-colors ${
                  apiKey && !apiValid
                    ? 'border-loss/60 focus:border-loss'
                    : apiSaved
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

            {/* バリデーションメッセージ */}
            {apiKey && !apiValid && (
              <p className="text-loss text-xs flex items-center gap-1">
                <span>⚠</span> APIキーは「sk-ant-」で始まる必要があります
              </p>
            )}
            {apiSaved && (
              <p className="text-gain text-xs flex items-center gap-1">
                <span>✓</span> 有効なAPIキー形式です
              </p>
            )}

            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-gold hover:text-gold-2 mt-1"
            >
              APIキーを取得 (console.anthropic.com) ↗
            </a>
          </div>

          <div className="space-y-2">
            <button
              onClick={handleSaveApi}
              disabled={apiKey !== '' && !apiValid}
              className="w-full bg-gold hover:bg-gold-2 disabled:bg-border disabled:text-muted text-bg font-semibold rounded-xl py-3 text-sm transition-colors"
            >
              {apiSaved ? 'APIキーを保存して次へ' : 'スキップして次へ'}
            </button>
            <button
              onClick={handleSkipApi}
              className="w-full text-muted hover:text-text text-sm py-2 transition-colors"
            >
              後で設定する
            </button>
          </div>
        </div>
      )}

      {/* ── ステップ: 資産入力案内 ── */}
      {step === 'assets' && (
        <div className="animate-fadein w-full max-w-sm text-center space-y-8">
          <div className="space-y-3">
            <div className="text-4xl">✦</div>
            <h2 className="font-serif text-2xl text-text">資産を登録しましょう</h2>
            <p className="text-muted text-sm leading-relaxed">
              保有している株式・ETF・投資信託などを入力してください。<br />
              登録後、すべての機能が利用できます。
            </p>
          </div>

          <div className="bg-surface border border-border rounded-2xl p-5 text-left space-y-3">
            <div className="text-text text-sm font-medium">登録できる資産</div>
            {[
              ['投資信託・ETF', '信託報酬・組み入れ銘柄をAIで分析'],
              ['国内・海外株式', '配当利回り・損益管理'],
              ['NISA・iDeCo', '口座区分別の税務管理'],
              ['現預金・その他', 'ポートフォリオの全体把握'],
            ].map(([title, desc]) => (
              <div key={title} className="flex items-start gap-3">
                <span className="text-gold text-xs mt-0.5">◈</span>
                <div>
                  <div className="text-text text-xs font-medium">{title}</div>
                  <div className="text-muted text-xs">{desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <button
              onClick={handleGoAssets}
              className="w-full bg-gold hover:bg-gold-2 text-bg font-semibold rounded-xl py-3.5 text-sm transition-colors"
            >
              資産入力画面へ
            </button>
            <button
              onClick={handleGoDashboard}
              className="w-full text-muted hover:text-text text-sm py-2 transition-colors"
            >
              ダッシュボードへスキップ
            </button>
          </div>
        </div>
      )}

      {/* ステップインジケーター */}
      <div className="fixed bottom-8 left-0 right-0 flex justify-center gap-2">
        {(['welcome', 'api', 'assets'] as Step[]).map((s) => (
          <div
            key={s}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
              step === s ? 'bg-gold w-4' : 'bg-border'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
