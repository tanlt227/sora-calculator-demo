import React, { useState, useMemo } from 'react';
import { SoraDailyRate } from '../types/sora';
import { calculateCompoundedSoraInArrears, formatPercent, formatSGD } from '../utils/calculator';
import { Calendar, Calculator, CheckCircle2, ChevronRight, HelpCircle } from 'lucide-react';

interface CompoundingEngineProps {
  rates: SoraDailyRate[];
}

export const CompoundingEngine: React.FC<CompoundingEngineProps> = ({ rates }) => {
  // Preset dates
  const defaultEnd = rates[0]?.date || '2026-10-02';
  const defaultStart = rates[Math.min(29, rates.length - 1)]?.date || '2026-09-01';

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [notionalPrincipal, setNotionalPrincipal] = useState(1000000);
  const [bankMargin, setBankMargin] = useState(0.70);

  // Quick duration presets
  const handleQuickWindow = (days: number) => {
    const end = new Date(defaultEnd + 'T00:00:00Z');
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - days);
    
    // format YYYY-MM-DD
    const sStr = start.toISOString().split('T')[0];
    setStartDate(sStr);
    setEndDate(defaultEnd);
  };

  const compoundedResult = useMemo(() => {
    return calculateCompoundedSoraInArrears(rates, startDate, endDate);
  }, [rates, startDate, endDate]);

  const allInRate = compoundedResult.annualizedRate + bankMargin;
  const interestPayableSGD =
    (notionalPrincipal * (allInRate / 100) * compoundedResult.calendarDaysTotal) / 365;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          MAS SC-SIBOR Daily SORA Compounding Engine
        </h1>
        <p className="text-sm text-slate-600 mt-1 max-w-3xl">
          Verified daily compounding in-arrears and in-advance arithmetic adhering to the
          Monetary Authority of Singapore (MAS) and The Association of Banks in Singapore (ABS)
          Actual/365 day count convention.
        </p>

        {/* Mathematical formula badge */}
        <div className="mt-4 p-4 bg-slate-900 text-slate-100 rounded-xl font-mono text-xs overflow-x-auto shadow-xs">
          <div className="text-[11px] text-slate-400 mb-1 font-sans font-medium uppercase tracking-wider">
            Official MAS Compounding Formula (Actual/365):
          </div>
          <div className="text-rose-400 text-sm font-bold">
            Compounded SORA = [ ∏ ( 1 + (r_i × n_i / 365) ) - 1 ] × (365 / d) × 100%
          </div>
          <div className="text-slate-400 text-[11px] mt-1.5 flex flex-wrap gap-x-4 gap-y-1 font-sans">
            <span><strong>r_i</strong>: Published overnight SORA</span>
            <span><strong>n_i</strong>: Calendar days rate covers (Fri = 3 days)</span>
            <span><strong>d</strong>: Total calendar days (∑ n_i)</span>
            <span><strong>d_b</strong>: Total business days</span>
          </div>
        </div>
      </div>

      {/* Control Bar: Observation Window & Parameters */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Observation Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Observation End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-500 mr-1">Windows:</span>
            {[
              { label: '30 Days (1M)', days: 30 },
              { label: '90 Days (3M)', days: 90 },
              { label: '180 Days (6M)', days: 180 },
            ].map((preset) => (
              <button
                key={preset.days}
                onClick={() => handleQuickWindow(preset.days)}
                className="px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md transition-colors cursor-pointer"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Principal & Margin for Interest Settlement */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-slate-100">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Notional Principal (SGD)
            </label>
            <input
              type="number"
              step="50000"
              value={notionalPrincipal}
              onChange={(e) => setNotionalPrincipal(Number(e.target.value) || 0)}
              className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Bank Margin / Spread (%)
            </label>
            <input
              type="number"
              step="0.05"
              value={bankMargin}
              onChange={(e) => setBankMargin(Number(e.target.value) || 0)}
              className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-md"
            />
          </div>

          <div>
            <span className="block text-xs font-medium text-slate-600 mb-1">
              All-In Borrowing Rate
            </span>
            <div className="text-base font-mono font-bold text-slate-900 pt-0.5">
              {formatPercent(allInRate)} p.a.
            </div>
          </div>

          <div>
            <span className="block text-xs font-medium text-slate-600 mb-1">
              Total Interest for Period
            </span>
            <div className="text-base font-mono font-bold text-rose-600 pt-0.5">
              {formatSGD(interestPayableSGD)}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Scorecard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500 block uppercase">
            Compounded SORA Rate
          </span>
          <span className="text-xl sm:text-2xl font-mono font-bold text-slate-900 mt-1 block">
            {formatPercent(compoundedResult.compoundedRate)}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">Actual/365 Annualized</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500 block uppercase">
            Observation Calendar Days
          </span>
          <span className="text-xl sm:text-2xl font-mono font-bold text-slate-900 mt-1 block">
            {compoundedResult.calendarDaysTotal} Days
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            {compoundedResult.businessDaysCount} Sg Business Days
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500 block uppercase">
            Effective Cumulative Factor
          </span>
          <span className="text-xl sm:text-2xl font-mono font-bold text-slate-900 mt-1 block">
            {compoundedResult.details[compoundedResult.details.length - 1]?.cumulativeProduct.toFixed(8) || '1.00000000'}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">∏ (1 + r_i · n_i / 365)</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500 block uppercase">
            Settlement Interest Amount
          </span>
          <span className="text-xl sm:text-2xl font-mono font-bold text-emerald-600 mt-1 block">
            {formatSGD(interestPayableSGD)}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            on {formatSGD(notionalPrincipal, false)}
          </span>
        </div>
      </div>

      {/* Step-by-Step Daily Factor Audit Ledger */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Day-by-Day Compounding Audit Trail
            </h3>
            <p className="text-xs text-slate-500">
              Each rate $r_i$ applies for $n_i$ calendar days until the next Singapore banking business day.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500">
            {compoundedResult.details.length} Observation Sessions
          </span>
        </div>

        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Publication Date</th>
                <th className="py-2.5 px-4">Day</th>
                <th className="py-2.5 px-4 text-right">Overnight SORA (r_i)</th>
                <th className="py-2.5 px-4 text-center">Calendar Days (n_i)</th>
                <th className="py-2.5 px-4 text-right">Daily Multiplier (1 + r·n/365)</th>
                <th className="py-2.5 px-4 text-right">Cumulative Product (∏)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
              {compoundedResult.details.map((row, idx) => (
                <tr key={row.date} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2 px-4 font-semibold text-slate-900">{row.date}</td>
                  <td className="py-2 px-4 font-sans text-slate-500">{row.dayOfWeek}</td>
                  <td className="py-2 px-4 text-right font-bold text-slate-900">
                    {row.overnightRate.toFixed(4)}%
                  </td>
                  <td className="py-2 px-4 text-center">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                        row.calendarDays > 1 ? 'bg-amber-100 text-amber-800' : 'text-slate-600'
                      }`}
                    >
                      {row.calendarDays} {row.calendarDays > 1 ? 'days' : 'day'}
                    </span>
                  </td>
                  <td className="py-2 px-4 text-right text-slate-600">
                    {row.dailyFactor.toFixed(8)}
                  </td>
                  <td className="py-2 px-4 text-right font-medium text-slate-900">
                    {row.cumulativeProduct.toFixed(8)}
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
