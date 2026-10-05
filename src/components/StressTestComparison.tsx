import React, { useState } from 'react';
import { LoanInput, LoanSummary } from '../types/sora';
import { calculateMonthlyInstallment, formatPercent, formatSGD } from '../utils/calculator';
import { ShieldAlert, ArrowRight, CheckCircle2, TrendingUp, Scale } from 'lucide-react';

interface StressTestComparisonProps {
  input: LoanInput;
  summary: LoanSummary;
}

export const StressTestComparison: React.FC<StressTestComparisonProps> = ({ input, summary }) => {
  // Monthly income & existing debt for TDSR test
  const [monthlyIncome, setMonthlyIncome] = useState(12000);
  const [otherMonthlyDebt, setOtherMonthlyDebt] = useState(1200);

  // Fixed package comparison inputs
  const [fixedRatePercent, setFixedRatePercent] = useState(2.80);
  const [fixedTenureLockInYears, setFixedTenureLockInYears] = useState(3);

  // Compute TDSR
  const currentTotalDebt = summary.monthlyInstallment + otherMonthlyDebt;
  const currentTdsr = monthlyIncome > 0 ? (currentTotalDebt / monthlyIncome) * 100 : 0;

  const stressTotalDebt = summary.masStressTestPayment + otherMonthlyDebt;
  const stressTdsr = monthlyIncome > 0 ? (stressTotalDebt / monthlyIncome) * 100 : 0;

  // Fixed loan comparison
  const fixedMonthlyPayment = calculateMonthlyInstallment(
    input.loanAmount,
    fixedRatePercent,
    input.tenureYears
  );

  const monthlySavingsWithSora = fixedMonthlyPayment - summary.monthlyInstallment;
  const cumulativeSavingsLockIn = monthlySavingsWithSora * fixedTenureLockInYears * 12;

  // Break-even SORA rate: fixedRate - bankSpread
  const breakEvenSora = Math.max(0, fixedRatePercent - input.bankSpread);

  // Sensitivity shocks (+50bps, +100bps, +150bps, +200bps, +300bps)
  const shocks = [0.5, 1.0, 1.5, 2.0, 3.0].map((shift) => {
    const newRate = summary.effectiveAnnualRate + shift;
    const payment = calculateMonthlyInstallment(input.loanAmount, newRate, input.tenureYears);
    const delta = payment - summary.monthlyInstallment;
    const extraInterest1Yr = delta * 12;
    return {
      shift,
      newRate,
      payment,
      delta,
      extraInterest1Yr,
    };
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          TDSR & Interest Rate Shock Stress Testing
        </h1>
        <p className="text-sm text-slate-600 mt-1 max-w-3xl">
          Evaluate borrowing limits under MAS Notice 645/1115 Total Debt Servicing Ratio (55%
          limit) and compare SORA floating packages against commercial bank fixed mortgages.
        </p>
      </div>

      {/* Grid: TDSR Calculator + Shock Sensitivity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* TDSR Framework Section */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900">
                MAS TDSR (Total Debt Servicing Ratio) Assessment
              </h2>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              MAS mandates a strict <strong>55% TDSR limit</strong> on property purchases. MAS
              requires banks to assess borrower debt service using a medium-term stress interest
              rate of at least <strong>4.00% p.a.</strong> for residential properties.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Gross Monthly Household Income (SGD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-mono text-slate-400">
                    $
                  </span>
                  <input
                    type="number"
                    step="500"
                    value={monthlyIncome}
                    onChange={(e) => setMonthlyIncome(Number(e.target.value) || 0)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs font-mono border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Other Monthly Commitments (Car, Loans)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-mono text-slate-400">
                    $
                  </span>
                  <input
                    type="number"
                    step="100"
                    value={otherMonthlyDebt}
                    onChange={(e) => setOtherMonthlyDebt(Number(e.target.value) || 0)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs font-mono border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* TDSR Result Gauges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Current SORA TDSR */}
              <div
                className={`p-4 rounded-xl border ${
                  currentTdsr <= 55
                    ? 'border-emerald-200 bg-emerald-50/50'
                    : 'border-rose-200 bg-rose-50/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700">Current SORA TDSR</span>
                  <span
                    className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                      currentTdsr <= 55 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {currentTdsr <= 55 ? 'Pass (<55%)' : 'Exceeds'}
                  </span>
                </div>
                <div className="text-2xl font-mono font-extrabold text-slate-900 mt-2">
                  {currentTdsr.toFixed(1)}%
                </div>
                <div className="text-[11px] text-slate-600 mt-1">
                  Total Debt: {formatSGD(currentTotalDebt)}/mo at {formatPercent(summary.effectiveAnnualRate)}
                </div>
              </div>

              {/* MAS Stress Tested TDSR */}
              <div
                className={`p-4 rounded-xl border ${
                  stressTdsr <= 55
                    ? 'border-emerald-200 bg-emerald-50/50'
                    : 'border-amber-200 bg-amber-50/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700">MAS Stressed (4.00%)</span>
                  <span
                    className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                      stressTdsr <= 55 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {stressTdsr <= 55 ? 'Compliant' : 'High Risk'}
                  </span>
                </div>
                <div className="text-2xl font-mono font-extrabold text-slate-900 mt-2">
                  {stressTdsr.toFixed(1)}%
                </div>
                <div className="text-[11px] text-slate-600 mt-1">
                  Stressed Debt: {formatSGD(stressTotalDebt)}/mo at 4.00%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Rate vs SORA Package Comparison */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-indigo-600" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900">
                Fixed Rate vs. SORA Package Comparison
              </h2>
            </div>

            <p className="text-xs text-slate-600">
              Benchmark your SORA package against current Singapore bank fixed rate mortgage offers
              (e.g., 2.70% - 3.20% locked for 2 or 3 years).
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Fixed Package Rate (%)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={fixedRatePercent}
                  onChange={(e) => setFixedRatePercent(Number(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lock-In Period (Years)
                </label>
                <select
                  value={fixedTenureLockInYears}
                  onChange={(e) => setFixedTenureLockInYears(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-md bg-white"
                >
                  <option value={1}>1 Year Lock-In</option>
                  <option value={2}>2 Years Lock-In</option>
                  <option value={3}>3 Years Lock-In</option>
                  <option value={5}>5 Years Lock-In</option>
                </select>
              </div>
            </div>

            {/* Comparison Cards */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[11px] font-semibold text-slate-500 block uppercase">
                  Fixed Package Payment
                </span>
                <span className="text-base sm:text-lg font-mono font-bold text-slate-900 mt-1 block">
                  {formatSGD(fixedMonthlyPayment)}/mo
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  At {fixedRatePercent.toFixed(2)}% locked
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[11px] font-semibold text-slate-500 block uppercase">
                  SORA Floating Payment
                </span>
                <span className="text-base sm:text-lg font-mono font-bold text-rose-600 mt-1 block">
                  {formatSGD(summary.monthlyInstallment)}/mo
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  At {formatPercent(summary.effectiveAnnualRate)}
                </span>
              </div>
            </div>

            {/* Analysis Insight */}
            <div className="p-4 bg-slate-900 text-white rounded-xl text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Monthly Difference:</span>
                <span
                  className={`font-mono font-bold ${
                    monthlySavingsWithSora >= 0 ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {monthlySavingsWithSora >= 0
                    ? `SORA is ${formatSGD(monthlySavingsWithSora)}/mo cheaper`
                    : `Fixed is ${formatSGD(Math.abs(monthlySavingsWithSora))}/mo cheaper`}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                <span className="text-slate-400">
                  {fixedTenureLockInYears}-Yr Net Difference:
                </span>
                <span className="font-mono font-bold text-slate-100">
                  {formatSGD(Math.abs(cumulativeSavingsLockIn), false)}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                <span className="text-slate-400">Break-Even SORA Rate:</span>
                <span className="font-mono font-bold text-rose-400">
                  {breakEvenSora.toFixed(4)}% SORA
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight pt-1">
                If 3M SORA stays below <strong>{breakEvenSora.toFixed(4)}%</strong>, the floating
                SORA package saves you money compared to the {fixedRatePercent.toFixed(2)}% fixed loan.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Interest Rate Shock Sensitivity Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">
            Interest Rate Hike Sensitivity Table
          </h3>
          <p className="text-xs text-slate-500">
            Stress-testing the impact of future MAS SORA interest rate increases on your monthly installment.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Rate Scenario</th>
                <th className="py-2.5 px-4 text-right">All-In Interest Rate</th>
                <th className="py-2.5 px-4 text-right">Monthly Installment</th>
                <th className="py-2.5 px-4 text-right">Monthly Payment Hike</th>
                <th className="py-2.5 px-4 text-right">Extra Interest (1st Year)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
              <tr className="bg-slate-50/50 font-bold">
                <td className="py-2.5 px-4 font-sans text-slate-900">Current Base Case</td>
                <td className="py-2.5 px-4 text-right text-slate-900">
                  {formatPercent(summary.effectiveAnnualRate)}
                </td>
                <td className="py-2.5 px-4 text-right text-slate-900">
                  {formatSGD(summary.monthlyInstallment)}
                </td>
                <td className="py-2.5 px-4 text-right text-slate-400">—</td>
                <td className="py-2.5 px-4 text-right text-slate-400">—</td>
              </tr>
              {shocks.map((s) => (
                <tr key={s.shift} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-4 font-sans text-slate-800">
                    +{Math.round(s.shift * 100)} bps Hike (+{s.shift.toFixed(2)}%)
                  </td>
                  <td className="py-2.5 px-4 text-right font-medium text-slate-900">
                    {formatPercent(s.newRate)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                    {formatSGD(s.payment)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-semibold text-rose-600">
                    +{formatSGD(s.delta)}/mo
                  </td>
                  <td className="py-2.5 px-4 text-right text-slate-800">
                    +{formatSGD(s.extraInterest1Yr, false)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
