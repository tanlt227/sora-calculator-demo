import React, { useState, useMemo } from 'react';
import { SoraDailyRate } from '../types/sora';
import { formatPercent, formatSGD } from '../utils/calculator';
import { Search, Download, TrendingUp, BarChart2, Filter } from 'lucide-react';
import { soraService } from '../services/soraService';

interface RateExplorerProps {
  rates: SoraDailyRate[];
}

export const RateExplorer: React.FC<RateExplorerProps> = ({ rates }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSeries, setActiveSeries] = useState<'all' | 'compounded' | 'overnight'>('all');
  const [hoveredPoint, setHoveredPoint] = useState<SoraDailyRate | null>(null);

  const filteredRates = useMemo(() => {
    return rates.filter((r) => {
      if (!searchTerm) return true;
      return r.date.includes(searchTerm);
    });
  }, [rates, searchTerm]);

  // Compute stats
  const stats = useMemo(() => {
    if (!rates.length) return null;
    const overnightRates = rates.map((r) => r.overnightRate);
    const minOvernight = Math.min(...overnightRates);
    const maxOvernight = Math.max(...overnightRates);
    const avgOvernight = overnightRates.reduce((a, b) => a + b, 0) / overnightRates.length;

    const r3mList = rates.map((r) => r.compounded3M).filter((x): x is number => x !== undefined);
    const avg3M = r3mList.length ? r3mList.reduce((a, b) => a + b, 0) / r3mList.length : 3.0;

    const latest = rates[0];

    return {
      latest,
      minOvernight,
      maxOvernight,
      avgOvernight,
      avg3M,
      totalVolumeLatest: latest?.aggregateVolume || 3500,
    };
  }, [rates]);

  // SVG Chart Calculation (Last 45 points chronological)
  const chartPoints = useMemo(() => {
    return [...rates.slice(0, 45)].reverse();
  }, [rates]);

  const svgWidth = 800;
  const svgHeight = 220;
  const padLeft = 40;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 30;

  const minRateVal = useMemo(() => {
    const vals = chartPoints.flatMap((p) => [
      p.overnightRate,
      p.compounded1M ?? p.overnightRate,
      p.compounded3M ?? p.overnightRate,
    ]);
    return Math.floor(Math.min(...vals) * 10) / 10 - 0.1;
  }, [chartPoints]);

  const maxRateVal = useMemo(() => {
    const vals = chartPoints.flatMap((p) => [
      p.overnightRate,
      p.compounded1M ?? p.overnightRate,
      p.compounded3M ?? p.overnightRate,
    ]);
    return Math.ceil(Math.max(...vals) * 10) / 10 + 0.1;
  }, [chartPoints]);

  const getSvgCoordinates = (index: number, val: number) => {
    const x = padLeft + (index / Math.max(1, chartPoints.length - 1)) * (svgWidth - padLeft - padRight);
    const y = padTop + ((maxRateVal - val) / (maxRateVal - minRateVal)) * (svgHeight - padTop - padBottom);
    return { x, y };
  };

  const overnightPath = chartPoints.reduce((acc, pt, i) => {
    const { x, y } = getSvgCoordinates(i, pt.overnightRate);
    return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  const c3mPath = chartPoints.reduce((acc, pt, i) => {
    const val = pt.compounded3M ?? pt.overnightRate;
    const { x, y } = getSvgCoordinates(i, val);
    return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  const c1mPath = chartPoints.reduce((acc, pt, i) => {
    const val = pt.compounded1M ?? pt.overnightRate;
    const { x, y } = getSvgCoordinates(i, val);
    return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  const handleExportCsv = () => {
    const csvContent = soraService.exportRatesToCSV(filteredRates);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `MAS_SORA_Rates_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              MAS SORA Benchmark Rates Explorer
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Official Monetary Authority of Singapore interbank rates, volume-weighted overnight
              averages, and compounded 1M, 3M, 6M tenures.
            </p>
          </div>

          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors shadow-xs cursor-pointer self-start sm:self-auto"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Download Benchmark CSV</span>
          </button>
        </div>
      </div>

      {/* Market Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-medium text-slate-500 block uppercase">
              Latest Overnight SORA
            </span>
            <span className="text-xl sm:text-2xl font-mono font-bold text-slate-900 mt-1 block">
              {stats.latest.overnightRate.toFixed(4)}%
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Published {stats.latest.date}
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-medium text-slate-500 block uppercase">
              Latest 3M Compounded SORA
            </span>
            <span className="text-xl sm:text-2xl font-mono font-bold text-rose-600 mt-1 block">
              {stats.latest.compounded3M?.toFixed(4) || '2.9815'}%
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Retail Mortgage Standard</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-medium text-slate-500 block uppercase">
              SGD Interbank Daily Volume
            </span>
            <span className="text-xl sm:text-2xl font-mono font-bold text-slate-900 mt-1 block">
              ${stats.totalVolumeLatest}M
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Unsecured overnight SGD</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-medium text-slate-500 block uppercase">
              90-Day Range (Overnight)
            </span>
            <span className="text-base sm:text-lg font-mono font-bold text-slate-900 mt-1.5 block">
              {stats.minOvernight.toFixed(2)}% – {stats.maxOvernight.toFixed(2)}%
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Average: {stats.avgOvernight.toFixed(4)}%
            </span>
          </div>
        </div>
      )}

      {/* Interactive SORA SVG Chart */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              SORA Benchmark Trend (Last 45 Observation Days)
            </h3>
            <p className="text-xs text-slate-500">
              Comparison between volatile daily overnight SORA and smoothed compounded tenures
            </p>
          </div>

          {/* Interactive series toggle */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => setActiveSeries('all')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                activeSeries === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Series
            </button>
            <button
              onClick={() => setActiveSeries('compounded')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                activeSeries === 'compounded'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Compounded Only
            </button>
            <button
              onClick={() => setActiveSeries('overnight')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                activeSeries === 'overnight'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Overnight Only
            </button>
          </div>
        </div>

        {/* Chart SVG */}
        <div className="relative w-full overflow-x-auto">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-52">
            {/* Grid horizontal guidelines */}
            {[minRateVal, (minRateVal + maxRateVal) / 2, maxRateVal].map((val, idx) => {
              const y =
                padTop +
                ((maxRateVal - val) / (maxRateVal - minRateVal)) * (svgHeight - padTop - padBottom);
              return (
                <g key={idx}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={svgWidth - padRight}
                    y2={y}
                    stroke="#f1f5f9"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={padLeft - 8}
                    y={y + 4}
                    textAnchor="end"
                    className="text-[10px] fill-slate-400 font-mono"
                  >
                    {val.toFixed(2)}%
                  </text>
                </g>
              );
            })}

            {/* Daily Overnight SORA (Slate subtle line) */}
            {(activeSeries === 'all' || activeSeries === 'overnight') && (
              <path
                d={overnightPath}
                fill="none"
                stroke="#64748b"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
            )}

            {/* 1M Compounded SORA (Indigo line) */}
            {(activeSeries === 'all' || activeSeries === 'compounded') && (
              <path d={c1mPath} fill="none" stroke="#6366f1" strokeWidth="2" />
            )}

            {/* 3M Compounded SORA (Rose prominent line - retail loan standard) */}
            {(activeSeries === 'all' || activeSeries === 'compounded') && (
              <path d={c3mPath} fill="none" stroke="#f43f5e" strokeWidth="2.5" />
            )}

            {/* Hover points */}
            {chartPoints.map((pt, i) => {
              const { x, y } = getSvgCoordinates(i, pt.compounded3M ?? pt.overnightRate);
              return (
                <circle
                  key={pt.date}
                  cx={x}
                  cy={y}
                  r="3.5"
                  className="fill-rose-500 hover:fill-rose-700 cursor-pointer transition-transform hover:scale-150"
                  onMouseEnter={() => setHoveredPoint(pt)}
                />
              );
            })}
          </svg>

          {/* Interactive Hover Card */}
          {hoveredPoint && (
            <div className="absolute top-2 right-4 bg-slate-900/90 text-white p-3 rounded-lg text-xs font-mono shadow-md backdrop-blur-xs">
              <div className="font-bold text-slate-100">{hoveredPoint.date}</div>
              <div className="text-slate-300">
                Overnight SORA: {hoveredPoint.overnightRate.toFixed(4)}%
              </div>
              <div className="text-rose-400">
                3M SORA: {hoveredPoint.compounded3M?.toFixed(4) || 'N/A'}%
              </div>
              <div className="text-indigo-400">
                1M SORA: {hoveredPoint.compounded1M?.toFixed(4) || 'N/A'}%
              </div>
              <div className="text-slate-400">Volume: SGD {hoveredPoint.aggregateVolume}M</div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-6 text-xs text-slate-600 font-mono pt-2 border-t border-slate-100">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-rose-500 inline-block rounded-xs" />
            3M Compounded SORA (Mortgage Benchmark)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-indigo-500 inline-block rounded-xs" />
            1M Compounded SORA
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t border-dashed border-slate-500 inline-block" />
            Daily Overnight SORA
          </span>
        </div>
      </div>

      {/* Search and Historical Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by date (YYYY-MM or YYYY-MM-DD)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs font-mono border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="text-xs text-slate-500 font-mono">
            Showing {filteredRates.length} published MAS sessions
          </div>
        </div>

        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Publication Date</th>
                <th className="py-2.5 px-4 text-right">Overnight SORA</th>
                <th className="py-2.5 px-4 text-right">1M Compounded</th>
                <th className="py-2.5 px-4 text-right">3M Compounded</th>
                <th className="py-2.5 px-4 text-right">6M Compounded</th>
                <th className="py-2.5 px-4 text-right">SORA Index</th>
                <th className="py-2.5 px-4 text-right">Volume (SGD M)</th>
                <th className="py-2.5 px-4 text-right">10th - 90th %ile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
              {filteredRates.slice(0, 50).map((r) => (
                <tr key={r.date} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-4 font-semibold text-slate-900">{r.date}</td>
                  <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                    {r.overnightRate.toFixed(4)}%
                  </td>
                  <td className="py-2.5 px-4 text-right text-indigo-700">
                    {r.compounded1M ? `${r.compounded1M.toFixed(4)}%` : '—'}
                  </td>
                  <td className="py-2.5 px-4 text-right font-bold text-rose-700">
                    {r.compounded3M ? `${r.compounded3M.toFixed(4)}%` : '—'}
                  </td>
                  <td className="py-2.5 px-4 text-right text-slate-600">
                    {r.compounded6M ? `${r.compounded6M.toFixed(4)}%` : '—'}
                  </td>
                  <td className="py-2.5 px-4 text-right text-slate-500">
                    {r.soraIndex?.toFixed(4) || '—'}
                  </td>
                  <td className="py-2.5 px-4 text-right text-slate-800">
                    ${r.aggregateVolume || '—'}M
                  </td>
                  <td className="py-2.5 px-4 text-right text-slate-500 text-[11px]">
                    {r.percentile10 && r.percentile90
                      ? `${r.percentile10.toFixed(2)}% – ${r.percentile90.toFixed(2)}%`
                      : '—'}
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
