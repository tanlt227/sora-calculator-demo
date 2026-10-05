import React, { useState } from 'react';
import {
  BenchmarkTenure,
  CompoundingType,
  LoanInput,
  LoanSummary,
  PropertyType,
  RepaymentType,
} from '../types/sora';
import { formatPercent, formatSGD } from '../utils/calculator';
import { Building2, Info, ArrowUpRight, TrendingUp, AlertTriangle } from 'lucide-react';

interface LoanCalculatorProps {
  input: LoanInput;
  setInput: React.Dispatch<React.SetStateAction<LoanInput>>;
  summary: LoanSummary;
  latestBenchmarks: {
    overnight: number;
    compounded1M: number;
    compounded3M: number;
    compounded6M: number;
    publicationDate: string;
  };
  onViewAmortization: () => void;
}

const PROPERTY_PRESETS = [
  { id: 'bto', label: 'BTO HDB', type: 'hdb' as PropertyType, amount: 450000, tenure: 25 },
  { id: 'resale', label: 'Resale HDB', type: 'hdb' as PropertyType, amount: 680000, tenure: 25 },
  { id: 'condo', label: 'Private Condo', type: 'condo' as PropertyType, amount: 1400000, tenure: 30 },
  { id: 'landed', label: 'Landed', type: 'landed' as PropertyType, amount: 3200000, tenure: 30 },
  { id: 'commercial', label: 'Commercial', type: 'commercial' as PropertyType, amount: 2200000, tenure: 20 },
];

export const LoanCalculator: React.FC<LoanCalculatorProps> = ({
  input,
  setInput,
  summary,
  latestBenchmarks,
  onViewAmortization,
}) => {
  const [showFormulaTooltip, setShowFormulaTooltip] = useState(false);

  const handlePresetSelect = (preset: typeof PROPERTY_PRESETS[0]) => {
    setInput((prev) => ({
      ...prev,
      propertyType: preset.type,
      loanAmount: preset.amount,
      tenureYears: preset.tenure,
    }));
  };

  const principalRatio = summary.totalRepayment > 0
    ? (input.loanAmount / summary.totalRepayment) * 100
    : 100;
  const interestRatio = Math.max(0, 100 - principalRatio);

  // SVG Loan Balance Amortization Trajectory
  const trajectoryPoints = summary.amortizationSchedule.filter(
    (_, index) => index % 12 === 0 || index === summary.amortizationSchedule.length - 1
  );

  const maxBalance = input.loanAmount;
  const chartWidth = 600;
  const chartHeight = 160;
  const padding = 20;

  const getCoordinates = (index: number, val: number) => {
    const x = padding + (index / Math.max(1, trajectoryPoints.length - 1)) * (chartWidth - padding * 2);
    const y = chartHeight - padding - (val / (maxBalance * 1.05)) * (chartHeight - padding * 2);
    return { x, y };
  };

  const balancePath = trajectoryPoints.reduce((acc, pt, i) => {
    const { x, y } = getCoordinates(i, pt.endingBalance);
    return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  const interestPath = trajectoryPoints.reduce((acc, pt, i) => {
    const { x, y } = getCoordinates(i, pt.cumulativeInterest);
    return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  return (
    <div className="space-y-8">
      {/* Top Section Intro */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Singapore SORA Loan & Mortgage Calculator
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Compute precise monthly installments and cumulative interest payments pegged to
              official Monetary Authority of Singapore (MAS) overnight benchmark rates.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono bg-slate-100 px-3 py-2 rounded-lg border border-slate-200">
            <span>MAS Rates: {latestBenchmarks.publicationDate}</span>
            <span aria-hidden="true">·</span>
            <span>3M SORA: {latestBenchmarks.compounded3M.toFixed(4)}%</span>
          </div>
        </div>

        {/* Quick Property Presets */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500 mr-1">Presets:</span>
          {PROPERTY_PRESETS.map((preset) => {
            const isSelected =
              input.loanAmount === preset.amount && input.tenureYears === preset.tenure;
            return (
              <button
                key={preset.id}
                onClick={() => handlePresetSelect(preset)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {preset.label} ({formatSGD(preset.amount, false)})
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Inputs Left, Calculation Results Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Loan Parameters Form */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900">
              Loan Parameters & Benchmark Selection
            </h2>

            {/* Loan Amount */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-700">
                  Loan Quantum (Principal)
                </label>
                <span className="text-xs font-mono font-medium text-slate-900">
                  {formatSGD(input.loanAmount, false)}
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-semibold text-slate-400">
                  SGD
                </span>
                <input
                  type="number"
                  min="50000"
                  max="20000000"
                  step="10000"
                  value={input.loanAmount}
                  onChange={(e) =>
                    setInput((prev) => ({
                      ...prev,
                      loanAmount: Math.max(10000, Number(e.target.value) || 0),
                    }))
                  }
                  className="w-full pl-12 pr-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                {[500000, 800000, 1200000, 2000000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setInput((prev) => ({ ...prev, loanAmount: amt }))}
                    className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                  >
                    ${amt / 1000}k
                  </button>
                ))}
              </div>
            </div>

            {/* Loan Tenure */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-700">
                  Loan Tenure (Years)
                </label>
                <span className="text-xs font-mono font-medium text-slate-900">
                  {input.tenureYears} Years ({input.tenureYears * 12} Months)
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="35"
                step="1"
                value={input.tenureYears}
                onChange={(e) =>
                  setInput((prev) => ({
                    ...prev,
                    tenureYears: Number(e.target.value),
                  }))
                }
                className="w-full accent-slate-900 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>5 Yrs</span>
                <span>15 Yrs</span>
                <span>25 Yrs (HDB Max)</span>
                <span>30 Yrs (Condo Max)</span>
                <span>35 Yrs</span>
              </div>
            </div>

            {/* Benchmark Tenure Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">
                  MAS SORA Benchmark Tenure
                </label>
                <span className="text-[11px] text-slate-500">
                  Active Base: {summary.soraBaseRate.toFixed(4)}%
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: '1M' as BenchmarkTenure, label: '1M SORA', rate: latestBenchmarks.compounded1M },
                  { id: '3M' as BenchmarkTenure, label: '3M SORA', rate: latestBenchmarks.compounded3M, popular: true },
                  { id: '6M' as BenchmarkTenure, label: '6M SORA', rate: latestBenchmarks.compounded6M },
                  { id: 'overnight' as BenchmarkTenure, label: 'Daily SORA', rate: latestBenchmarks.overnight },
                ].map((bench) => {
                  const isSelected = input.benchmarkTenure === bench.id && !input.useCustomRate;
                  return (
                    <button
                      key={bench.id}
                      type="button"
                      onClick={() =>
                        setInput((prev) => ({
                          ...prev,
                          benchmarkTenure: bench.id,
                          useCustomRate: false,
                        }))
                      }
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">{bench.label}</span>
                        {bench.popular && (
                          <span
                            className={`text-[9px] px-1 py-0.2 rounded ${
                              isSelected ? 'bg-rose-500 text-white' : 'bg-rose-50 text-rose-700 font-semibold'
                            }`}
                          >
                            Retail Std
                          </span>
                        )}
                      </div>
                      <div
                        className={`text-sm font-mono font-bold mt-1 ${
                          isSelected ? 'text-white' : 'text-slate-800'
                        }`}
                      >
                        {bench.rate.toFixed(4)}%
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bank Spread / Margin */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-700">
                  Bank Spread / Margin (+%)
                </label>
                <span className="text-xs font-mono font-medium text-slate-900">
                  +{input.bankSpread.toFixed(2)}% p.a.
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0.20"
                  max="2.50"
                  step="0.05"
                  value={input.bankSpread}
                  onChange={(e) =>
                    setInput((prev) => ({
                      ...prev,
                      bankSpread: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-slate-900 cursor-pointer"
                />
                <input
                  type="number"
                  min="0"
                  max="5"
                  step="0.05"
                  value={input.bankSpread}
                  onChange={(e) =>
                    setInput((prev) => ({
                      ...prev,
                      bankSpread: Math.max(0, Number(e.target.value) || 0),
                    }))
                  }
                  className="w-20 px-2 py-1 text-xs font-mono border border-slate-300 rounded text-right"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Singapore banks (DBS, OCBC, UOB, HSBC, SCB) typically price home loan packages at
                3M SORA + 0.60% to 0.85%.
              </p>
            </div>

            {/* Compounding Method & Repayment Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Compounding Mode
                </label>
                <div className="flex items-center p-1 bg-slate-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() =>
                      setInput((prev) => ({ ...prev, compoundingType: 'in_advance' }))
                    }
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      input.compoundingType === 'in_advance'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    In-Advance
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setInput((prev) => ({ ...prev, compoundingType: 'in_arrears' }))
                    }
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      input.compoundingType === 'in_arrears'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    In-Arrears
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Repayment Type
                </label>
                <div className="flex items-center p-1 bg-slate-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() =>
                      setInput((prev) => ({ ...prev, repaymentType: 'amortized' }))
                    }
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      input.repaymentType === 'amortized'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Principal + Int
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setInput((prev) => ({ ...prev, repaymentType: 'interest_only' }))
                    }
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      input.repaymentType === 'interest_only'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Interest Only
                  </button>
                </div>
              </div>
            </div>

            {/* Custom SORA Rate Toggle */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={input.useCustomRate}
                  onChange={(e) =>
                    setInput((prev) => ({
                      ...prev,
                      useCustomRate: e.target.checked,
                      customSoraRate: e.target.checked ? prev.customSoraRate ?? 3.0 : undefined,
                    }))
                  }
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <span>Simulate Custom SORA Benchmark</span>
              </label>

              {input.useCustomRate && (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.05"
                    value={input.customSoraRate || 3.0}
                    onChange={(e) =>
                      setInput((prev) => ({
                        ...prev,
                        customSoraRate: Number(e.target.value) || 0,
                      }))
                    }
                    className="w-20 px-2 py-1 text-xs font-mono border border-slate-300 rounded text-right"
                  />
                  <span className="text-xs font-mono text-slate-500">%</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Key Outputs & Repayment Breakdown */}
        <div className="lg:col-span-6 space-y-6">
          {/* Hero Calculation Box */}
          <div className="bg-slate-900 text-white p-6 rounded-xl border border-slate-800 shadow-sm relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                  Estimated Monthly Installment
                </span>
                <div className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-white mt-1">
                  {formatSGD(summary.monthlyInstallment)}
                  <span className="text-xs font-normal text-slate-400 ml-1.5">/ month</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
                  All-In Rate
                </span>
                <span className="text-xl sm:text-2xl font-mono font-bold text-rose-400">
                  {formatPercent(summary.effectiveAnnualRate)}
                </span>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  ({summary.soraBaseRate.toFixed(4)}% SORA + {summary.bankSpread.toFixed(2)}%)
                </div>
              </div>
            </div>

            {/* Secondary Metrics Bar */}
            <div className="grid grid-cols-3 gap-3 pt-5 mt-5 border-t border-slate-800">
              <div>
                <span className="text-[11px] text-slate-400 block">Total Interest Paid</span>
                <span className="text-sm sm:text-base font-mono font-bold text-slate-100">
                  {formatSGD(summary.totalInterestPaid, false)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">First Year Interest</span>
                <span className="text-sm sm:text-base font-mono font-bold text-slate-100">
                  {formatSGD(summary.firstYearTotalInterest, false)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Total Repayment</span>
                <span className="text-sm sm:text-base font-mono font-bold text-slate-100">
                  {formatSGD(summary.totalRepayment, false)}
                </span>
              </div>
            </div>

            {/* Repayment Composition Bar */}
            <div className="mt-5 space-y-2">
              <div className="flex justify-between text-xs text-slate-300 font-mono">
                <span>Principal: {principalRatio.toFixed(1)}%</span>
                <span>Interest: {interestRatio.toFixed(1)}%</span>
              </div>
              <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
                <div
                  style={{ width: `${principalRatio}%` }}
                  className="bg-emerald-500 h-full transition-all duration-300"
                  title={`Principal: ${formatSGD(input.loanAmount)}`}
                />
                <div
                  style={{ width: `${interestRatio}%` }}
                  className="bg-rose-500 h-full transition-all duration-300"
                  title={`Interest: ${formatSGD(summary.totalInterestPaid)}`}
                />
              </div>
            </div>
          </div>

          {/* MAS Regulatory TDSR Stress Test Banner */}
          <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs text-amber-900">
              <div className="font-semibold text-slate-900 flex items-center justify-between">
                <span>MAS TDSR Medium-Term Stress Rate (4.00%)</span>
                <span className="font-mono text-amber-800 font-bold">
                  {formatSGD(summary.masStressTestPayment)}/mo
                </span>
              </div>
              <p className="mt-1 text-slate-700 leading-relaxed">
                Under Monetary Authority of Singapore Notice 645 guidelines, financial institutions
                stress-test residential property debt servicing capacity at a minimum 4.00% interest rate floor.
                Your buffer difference: <strong className="font-mono">{formatSGD(summary.stressDeltaMonthly)}/mo</strong>.
              </p>
            </div>
          </div>

          {/* Mini Trajectory Chart */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  Loan Principal Paydown Trajectory
                </h3>
                <p className="text-[11px] text-slate-500">
                  Principal reduction vs. cumulative interest over {input.tenureYears} years
                </p>
              </div>

              <button
                onClick={onViewAmortization}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-900 hover:text-rose-600 transition-colors cursor-pointer"
              >
                <span>Full Schedule</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="w-full overflow-hidden">
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-32">
                {/* Horizontal reference lines */}
                <line
                  x1={padding}
                  y1={chartHeight - padding}
                  x2={chartWidth - padding}
                  y2={chartHeight - padding}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                />
                <line
                  x1={padding}
                  y1={padding}
                  x2={chartWidth - padding}
                  y2={padding}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />

                {/* Balance curve (Emerald) */}
                <path d={balancePath} fill="none" stroke="#10b981" strokeWidth="2.5" />

                {/* Interest curve (Rose) */}
                <path d={interestPath} fill="none" stroke="#f43f5e" strokeWidth="2" strokeDasharray="3 3" />
              </svg>

              <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono px-2 pt-1 border-t border-slate-100">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-xs inline-block" />
                  Principal Balance
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 bg-rose-500 rounded-xs inline-block" />
                  Cumulative Interest Paid
                </span>
                <span>Year {input.tenureYears}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
