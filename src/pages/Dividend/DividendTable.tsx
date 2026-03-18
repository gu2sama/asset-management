import type { Asset } from '../../types';
import { ACCOUNT_TYPE_LABELS } from '../../constants/labels';
import { NISA_ACCOUNTS, FREQ_LABELS, AFTER_TAX, fmtYen } from './dividendUtils';

interface Props {
  assets: Asset[];
}

export function DividendTable({ assets }: Props) {
  const dividendAssets = assets
    .filter((a) => a.dividendYield && a.dividendYield > 0)
    .sort((a, b) => (b.dividendYield! * b.currentValue) - (a.dividendYield! * a.currentValue));

  if (dividendAssets.length === 0) {
    return (
      <div className="bg-surface-2 border border-border rounded-2xl p-6 text-center">
        <div className="text-4xl mb-3">💸</div>
        <div className="text-muted text-sm">配当利回りが設定された銘柄がありません。</div>
        <div className="text-muted text-xs mt-1">資産入力画面で配当利回りを設定してください。</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto -mx-4 px-4">
        <table className="w-full text-xs min-w-[560px]">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-muted pb-2 font-normal">銘柄</th>
              <th className="text-right text-muted pb-2 px-2 font-normal">評価額</th>
              <th className="text-right text-muted pb-2 px-2 font-normal">利回り</th>
              <th className="text-right text-muted pb-2 px-2 font-normal">年間配当</th>
              <th className="text-center text-muted pb-2 px-2 font-normal">頻度</th>
              <th className="text-center text-muted pb-2 px-2 font-normal">課税</th>
            </tr>
          </thead>
          <tbody>
            {dividendAssets.map((a) => {
              const annual   = (a.dividendYield ?? 0) * a.currentValue;
              const isTaxFree = NISA_ACCOUNTS.includes(a.account);
              const afterTax  = isTaxFree ? annual : annual * AFTER_TAX;
              const freq      = a.dividendFrequency ?? 'quarterly';

              return (
                <tr key={a.id} className="border-b border-border hover:bg-surface-2/30">
                  <td className="py-2.5 pr-2">
                    <div className="text-text font-medium truncate max-w-[140px]">{a.name}</div>
                    <div className="text-muted text-xs">{ACCOUNT_TYPE_LABELS[a.account]}</div>
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-text">
                    {fmtYen(a.currentValue)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono">
                    <span className={
                      (a.dividendYield ?? 0) >= 0.04 ? 'text-gain' :
                      (a.dividendYield ?? 0) >= 0.02 ? 'text-warn' : 'text-text'
                    }>
                      {((a.dividendYield ?? 0) * 100).toFixed(2)}%
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-right">
                    <div className="font-mono text-text">{fmtYen(annual)}</div>
                    {!isTaxFree && (
                      <div className="text-muted text-xs">税後 {fmtYen(afterTax)}</div>
                    )}
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <span className="text-muted">{FREQ_LABELS[freq]}</span>
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    {isTaxFree ? (
                      <span className="px-1.5 py-0.5 rounded-full text-xs bg-emerald-900/40 text-gain border border-gain/30">
                        非課税
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded-full text-xs bg-border text-muted">
                        課税
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-muted text-right">
        ※ 課税口座の税引後は概算（×{AFTER_TAX.toFixed(5)}）
      </div>
    </div>
  );
}
