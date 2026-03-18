import { useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { DividendRecord, AccountType, Asset } from '../types';
import { useLocalStorage } from './useLocalStorage';

const STORAGE_KEY = 'portfolio_dividends';

const TAX_FREE_ACCOUNTS: AccountType[] = ['nisa_growth', 'nisa_tsumitate', 'ideco'];

export function useDividends() {
  const [dividends, setDividends] = useLocalStorage<DividendRecord[]>(
    STORAGE_KEY,
    []
  );

  const addDividend = useCallback(
    (
      input: Omit<DividendRecord, 'id' | 'isTaxFree'>
    ): DividendRecord => {
      const record: DividendRecord = {
        ...input,
        id: uuidv4(),
        isTaxFree: TAX_FREE_ACCOUNTS.includes(input.account),
      };
      setDividends((prev) => [...prev, record]);
      return record;
    },
    [setDividends]
  );

  const deleteDividend = useCallback(
    (id: string): void => {
      setDividends((prev) => prev.filter((d) => d.id !== id));
    },
    [setDividends]
  );

  /** 資産一覧から今年の予想配当を自動計算 */
  const estimateAnnualDividend = useCallback(
    (assets: Asset[]): Record<string, number> => {
      const result: Record<string, number> = {};
      for (const a of assets) {
        if (a.dividendYield) {
          result[a.id] = a.dividendYield * a.currentValue;
        }
      }
      return result;
    },
    []
  );

  // ── 集計 ────────────────────────────────────────

  const totalByYear = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of dividends) {
      const year = d.receivedDate.slice(0, 4);
      map.set(year, (map.get(year) ?? 0) + d.amountYen);
    }
    return Object.fromEntries(map);
  }, [dividends]);

  const totalByMonth = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of dividends) {
      const ym = d.receivedDate.slice(0, 7); // 'YYYY-MM'
      map.set(ym, (map.get(ym) ?? 0) + d.amountYen);
    }
    return Object.fromEntries(map);
  }, [dividends]);

  /** 月別配当カレンダー用（当年） */
  const currentYearMonthlyDividends = useMemo(() => {
    const year = new Date().getFullYear().toString();
    const result: number[] = Array(12).fill(0);
    for (const d of dividends) {
      if (d.receivedDate.startsWith(year)) {
        const month = parseInt(d.receivedDate.slice(5, 7), 10) - 1;
        result[month] += d.amountYen;
      }
    }
    return result;
  }, [dividends]);

  const taxFreeTotal = useMemo(
    () => dividends.filter((d) => d.isTaxFree).reduce((s, d) => s + d.amountYen, 0),
    [dividends]
  );

  const taxableTotal = useMemo(
    () => dividends.filter((d) => !d.isTaxFree).reduce((s, d) => s + d.amountYen, 0),
    [dividends]
  );

  return {
    dividends,
    addDividend,
    deleteDividend,
    estimateAnnualDividend,
    totalByYear,
    totalByMonth,
    currentYearMonthlyDividends,
    taxFreeTotal,
    taxableTotal,
  };
}
