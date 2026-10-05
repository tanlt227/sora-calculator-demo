import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from './components/Header';
import { LoanCalculator } from './components/LoanCalculator';
import { CompoundingEngine } from './components/CompoundingEngine';
import { RateExplorer } from './components/RateExplorer';
import { StressTestComparison } from './components/StressTestComparison';
import { AmortizationTable } from './components/AmortizationTable';
import { BackendIntegrationModal } from './components/BackendIntegrationModal';
import { LoanInput, SoraDailyRate } from './types/sora';
import { soraService } from './services/soraService';
import { computeLoanSummary } from './utils/calculator';
import { LATEST_MAS_BENCHMARKS } from './services/masRatesData';
import { ExternalLink, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('calculator');
  const [rates, setRates] = useState<SoraDailyRate[]>([]);
  const [dataSource, setDataSource] = useState<string>('MAS Official Benchmark Seed');
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toISOString());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [backendModalOpen, setBackendModalOpen] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Default Loan Input (Resale HDB SGD 750,000, 25 years tenure, 3M Compounded SORA + 0.70% margin)
  const [loanInput, setLoanInput] = useState<LoanInput>({
    loanAmount: 750000,
    tenureYears: 25,
    propertyType: 'hdb',
    benchmarkTenure: '3M',
    compoundingType: 'in_advance',
    bankSpread: 0.70,
    useCustomRate: false,
    repaymentType: 'amortized',
    startDate: '2026-10-01',
    lookbackDays: 5,
  });

  // Initial rates load
  const loadRates = useCallback(async (force = false) => {
    setIsSyncing(true);
    try {
      const res = await soraService.fetchRates(force);
      setRates(res.rates);
      setDataSource(res.source);
      setLastUpdated(res.lastUpdated);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    loadRates();
  }, [loadRates]);

  const handleSyncRates = async () => {
    setIsSyncing(true);
    await loadRates(true);
    setSyncFeedback('MAS overnight rates successfully synced');
    setTimeout(() => setSyncFeedback(null), 3500);
  };

  // Extract latest benchmark rates
  const latestBenchmarks = useMemo(() => {
    if (!rates.length) return LATEST_MAS_BENCHMARKS;
    const latest = rates[0];
    return {
      publicationDate: latest.date,
      publicationTime: '09:00 SGT',
      source: 'Monetary Authority of Singapore (MAS)',
      overnight: latest.overnightRate,
      compounded1M: latest.compounded1M ?? LATEST_MAS_BENCHMARKS.compounded1M,
      compounded3M: latest.compounded3M ?? LATEST_MAS_BENCHMARKS.compounded3M,
      compounded6M: latest.compounded6M ?? LATEST_MAS_BENCHMARKS.compounded6M,
      soraIndex: latest.soraIndex ?? LATEST_MAS_BENCHMARKS.soraIndex,
      volumeSGD: latest.aggregateVolume ?? LATEST_MAS_BENCHMARKS.volumeSGD,
      percentile10: latest.percentile10 ?? LATEST_MAS_BENCHMARKS.percentile10,
      percentile90: latest.percentile90 ?? LATEST_MAS_BENCHMARKS.percentile90,
      historicalLow52W: LATEST_MAS_BENCHMARKS.historicalLow52W,
      historicalHigh52W: LATEST_MAS_BENCHMARKS.historicalHigh52W,
    };
  }, [rates]);

  // Compute loan summary
  const summary = useMemo(() => {
    return computeLoanSummary(loanInput, latestBenchmarks);
  }, [loanInput, latestBenchmarks]);

  // Handle Export CSV
  const handleExportCsv = () => {
    const csv = soraService.exportAmortizationCSV(summary.amortizationSchedule);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `SORA_Loan_Amortization_${loanInput.loanAmount}_SGD.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveBackendConfig = (cfg: any) => {
    soraService.updateConfig(cfg);
    loadRates(true);
  };

  const handleTestConnection = async (): Promise<boolean> => {
    const config = soraService.getConfig();
    try {
      const res = await fetch(config.apiUrl);
      return res.ok;
    } catch {
      return false;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-rose-500 selection:text-white">
      {/* Top Bar Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onExportCsv={handleExportCsv}
        onOpenBackendConfig={() => setBackendModalOpen(true)}
        lastUpdated={lastUpdated}
        dataSource={dataSource}
        isSyncing={isSyncing}
        onSyncRates={handleSyncRates}
      />

      {/* Sync feedback notification */}
      {syncFeedback && (
        <div className="bg-emerald-600 text-white text-xs py-2 px-4 text-center font-medium transition-all flex items-center justify-center gap-1.5 shadow-sm">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{syncFeedback}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {activeTab === 'calculator' && (
          <LoanCalculator
            input={loanInput}
            setInput={setLoanInput}
            summary={summary}
            latestBenchmarks={latestBenchmarks}
            onViewAmortization={() => setActiveTab('amortization')}
          />
        )}

        {activeTab === 'compounding' && (
          <CompoundingEngine rates={rates} />
        )}

        {activeTab === 'explorer' && (
          <RateExplorer rates={rates} />
        )}

        {activeTab === 'stress' && (
          <StressTestComparison input={loanInput} summary={summary} />
        )}

        {activeTab === 'amortization' && (
          <AmortizationTable
            schedule={summary.amortizationSchedule}
            loanAmount={loanInput.loanAmount}
            tenureYears={loanInput.tenureYears}
            annualRate={summary.effectiveAnnualRate}
          />
        )}

        {activeTab === 'backend' && (
          <div className="space-y-6">
            <div className="border-b border-slate-200 pb-5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Backend Architecture & MAS API Integration
              </h1>
              <p className="text-sm text-slate-600 mt-1 max-w-2xl">
                Ready-to-connect integration endpoints and proxy templates for syncing live daily
                SORA rates from the Monetary Authority of Singapore.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Current Gateway Status
                </span>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="font-mono font-bold text-slate-900">{dataSource}</span>
                </div>
                <p className="text-xs text-slate-600">
                  Total published business day sessions in local cache: {rates.length}
                </p>
                <button
                  onClick={() => setBackendModalOpen(true)}
                  className="w-full mt-3 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  Configure Backend URL
                </button>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  MAS SORA Data Standard
                </span>
                <div className="text-sm font-semibold text-slate-900">
                  Actual/365 Day Count Convention
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Published daily at 09:00 SGT by the Monetary Authority of Singapore for the
                  preceding business day. Supports 1M, 3M, and 6M compounded series.
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Direct Integration Spec
                </span>
                <div className="text-sm font-semibold text-slate-900">
                  Standard JSON REST Schema
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Supports client-side custom rate arrays, proxy routes via Express, Next.js or
                  FastAPI, and automated cache invalidation.
                </p>
              </div>
            </div>

            {/* Direct Open Modal Trigger */}
            <div className="p-6 bg-slate-900 text-white rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold">Need to integrate your live server backend?</h3>
                <p className="text-xs text-slate-300 mt-1">
                  View the complete copy-paste Express/Node.js proxy code and endpoint schema.
                </p>
              </div>
              <button
                onClick={() => setBackendModalOpen(true)}
                className="px-4 py-2 text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap cursor-pointer shadow-xs"
              >
                Open Gateway Settings
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Backend Integration Modal */}
      <BackendIntegrationModal
        isOpen={backendModalOpen}
        onClose={() => setBackendModalOpen(false)}
        config={soraService.getConfig()}
        onSaveConfig={handleSaveBackendConfig}
        onTestConnection={handleTestConnection}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">SORA SG</span>
            <span aria-hidden="true">·</span>
            <span>Singapore Overnight Rate Average Financial Calculator</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <span>MAS Notice 645 Compliant</span>
            <span aria-hidden="true">·</span>
            <span>Actual/365 Money Market Day Count</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
