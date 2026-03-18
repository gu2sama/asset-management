import { useState, useMemo } from 'react';
import type { Asset } from '../../types';
import {
  calcNisaMigration, calcNisaRemain, TAXABLE_ACCOUNTS,
  NISA_SEICHOU_LIFETIME, fmtYen,
} from './taxUtils';

interface Props {
  assets: Asset[];
}

export function NisaMigration({ assets }: Props) {
  const [selectedId, setSelectedId] = useState<string>('');

  const nisaRemain = useMemo(() => calcNisaRemain(assets), [assets]);

  const taxableAssets = useMemo(
    () => assets
      .filter((a) => TAXABLE_ACCOUNTS.includes(a.account) && a.acquisitionPrice !== undefined)
      .sort((a, b) => b.currentValue - a.currentValue),
    [assets]
  );

  const selectedAsset = taxableAssets.find((a) => a.id === selectedId);

  const migration = useMemo(
    () => selectedAsset ? calcNisaMigration(selectedAsset, nisaRemain) : null,
    [selectedAsset, nisaRemain]
  );

  return (
    <div className="space-y-4">
      {/* NISA残枠 */}
      <div className="bg-surface-2 border border-border rounded-2xl p-4 space-y-3">
        <h3 className="text-text text-sm font-semibold">現在のNISA枠残高</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface-2/70 rounded-xl p-3">
            <div className="text-muted text-xs mb-1">成長投資枠</div>
            <div className="text-text font-mono font-bold">{fmtYen(nisaRemain.seichouRemain)}</div>
            <div className="text-muted text-xs mt-0.5">残り / 生涯{fmtYen(NISA_SEICHOU_LIFETIME)}</div>
            <div className="mt-2 h-1.5 bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-gain rounded-full progress-bar"
                style={{ width: `${Math.min(nisaRemain.seichouUsed / NISA_SEICHOU_LIFETIME * 100, 100)}%` }}
              />
            </div>
          </div>
          <div className="bg-surface-2/70 rounded-xl p-3">
            <div className="text-muted text-xs mb-1">つみたて投資枠</div>
            <div className="text-text font-mono font-bold">{fmtYen(nisaRemain.tsumitateRemain)}</div>
            <div className="text-muted text-xs mt-0.5">残り / 生涯600万円</div>
            <div className="mt-2 h-1.5 bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-info rounded-full progress-bar"
                style={{ width: `${Math.min(nisaRemain.tsumitateUsed / 6_000_000 * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 銘柄選択 */}
      <div className="bg-surface-2 border border-border rounded-2xl p-4 space-y-3">
        <h3 className="text-text text-sm font-semibold">移行したい銘柄を選択</h3>
        <div className="text-xs text-muted mb-1">
          NISA移行 = 特定口座で売却 → NISA枠で買い直し（成長投資枠利用）
        </div>

        {taxableAssets.length === 0 ? (
          <div className="text-muted text-sm py-2">
            取得価格が設定された特定口座の銘柄がありません。
          </div>
        ) : (
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-text text-sm focus:outline-none focus:border-gold/50"
          >
            <option value="">銘柄を選択…</option>
            {taxableAssets.map((a) => {
              const gain = (a.currentValue - (a.acquisitionPrice ?? a.currentValue));
              const gainStr = gain >= 0 ? `+${fmtYen(gain)}` : fmtYen(gain);
              return (
                <option key={a.id} value={a.id}>
                  {a.name} （{fmtYen(a.currentValue)} / 損益: {gainStr}）
                </option>
              );
            })}
          </select>
        )}
      </div>

      {/* 移行シミュレーション結果 */}
      {migration && selectedAsset && (
        <div className="space-y-3">
          {/* 可否判定 */}
          <div className={`border rounded-2xl p-4 ${
            migration.canMigrate
              ? 'border-gain/30 bg-gain/10'
              : 'border-loss/30 bg-loss/10'
          }`}>
            <div className={`font-semibold text-sm ${migration.canMigrate ? 'text-gain' : 'text-loss'}`}>
              {migration.canMigrate
                ? '✅ NISA枠内に移行可能です'
                : `❌ NISA成長投資枠が不足しています（不足: ${fmtYen(migration.nisaRequired - nisaRemain.seichouRemain)}）`}
            </div>
            <div className="text-muted text-xs mt-1">
              必要枠: {fmtYen(migration.nisaRequired)}
              {' '}/ 残枠: {fmtYen(nisaRemain.seichouRemain)}（成長投資枠）
            </div>
          </div>

          {/* コスト・効果 */}
          <div className="bg-surface-2 border border-border rounded-2xl p-4 space-y-4">
            <h3 className="text-text text-sm font-semibold">NISA移行の試算</h3>

            {/* 移行コスト */}
            <div className="space-y-2">
              <div className="text-muted text-xs font-medium">【移行コスト】売却時の税金</div>
              <div className="bg-surface-2/70 rounded-xl p-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted text-xs">現在評価額</span>
                  <span className="font-mono">{fmtYen(migration.currentValue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted text-xs">取得価格</span>
                  <span className="font-mono">{fmtYen(selectedAsset.acquisitionPrice ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted text-xs">含み益</span>
                  <span className={`font-mono font-semibold ${migration.capitalGain > 0 ? 'text-gain' : 'text-muted'}`}>
                    {migration.capitalGain > 0 ? '+' : ''}{fmtYen(migration.capitalGain)}
                  </span>
                </div>
                <div className="border-t border-border pt-1.5 flex justify-between">
                  <span className="text-text font-medium text-xs">移行コスト（売却税）</span>
                  <span className="text-warn font-mono font-bold">
                    {migration.capitalGain > 0 ? fmtYen(migration.migrationCost) : '¥0（含み益なし）'}
                  </span>
                </div>
              </div>
            </div>

            {/* 年間節税効果 */}
            <div className="space-y-2">
              <div className="text-muted text-xs font-medium">【年間節税効果】</div>
              <div className="bg-surface-2/70 rounded-xl p-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted text-xs">配当税の節約</span>
                  <span className="text-gain font-mono">
                    {migration.annualDivSaving > 0 ? fmtYen(migration.annualDivSaving) : '配当なし'}
                    {selectedAsset.dividendYield && (
                      <span className="text-muted text-xs ml-1">
                        (利回り{(selectedAsset.dividendYield * 100).toFixed(2)}%)
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted text-xs">値上がり益の非課税効果（年5%仮定）</span>
                  <span className="text-gain font-mono">{fmtYen(migration.annualCapGainSaving)}</span>
                </div>
                <div className="border-t border-border pt-1.5 flex justify-between">
                  <span className="text-text font-medium text-xs">年間節税効果（合計）</span>
                  <span className="text-gain font-mono font-bold">{fmtYen(migration.totalAnnualSaving)}/年</span>
                </div>
              </div>
            </div>

            {/* 10年試算・損益分岐点 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-2/70 rounded-xl p-3">
                <div className="text-muted text-xs mb-1">10年間の節税効果（試算）</div>
                <div className="text-gain font-mono font-bold">{fmtYen(migration.tenYearSaving)}</div>
                <div className="text-muted text-xs mt-0.5">※5%/年の成長を仮定</div>
              </div>
              <div className="bg-surface-2/70 rounded-xl p-3">
                <div className="text-muted text-xs mb-1">損益分岐点</div>
                {migration.breakEvenYears !== null ? (
                  migration.breakEvenYears <= 0.1 ? (
                    <div className="text-gain font-mono font-bold">即時回収</div>
                  ) : (
                    <>
                      <div className="text-text font-mono font-bold">
                        約{migration.breakEvenYears.toFixed(1)}年後
                      </div>
                      <div className="text-muted text-xs mt-0.5">コスト回収の見込み</div>
                    </>
                  )
                ) : (
                  <div className="text-muted text-sm">計算不可</div>
                )}
              </div>
            </div>

            {migration.capitalGain <= 0 && (
              <div className="bg-gain/10 border border-gain/30 rounded-xl px-3 py-2 text-xs text-gain">
                ✅ 含み益がないため移行コストゼロで移行できます。NISA移行を強くおすすめします。
              </div>
            )}

            {migration.breakEvenYears !== null && migration.breakEvenYears > 10 && (
              <div className="bg-warn/10 border border-warn/30 rounded-xl px-3 py-2 text-xs text-warn">
                ⚠ 損益分岐点が10年超のため、移行コストの回収に時間がかかります。
                含み益が大きい場合は移行タイミングを検討してください。
              </div>
            )}
          </div>
        </div>
      )}

      {/* 注意事項 */}
      <div className="bg-surface-2 border border-border rounded-xl p-3 text-xs text-muted space-y-1 leading-relaxed">
        <div>・NISA移行は「売却→買い直し」のため、価格変動リスクがあります</div>
        <div>・移行コスト（税金）は現金での納付が必要です（源泉徴収口座では自動）</div>
        <div>・成長投資枠の年間上限は240万円、生涯上限は1,200万円です（2024年新NISA）</div>
        <div>・計算は概算です。正確な数値は証券会社や税理士にご確認ください</div>
      </div>
    </div>
  );
}
