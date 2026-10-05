import React, { useState, useMemo } from 'react';
import { MonthlyAmortizationRow } from '../types/sora';
import { formatPercent, formatSGD } from '../utils/calculator';
import { Download, Filter, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { soraService } from '../services/soraService';

interface AmortizationTableProps {
  schedule: MonthlyAmortizationRow[];
  loanAmount: number;
  tenureYears: number;
  annualRate: number;
}

export const AmortizationTable: React.FC<AmortizationTableProps> = ({
  schedule,
  loanAmount,
  tenureYears,
  annualRate,
}) => {
  const [viewMode, setViewMode] = useState<'monthly' | 'annual'>('annual');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 24;

  // Annual aggregation calculation
  const annualSummary = useMemo(() => {
    const years: Array<{
      year: number;
      startBalance: number;
      totalPayments: number;
      totalPrincipal: number;
      totalInterest: number;
      endingBalance: number;
      cumulativeInterest: number;
    }> = [];

    const totalYears = Math.ceil(schedule.length / 12);
    for (let y = 1; y <= totalYears; y++) {
      const yearRows = schedule.slice((y - 1) * 12, y * 12);
      if (yearRows.length === 0) break;

      const startBalance = yearRows[0].beginningBalance;
      const endingBalance = yearRows[yearRows.length - 1].endingBalance;
      const totalPayments = yearRows.reduce((sum, r) => sum + r.monthlyPayment, 0);
      const totalPrincipal = yearRows.reduce((sum, r) => sum + r.principalPaid, 0);
      const totalInterest = yearRows.reduce((sum, r) => sum + r.interestPaid, 0);
      const cumulativeInterest = yearRows[yearRows.length - 1].cumulativeInterest;

      years.push({
        year: y,
        startBalance,
        totalPayments,
        totalPrincipal,
        totalInterest,
        endingBalance,
        cumulativeInterest,
      });
    }

    return years;
  }, [schedule]);

  // Pagination for monthly view
  const totalPages = Math.ceil(schedule.length / rowsPerPage);
  const paginatedMonthly = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return schedule.slice(start, start + rowsPerPage);
  }, [schedule, currentPage]);

  const handleExportCsv = () => {
    const csv = soraService.exportAmortizationCSV(schedule);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `SORA_Amortization_Schedule_${tenureYears}Yr.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Comprehensive Amortization Schedule
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            {formatSGD(loanAmount, false)} principal over {tenureYears} years at {formatPercent(annualRate)} p.a.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex items-center p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => setViewMode('annual')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'annual'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Annual Summary
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'monthly'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly Ledger
            </button>
          </div>

          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {viewMode === 'annual' ? (
          /* Annual Summary View */
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Year</th>
                  <th className="py-2.5 px-4 text-right">Beginning Balance</th>
                  <th className="py-2.5 px-4 text-right">Total Payments</th>
                  <th className="py-2.5 px-4 text-right text-emerald-700">Principal Paid</th>
                  <th className="py-2.5 px-4 text-right text-rose-700">Interest Paid</th>
                  <th className="py-2.5 px-4 text-right">Ending Balance</th>
                  <th className="py-2.5 px-4 text-right">Cumulative Interest</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
                {annualSummary.map((yr) => (
                  <tr key={yr.year} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-sans font-bold text-slate-900">
                      Year {yr.year}
                    </td>
                    <td className="py-2.5 px-4 text-right">{formatSGD(yr.startBalance)}</td>
                    <td className="py-2.5 px-4 text-right font-medium text-slate-900">
                      {formatSGD(yr.totalPayments)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-semibold text-emerald-600">
                      {formatSGD(yr.totalPrincipal)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-semibold text-rose-600">
                      {formatSGD(yr.totalInterest)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                      {formatSGD(yr.endingBalance)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-500">
                      {formatSGD(yr.cumulativeInterest)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Monthly Ledger View with pagination */
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Month #</th>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4 text-right">Beginning Balance</th>
                    <th className="py-2.5 px-4 text-right">Payment</th>
                    <th className="py-2.5 px-4 text-right text-emerald-700">Principal</th>
                    <th className="py-2.5 px-4 text-right text-rose-700">Interest</th>
                    <th className="py-2.5 px-4 text-right">Ending Balance</th>
                    <th className="py-2.5 px-4 text-right">Cumulative Int</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
                  {paginatedMonthly.map((m) => (
                    <tr key={m.period} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2 px-4 font-bold text-slate-900">{m.period}</td>
                      <td className="py-2 px-4 font-sans text-slate-600">{m.date}</td>
                      <td className="py-2 px-4 text-right">{formatSGD(m.beginningBalance)}</td>
                      <td className="py-2 px-4 text-right font-medium text-slate-900">
                        {formatSGD(m.monthlyPayment)}
                      </td>
                      <td className="py-2 px-4 text-right text-emerald-600 font-medium">
                        {formatSGD(m.principalPaid)}
                      </td>
                      <td className="py-2 px-4 text-right text-rose-600 font-medium">
                        {formatSGD(m.interestPaid)}
                      </td>
                      <td className="py-2 px-4 text-right font-bold text-slate-900">
                        {formatSGD(m.endingBalance)}
                      </td>
                      <td className="py-2 px-4 text-right text-slate-500">
                        {formatSGD(m.cumulativeInterest)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            <div className="p-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>
                Page {currentPage} of {totalPages} ({schedule.length} Total Months)
              </span>

              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1 rounded border border-slate-300 disabled:opacity-40 hover:bg-slate-100 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1 rounded border border-slate-300 disabled:opacity-40 hover:bg-slate-100 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
