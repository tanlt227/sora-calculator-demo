export type CompoundingType = 'in_advance' | 'in_arrears';

export type BenchmarkTenure = '1M' | '3M' | '6M' | 'overnight';

export type PropertyType = 'hdb' | 'condo' | 'landed' | 'commercial';

export type RepaymentType = 'amortized' | 'interest_only';

export interface SoraDailyRate {
  date: string; // YYYY-MM-DD
  overnightRate: number; // e.g. 3.25 (%)
  compounded1M?: number; // e.g. 3.18 (%)
  compounded3M?: number; // e.g. 3.22 (%)
  compounded6M?: number; // e.g. 3.30 (%)
  soraIndex?: number;
  aggregateVolume?: number; // in SGD millions
  percentile10?: number;
  percentile90?: number;
  calculationType?: string;
}

export interface CompoundingDayDetail {
  date: string;
  dayOfWeek: string;
  overnightRate: number; // in %
  decimalRate: number; // overnightRate / 100
  calendarDays: number; // n_i (1 for weekdays, 3 for Friday, etc.)
  dailyFactor: number; // 1 + (r_i * n_i / 365)
  cumulativeProduct: number;
}

export interface CompoundedResult {
  compoundedRate: number; // in %
  annualizedRate: number; // in %
  startDate: string;
  endDate: string;
  businessDaysCount: number;
  calendarDaysTotal: number;
  details: CompoundingDayDetail[];
  method: 'MAS_SC_SIBOR_ACT_365';
}

export interface LoanInput {
  loanAmount: number; // SGD e.g. 800000
  tenureYears: number; // e.g. 25
  propertyType: PropertyType;
  benchmarkTenure: BenchmarkTenure;
  compoundingType: CompoundingType;
  bankSpread: number; // e.g. 0.70 (%)
  customSoraRate?: number; // optional manual override
  useCustomRate: boolean;
  repaymentType: RepaymentType;
  startDate: string; // YYYY-MM-DD
  rateFloor?: number; // e.g. 0%
  lookbackDays: number; // default 5 business days
}

export interface MonthlyAmortizationRow {
  period: number; // month 1, 2, ...
  date: string; // MMM YYYY
  beginningBalance: number;
  monthlyPayment: number;
  principalPaid: number;
  interestPaid: number;
  endingBalance: number;
  cumulativeInterest: number;
  cumulativePrincipal: number;
  effectiveRate: number; // annual %
}

export interface LoanSummary {
  monthlyInstallment: number;
  firstYearTotalInterest: number;
  totalInterestPaid: number;
  totalRepayment: number;
  effectiveAnnualRate: number;
  soraBaseRate: number;
  bankSpread: number;
  masStressTestPayment: number; // at MAS 4.0% TDSR benchmark
  masStressTestRate: number; // 4.00%
  stressDeltaMonthly: number;
  amortizationSchedule: MonthlyAmortizationRow[];
}

export interface FixedVsSoraComparison {
  fixedRate: number; // e.g. 2.80%
  fixedMonthlyPayment: number;
  fixedTotalInterest3Yr: number;
  soraMonthlyPayment: number;
  soraTotalInterest3Yr: number;
  interestSavings3Yr: number; // fixed - sora
  betterOption: 'sora' | 'fixed';
}
