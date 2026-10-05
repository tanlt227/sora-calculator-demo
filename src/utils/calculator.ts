import {
  CompoundedResult,
  CompoundingDayDetail,
  LoanInput,
  LoanSummary,
  MonthlyAmortizationRow,
  SoraDailyRate,
} from '../types/sora';
import {
  getCalendarDaysCovered,
  isSgBusinessDay,
  formatDateISO,
} from '../services/masRatesData';

/**
 * Calculates MAS SC-SIBOR standard daily compounding of SORA overnight rates
 * Convention: Actual/365 day count convention
 * Formula: [ Product_{i=1}^{d_b} (1 + (r_i * n_i / 365)) - 1 ] * (365 / d) * 100%
 */
export function calculateCompoundedSoraInArrears(
  dailyRates: SoraDailyRate[],
  startDateStr: string,
  endDateStr: string
): CompoundedResult {
  // Filter and sort rates within the observation date window (chronological)
  const ratesMap = new Map<string, SoraDailyRate>();
  dailyRates.forEach((r) => ratesMap.set(r.date, r));

  const start = new Date(startDateStr + 'T00:00:00Z');
  const end = new Date(endDateStr + 'T00:00:00Z');

  // Find business days in range
  const details: CompoundingDayDetail[] = [];
  let cumulative = 1.0;
  let totalCalendarDays = 0;

  const cur = new Date(start);
  while (cur <= end) {
    const curStr = formatDateISO(cur);
    if (isSgBusinessDay(curStr)) {
      const match = ratesMap.get(curStr);
      // Fallback rate if date not in seed: use average ~3.05%
      const r_percent = match ? match.overnightRate : 3.05;
      const r_decimal = r_percent / 100;
      const n_i = getCalendarDaysCovered(curStr);

      // (1 + r_i * n_i / 365)
      const dailyFactor = 1 + (r_decimal * n_i) / 365;
      cumulative *= dailyFactor;
      totalCalendarDays += n_i;

      const dayOfWeek = cur.toLocaleDateString('en-SG', {
        weekday: 'short',
        timeZone: 'UTC',
      });

      details.push({
        date: curStr,
        dayOfWeek,
        overnightRate: r_percent,
        decimalRate: r_decimal,
        calendarDays: n_i,
        dailyFactor,
        cumulativeProduct: cumulative,
      });
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  const businessDaysCount = details.length;
  const d = totalCalendarDays > 0 ? totalCalendarDays : 1;

  // Annualized Compounded SORA rate in %
  const compoundedAnnualRate = (cumulative - 1) * (365 / d) * 100;
  const roundedRate = Math.round(compoundedAnnualRate * 10000) / 10000;

  return {
    compoundedRate: roundedRate,
    annualizedRate: roundedRate,
    startDate: startDateStr,
    endDate: endDateStr,
    businessDaysCount,
    calendarDaysTotal: totalCalendarDays,
    details,
    method: 'MAS_SC_SIBOR_ACT_365',
  };
}

/**
 * Computes standard monthly installment (Equal Monthly Installment EMI)
 */
export function calculateMonthlyInstallment(
  principal: number,
  annualInterestRatePercent: number,
  tenureYears: number
): number {
  if (principal <= 0 || tenureYears <= 0) return 0;
  if (annualInterestRatePercent <= 0) {
    return principal / (tenureYears * 12);
  }

  const monthlyRate = annualInterestRatePercent / 100 / 12;
  const totalMonths = tenureYears * 12;
  const factor = Math.pow(1 + monthlyRate, totalMonths);
  const emi = (principal * monthlyRate * factor) / (factor - 1);

  return Math.round(emi * 100) / 100;
}

/**
 * Full loan calculation with monthly amortization schedule & MAS TDSR stress test
 */
export function computeLoanSummary(
  input: LoanInput,
  latestSoraBenchmarks: {
    overnight: number;
    compounded1M: number;
    compounded3M: number;
    compounded6M: number;
  }
): LoanSummary {
  // Determine base SORA benchmark
  let soraBaseRate = 0;
  if (input.useCustomRate && input.customSoraRate !== undefined) {
    soraBaseRate = input.customSoraRate;
  } else {
    switch (input.benchmarkTenure) {
      case '1M':
        soraBaseRate = latestSoraBenchmarks.compounded1M;
        break;
      case '3M':
        soraBaseRate = latestSoraBenchmarks.compounded3M;
        break;
      case '6M':
        soraBaseRate = latestSoraBenchmarks.compounded6M;
        break;
      case 'overnight':
        soraBaseRate = latestSoraBenchmarks.overnight;
        break;
    }
  }

  const bankSpread = input.bankSpread;
  let effectiveAnnualRate = soraBaseRate + bankSpread;
  if (input.rateFloor !== undefined && effectiveAnnualRate < input.rateFloor) {
    effectiveAnnualRate = input.rateFloor;
  }
  effectiveAnnualRate = Math.round(effectiveAnnualRate * 10000) / 10000;

  const totalMonths = Math.max(1, input.tenureYears * 12);
  const monthlyRate = effectiveAnnualRate / 100 / 12;

  let monthlyInstallment = 0;
  if (input.repaymentType === 'interest_only') {
    monthlyInstallment = Math.round(input.loanAmount * monthlyRate * 100) / 100;
  } else {
    monthlyInstallment = calculateMonthlyInstallment(
      input.loanAmount,
      effectiveAnnualRate,
      input.tenureYears
    );
  }

  // Generate monthly amortization schedule
  let balance = input.loanAmount;
  let cumulativeInterest = 0;
  let cumulativePrincipal = 0;
  let firstYearTotalInterest = 0;

  const schedule: MonthlyAmortizationRow[] = [];
  const startDt = new Date(input.startDate || '2026-10-01');

  for (let month = 1; month <= totalMonths; month++) {
    const interestForMonth = Math.round(balance * monthlyRate * 100) / 100;
    let principalForMonth = 0;
    let actualPayment = 0;

    if (input.repaymentType === 'interest_only') {
      principalForMonth = 0;
      actualPayment = interestForMonth;
      if (month === totalMonths) {
        // Balloon principal at end
        principalForMonth = balance;
        actualPayment += principalForMonth;
      }
    } else {
      if (month === totalMonths) {
        principalForMonth = balance;
        actualPayment = principalForMonth + interestForMonth;
      } else {
        principalForMonth = Math.min(
          balance,
          Math.max(0, monthlyInstallment - interestForMonth)
        );
        actualPayment = principalForMonth + interestForMonth;
      }
    }

    const endingBal = Math.max(0, balance - principalForMonth);
    cumulativeInterest += interestForMonth;
    cumulativePrincipal += principalForMonth;

    if (month <= 12) {
      firstYearTotalInterest += interestForMonth;
    }

    const rowDate = new Date(startDt);
    rowDate.setMonth(rowDate.getMonth() + (month - 1));
    const dateFormatted = rowDate.toLocaleDateString('en-SG', {
      month: 'short',
      year: 'numeric',
    });

    schedule.push({
      period: month,
      date: dateFormatted,
      beginningBalance: balance,
      monthlyPayment: Math.round(actualPayment * 100) / 100,
      principalPaid: Math.round(principalForMonth * 100) / 100,
      interestPaid: Math.round(interestForMonth * 100) / 100,
      endingBalance: Math.round(endingBal * 100) / 100,
      cumulativeInterest: Math.round(cumulativeInterest * 100) / 100,
      cumulativePrincipal: Math.round(cumulativePrincipal * 100) / 100,
      effectiveRate: effectiveAnnualRate,
    });

    balance = endingBal;
    if (balance <= 0.01) break;
  }

  // MAS Medium-Term Stress Test (MAS Notice 645 benchmark minimum 4.0% p.a. for residential mortgages)
  const masStressTestRate = 4.0;
  const masStressPayment = calculateMonthlyInstallment(
    input.loanAmount,
    masStressTestRate,
    input.tenureYears
  );
  const stressDeltaMonthly = Math.round((masStressPayment - monthlyInstallment) * 100) / 100;

  const totalRepayment = Math.round((input.loanAmount + cumulativeInterest) * 100) / 100;

  return {
    monthlyInstallment,
    firstYearTotalInterest: Math.round(firstYearTotalInterest * 100) / 100,
    totalInterestPaid: Math.round(cumulativeInterest * 100) / 100,
    totalRepayment,
    effectiveAnnualRate,
    soraBaseRate,
    bankSpread,
    masStressTestPayment: masStressPayment,
    masStressTestRate,
    stressDeltaMonthly,
    amortizationSchedule: schedule,
  };
}

/**
 * Format currency in SGD
 */
export function formatSGD(amount: number, showDecimals: boolean = true): string {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(amount);
}

/**
 * Format percentage
 */
export function formatPercent(rate: number, decimals: number = 4): string {
  return `${rate.toFixed(decimals)}%`;
}
