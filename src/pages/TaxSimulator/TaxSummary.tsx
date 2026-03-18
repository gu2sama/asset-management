import { useState } from 'react';
import type { TaxSimulatorResult } from '../../hooks/useTaxSimulator';
import { TAX_RATE, INCOME_TAX, RESIDENT_TAX, fmtYen } from './taxUtils';

interface Props {
  result: TaxSimulatorResult;
  annualDividendYen: number;
}

export function TaxSummary({ result, annualDividendYen }: Props) {
  const [confirmedGain, setConfirmedGain]   = useState(0);
  const [confirmedLoss, setConfirmedLoss]   = useState(0);
  const [carryoverLoss, setCarryoverLoss]   = useState(0); // 前年からの繰越損失

  const netGain = Math.max(
    confirmedGain - confirmedLoss - carryoverLoss,
    0
  );
  const finalTax = netGain * TAX_RATE;
  const nextYearCarryover = Math.max(
    confirmedLoss + carryoverLoss - confirmedGain,
    0
  );

  const incomeTaxAmount   = finalTax * (INCOME_TAX / TAX_RATE);
  const residentTaxAmount = finalTax * (RESIDENT_TAX / TAX_RATE);

  const [pdfNote, setPdfNote] = useState(false);

  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-4">
      {/* 年間確定損益入力 */}
      <div className="bg-surface-2 border border-border rounded-2xl p-4 space-y-4">
        <h3 className="text-text text-sm font-semibold">{currentYear}年の確定損益（手動入力）</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted mb-1 block">年間確定利益</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gain text-sm">¥</span>
              <input
                type="number" min="0" step="10000"
                value={confirmedGain || ''}
                onChange={(e) => setConfirmedGain(Math.max(0, Number(e.target.value)))}
                placeholder="0"
                className="w-full bg-bg border border-border rounded-xl pl-7 pr-3 py-2.5 text-text text-sm font-mono focus:outline-none focus:border-gold/50"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted mb-1 block">年間確定損失</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-loss text-sm">¥</span>
              <input
                type="number" min="0" step="10000"
                value={confirmedLoss || ''}
                onChange={(e) => setConfirmedLoss(Math.max(0, Number(e.target.value)))}
                placeholder="0"
                className="w-full bg-bg border border-border rounded-xl pl-7 pr-3 py-2.5 text-text text-sm font-mono focus:outline-none focus:border-gold/50"
              />
            </div>
          </div>
          <div className="col-span-2">
            <label className="text-xs text-muted mb-1 block">前年からの繰越損失（ある場合）</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-info text-sm">¥</span>
              <input
                type="number" min="0" step="10000"
                value={carryoverLoss || ''}
                onChange={(e) => setCarryoverLoss(Math.max(0, Number(e.target.value)))}
                placeholder="0"
                className="w-full bg-bg border border-border rounded-xl pl-7 pr-3 py-2.5 text-text text-sm font-mono focus:outline-none focus:border-gold/50"
              />
            </div>
            <div className="text-xs text-muted mt-0.5">証券会社の「繰越損失残高」を確認</div>
          </div>
        </div>
      </div>

      {/* 確定申告サマリー */}
      <div className="bg-surface border border-border rounded-2xl p-5 space-y-2.5">
        <div className="text-muted text-xs font-medium mb-3">{currentYear}年 確定申告 概算サマリー</div>

        {/* 特定口座損益 */}
        <SummaryRow label="特定口座 年間確定利益" value={`+${fmtYen(confirmedGain)}`} valueClass="text-gain" />
        <SummaryRow label="特定口座 年間確定損失" value={`−${fmtYen(confirmedLoss)}`} valueClass="text-loss" />
        {carryoverLoss > 0 && (
          <SummaryRow label="前年繰越損失（控除）" value={`−${fmtYen(carryoverLoss)}`} valueClass="text-info" />
        )}

        <div className="border-t border-border my-1" />

        <SummaryRow
          label="損益通算後の課税対象"
          value={netGain > 0 ? `+${fmtYen(netGain)}` : '¥0（課税なし）'}
          valueClass={netGain > 0 ? 'text-warn font-semibold' : 'text-gain font-semibold'}
          large
        />

        {/* 配当 */}
        {annualDividendYen > 0 && (
          <>
            <div className="border-t border-border my-1" />
            <SummaryRow label="予測配当収入（課税口座）" value={`+${fmtYen(annualDividendYen)}`} valueClass="text-text" />
          </>
        )}

        {/* 税額内訳 */}
        {finalTax > 0 && (
          <>
            <div className="border-t border-border my-1" />
            <SummaryRow label={`所得税（${(INCOME_TAX * 100).toFixed(3)}%）`} value={fmtYen(incomeTaxAmount)} valueClass="text-warn" />
            <SummaryRow label={`住民税（${(RESIDENT_TAX * 100).toFixed(1)}%）`} value={fmtYen(residentTaxAmount)} valueClass="text-warn" />
          </>
        )}

        <div className="border-t border-border mt-2 pt-3">
          <div className="flex justify-between items-end">
            <span className="text-text font-semibold">概算税額合計</span>
            <span className={`font-mono font-bold text-2xl ${finalTax > 0 ? 'text-warn' : 'text-gain'}`}>
              {finalTax > 0 ? fmtYen(finalTax) : '¥0'}
            </span>
          </div>
        </div>

        {nextYearCarryover > 0 && (
          <div className="bg-info/10 border border-info/30 rounded-xl px-3 py-2.5 mt-2">
            <div className="text-info text-xs font-semibold">翌年への繰越損失</div>
            <div className="text-info font-mono font-bold text-lg">{fmtYen(nextYearCarryover)}</div>
            <div className="text-info/70 text-xs">来年以降3年間、利益と相殺できます（確定申告要）</div>
          </div>
        )}
      </div>

      {/* 現在の含み益サマリー（参考） */}
      <div className="bg-surface-2 border border-border rounded-2xl p-4 space-y-2">
        <h3 className="text-text text-sm font-semibold">現在の含み益・損（参考）</h3>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-surface-2/70 rounded-xl p-3">
            <div className="text-muted text-xs mb-1">課税口座 含み益</div>
            <div className="text-gain font-mono font-semibold">{fmtYen(result.totalGain)}</div>
            <div className="text-muted/60 text-xs">税{fmtYen(result.totalGain * TAX_RATE)}</div>
          </div>
          <div className="bg-surface-2/70 rounded-xl p-3">
            <div className="text-muted text-xs mb-1">課税口座 含み損</div>
            <div className="text-loss font-mono font-semibold">−{fmtYen(result.totalLoss)}</div>
            <div className="text-muted/60 text-xs">損出し可能</div>
          </div>
          <div className="bg-surface-2/70 rounded-xl p-3">
            <div className="text-muted text-xs mb-1">NISA 含み益</div>
            <div className="text-info font-mono font-semibold">{fmtYen(result.nisaUnrealizedGain)}</div>
            <div className="text-muted/60 text-xs">非課税</div>
          </div>
        </div>
      </div>

      {/* PDFボタン */}
      <button
        onClick={() => setPdfNote(true)}
        className="w-full bg-border hover:bg-border text-text rounded-2xl py-3 text-sm font-medium transition-colors"
      >
        📄 この情報をPDFレポートに追加
      </button>
      {pdfNote && (
        <div className="bg-gold/10 border border-gold/30 rounded-xl px-3 py-2 text-xs text-gold">
          PDFレポート機能は今後実装予定です。現在は画面コピー等でご活用ください。
        </div>
      )}

      {/* 免責事項 */}
      <div className="bg-surface-2 border border-border rounded-xl p-4 text-xs text-muted space-y-1 leading-relaxed">
        <div className="text-muted font-medium">免責事項</div>
        <div>
          本シミュレーションは概算値です。正確な税額は証券会社の年間取引報告書を確認し、
          必要に応じて税理士にご相談ください。
        </div>
        <div>税率は2024年現在の申告分離課税率（所得税15.315%＋住民税5%）を適用しています。</div>
        <div>損益通算・繰越控除の利用には確定申告が必要です。</div>
      </div>
    </div>
  );
}

function SummaryRow({
  label, value, valueClass, large = false,
}: {
  label: string;
  value: string;
  valueClass: string;
  large?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className={`text-muted ${large ? 'font-semibold text-sm' : 'text-xs'}`}>{label}</span>
      <span className={`font-mono ${large ? 'text-base font-bold' : 'text-sm'} ${valueClass}`}>{value}</span>
    </div>
  );
}
