import { useCallback } from 'react';
import type { AppSettings } from '../types';
import { useLocalStorage } from './useLocalStorage';

const STORAGE_KEY = 'portfolio_settings';

const DEFAULT_SETTINGS: AppSettings = {
  apiKey: '',
  baseCurrency: 'JPY',
  riskTolerance: 'medium',
  monthlyInvestment: 50000,
  pensionMonthly: 150000,
  pensionStartAge: 65,
  currentAge: 35,
  targetAmount: 100000000,
  targetAge: 60,
  monthlyExpense: 200000,
  costAlertThreshold: 0.005,
  rebalanceTargets: [],
  idecoMonthly: 0,
  idecoStartAge: 60,
  rentalMonthly: 0,
  sideIncomeMonthly: 0,
  exchangeRates: { USD: 150, EUR: 163, GBP: 190, AUD: 98, CAD: 110 },
};

export function useSettings() {
  const [settings, setSettings] = useLocalStorage<AppSettings>(
    STORAGE_KEY,
    DEFAULT_SETTINGS
  );

  const updateSettings = useCallback(
    (partial: Partial<AppSettings>): void => {
      setSettings((prev) => ({ ...prev, ...partial }));
    },
    [setSettings]
  );

  const resetSettings = useCallback((): void => {
    setSettings(DEFAULT_SETTINGS);
  }, [setSettings]);

  /** FIRE達成までの年数 */
  const yearsToFire = settings.targetAge - settings.currentAge;

  /** 月次投資で目標達成できる想定利回り（逆算・概算） */
  const requiredAnnualReturn = (): number => {
    const n = yearsToFire * 12;
    const pmt = settings.monthlyInvestment;
    const fv = settings.targetAmount;
    if (n <= 0 || pmt <= 0) return 0;
    // 二分法で月次利率を逆算
    let lo = 0;
    let hi = 0.02;
    for (let i = 0; i < 100; i++) {
      const mid = (lo + hi) / 2;
      const calc = mid === 0 ? pmt * n : (pmt * ((1 + mid) ** n - 1)) / mid;
      if (calc < fv) lo = mid;
      else hi = mid;
    }
    return ((lo + hi) / 2) * 12;
  };

  return {
    settings,
    updateSettings,
    resetSettings,
    yearsToFire,
    requiredAnnualReturn,
  };
}
