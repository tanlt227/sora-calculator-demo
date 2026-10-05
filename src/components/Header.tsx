import React from 'react';
import { Download, RefreshCw, Server, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onExportCsv: () => void;
  onOpenBackendConfig: () => void;
  lastUpdated: string;
  dataSource: string;
  isSyncing: boolean;
  onSyncRates: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onExportCsv,
  onOpenBackendConfig,
  lastUpdated,
  dataSource,
  isSyncing,
  onSyncRates,
}) => {
  const navItems = [
    { id: 'calculator', label: 'Mortgage Calculator' },
    { id: 'compounding', label: 'Daily SORA Compounding' },
    { id: 'explorer', label: 'MAS Benchmark Rates' },
    { id: 'stress', label: 'TDSR & Stress Test' },
    { id: 'backend', label: 'Backend Integration' },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('calculator')}
              className="text-lg font-bold tracking-tight text-slate-900 hover:text-rose-600 transition-colors cursor-pointer text-left"
            >
              SORA SG
            </button>
            <span className="hidden sm:inline-block text-xs text-slate-400">/</span>
            <span className="hidden sm:inline-block text-xs font-mono text-slate-500">
              MAS Overnight Benchmark
            </span>
          </div>

          {/* Zone 2: Clean text navigation links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1-2 primary actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onSyncRates}
              disabled={isSyncing}
              title={`Source: ${dataSource}. Click to refresh.`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-slate-500 ${isSyncing ? 'animate-spin' : ''}`}
              />
              <span className="hidden sm:inline">Sync Rates</span>
            </button>

            <button
              onClick={onExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={onOpenBackendConfig}
              title="Configure MAS API / Backend Proxy"
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
            >
              <Server className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile secondary tab strip */}
        <div className="md:hidden flex items-center space-x-1 overflow-x-auto py-2 border-t border-slate-100">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
