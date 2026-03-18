import {
  calcFireNeeds, calcFireAchievementAge, checkCoastFire, fmtAsset,
  totalPassiveIncome,
} from './fireUtils';
import { projectValue } from '../FutureProjection/projectionUtils';

interface Props {
  currentAsset: number;
  currentAge: number;
  monthlyContrib: number;
  neutralNetRate: number;
  monthlyExpense: number;
  pensionMonthly: number;
  idecoMonthly: number;
  rentalMonthly: number;
  sideIncomeMonthly: number;
}

function AgeChip({ age, currentAge, isCurrent }: { age: number | null; currentAge: number; isCurrent: boolean }) {
  if (isCurrent) {
    return <span className="text-gain font-mono font-bold text-lg">✅ 達成済み（{currentAge}歳）</span>;
  }
  if (age === null) {
    return <span className="text-loss text-sm">60年以内に達成不可</span>;
  }
  return (
    <span className="text-text font-mono font-bold text-lg">
      {age}歳
      <span className="text-muted text-sm font-normal ml-1.5">（{age - currentAge}年後）</span>
    </span>
  );
}

interface FireRowProps {
  label: string;
  subtitle: string;
  icon: string;
  required: number;
  currentAsset: number;
  achievementAge: number | null;
  currentAge: number;
  achieved: boolean;
  color: string;
  monthlyDrawdown: number;
}

function FireRow({
  label, subtitle, icon, required, currentAsset, achievementAge,
  currentAge, achieved, color, monthlyDrawdown,
}: FireRowProps) {
  const progress = required > 0 ? Math.min(currentAsset / required, 1) : 1;

  return (
    <div className="bg-surface-2 border border-border rounded-2xl p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">{icon}</span>
            <span className="text-text font-semibold">{label}</span>
          </div>
          <div className="text-muted text-xs mt-0.5 ml-7">{subtitle}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted mb-0.5">必要資産</div>
          {required <= 0 ? (
            <div className="text-gain font-semibold text-sm">取り崩し不要</div>
          ) : (
            <div className="text-text font-mono font-semibold text-sm">{fmtAsset(required)}</div>
          )}
        </div>
      </div>

      {required > 0 && (
        <div>
          <div className="flex justify-between text-xs text-muted mb-1">
            <span>達成率 {(progress * 100).toFixed(1)}%</span>
            <span>{fmtAsset(currentAsset)} / {fmtAsset(required)}</span>
          </div>
          <div className="h-2 bg-border rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progress * 100}%`, backgroundColor: achieved ? '#10b981' : color }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-1 border-t border-border">
        <div className="text-xs text-muted">
          月間取り崩し額：<span className="text-text font-mono">{monthlyDrawdown > 0 ? `¥${monthlyDrawdown.toLocaleString()}` : '0円'}</span>
        </div>
        <AgeChip age={achievementAge} currentAge={currentAge} isCurrent={achieved} />
      </div>
    </div>
  );
}

export function FireSimulator({
  currentAsset, currentAge, monthlyContrib, neutralNetRate,
  monthlyExpense, pensionMonthly, idecoMonthly, rentalMonthly, sideIncomeMonthly,
}: Props) {
  const needs = calcFireNeeds(monthlyExpense, pensionMonthly, idecoMonthly, rentalMonthly, sideIncomeMonthly);
  const passive = totalPassiveIncome(pensionMonthly, idecoMonthly, rentalMonthly, sideIncomeMonthly);

  const fullAchieved  = currentAsset >= needs.fullFire || needs.fullFire <= 0;
  const sideAchieved  = currentAsset >= needs.sideFire || needs.sideFire <= 0;
  const coastAchieved = checkCoastFire(currentAsset, currentAge, neutralNetRate, needs.fullFire);

  const fullAge  = calcFireAchievementAge(currentAsset, currentAge, monthlyContrib, neutralNetRate, needs.fullFire);
  const sideAge  = calcFireAchievementAge(currentAsset, currentAge, monthlyContrib, neutralNetRate, needs.sideFire);

  // コーストFIRE達成年齢（積立なしで65歳時に目標到達できる年齢）
  let coastAchievedAge: number | null = null;
  if (coastAchieved) {
    coastAchievedAge = currentAge;
  } else {
    for (let y = 1; y <= 60; y++) {
      const projected = projectValue(currentAsset, neutralNetRate, y, monthlyContrib);
      if (projectValue(projected, neutralNetRate, Math.max(65 - (currentAge + y), 0), 0) >= needs.fullFire) {
        coastAchievedAge = currentAge + y;
        break;
      }
    }
  }

  return (
    <div className="space-y-4">
      {/* 収入・生活費サマリー */}
      <div className="bg-surface-2 border border-border rounded-2xl p-4 space-y-3">
        <h3 className="text-text text-sm font-semibold">収支サマリー（設定値）</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <InfoRow label="月間生活費" value={`¥${monthlyExpense.toLocaleString()}`} />
          <InfoRow label="受動的収入合計" value={`¥${passive.toLocaleString()}`} valueColor="text-gain" />
          <InfoRow label="　うち年金" value={`¥${pensionMonthly.toLocaleString()}`} />
          {idecoMonthly > 0 && <InfoRow label="　うちiDeCo" value={`¥${idecoMonthly.toLocaleString()}`} />}
          {rentalMonthly > 0 && <InfoRow label="　うち家賃収入" value={`¥${rentalMonthly.toLocaleString()}`} />}
          {sideIncomeMonthly > 0 && <InfoRow label="　うち副業" value={`¥${sideIncomeMonthly.toLocaleString()}`} />}
        </div>
        <div className="text-xs text-muted border-t border-border pt-2">
          ※ 4%ルール：必要取り崩し額 × 12ヶ月 × 25倍で必要資産を試算
        </div>
      </div>

      {/* フルFIRE */}
      <FireRow
        label="フルFIRE"
        subtitle="完全リタイア。投資収益のみで生活"
        icon="🔥"
        required={needs.fullFire}
        currentAsset={currentAsset}
        achievementAge={fullAge}
        currentAge={currentAge}
        achieved={fullAchieved}
        color="#f97316"
        monthlyDrawdown={needs.fullFireMonthlyDrawdown}
      />

      {/* サイドFIRE */}
      <FireRow
        label="サイドFIRE"
        subtitle="月15万の副収入と組み合わせてリタイア"
        icon="⚡"
        required={needs.sideFire}
        currentAsset={currentAsset}
        achievementAge={sideAge}
        currentAge={currentAge}
        achieved={sideAchieved}
        color="#6366f1"
        monthlyDrawdown={needs.sideFireMonthlyDrawdown}
      />

      {/* コーストFIRE */}
      <div className="bg-surface-2 border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🌊</span>
              <span className="text-text font-semibold">コーストFIRE</span>
            </div>
            <div className="text-muted text-xs mt-0.5 ml-7">
              積立停止でも65歳時に自然成長でフルFIRE達成できる状態
            </div>
          </div>
        </div>

        <div className="bg-surface-2/70 rounded-xl p-3 text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-muted">65歳時の目標資産</span>
            <span className="text-text font-mono">{fmtAsset(needs.fullFire)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">現資産を{Math.max(65 - currentAge, 0)}年複利運用した場合</span>
            <span className="text-text font-mono">
              {fmtAsset(projectValue(currentAsset, neutralNetRate, Math.max(65 - currentAge, 0), 0))}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-border">
          <div className="text-xs text-muted">
            実質リターン<span className="text-text font-mono ml-1">{(neutralNetRate * 100).toFixed(2)}%</span>で試算
          </div>
          {coastAchieved ? (
            <span className="text-gain font-semibold text-sm">✅ コーストFIRE達成済み</span>
          ) : coastAchievedAge !== null ? (
            <span className="text-info font-mono font-bold text-lg">
              {coastAchievedAge}歳
              <span className="text-muted text-sm font-normal ml-1.5">（{coastAchievedAge - currentAge}年後）</span>
            </span>
          ) : (
            <span className="text-loss text-sm">60年以内に達成不可</span>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, valueColor = 'text-text' }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className="text-muted">{label}</span>
      <span className={`font-mono ${valueColor}`}>{value}</span>
    </div>
  );
}
