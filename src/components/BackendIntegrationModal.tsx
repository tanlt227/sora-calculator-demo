import React, { useState } from 'react';
import { BackendConfig } from '../services/soraService';
import { X, Copy, Check, Server, Terminal, ExternalLink, Globe } from 'lucide-react';

interface BackendIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: BackendConfig;
  onSaveConfig: (cfg: Partial<BackendConfig>) => void;
  onTestConnection: () => Promise<boolean>;
}

export const BackendIntegrationModal: React.FC<BackendIntegrationModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onTestConnection,
}) => {
  const [apiUrl, setApiUrl] = useState(config.apiUrl);
  const [useLiveApi, setUseLiveApi] = useState(config.useLiveApi);
  const [apiKey, setApiKey] = useState(config.apiKey || '');
  const [copiedCode, setCopiedCode] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveConfig({
      apiUrl,
      useLiveApi,
      apiKey: apiKey.trim() || undefined,
    });
    onClose();
  };

  const handleRunTest = async () => {
    setTestStatus('testing');
    try {
      const ok = await onTestConnection();
      setTestStatus(ok ? 'success' : 'failed');
    } catch {
      setTestStatus('failed');
    }
  };

  const sampleBackendSnippet = `// /api/sora.ts (Serverless handler)
// Pulls MAS Daily SORA + compounded 1M/3M/6M averages
// Upstream: https://eservices.mas.gov.sg/apimg-gw/server/monthly_statistical_bulletin_non610mssql/domestic_interest_rates_daily/views/domestic_interest_rates_daily
// Header required: KeyId: <MAS_KEY_ID>

export default async function handler(req, res) {
  const keyId = process.env.MAS_KEY_ID || req.headers['keyid'];
  if (!keyId) {
    return res.status(401).json({ error: 'MAS_KEY_ID required' });
  }

  const upstreamUrl = 'https://eservices.mas.gov.sg/apimg-gw/server/monthly_statistical_bulletin_non610mssql/domestic_interest_rates_daily/views/domestic_interest_rates_daily';

  const response = await fetch(upstreamUrl, {
    headers: {
      'KeyId': keyId,
      'Accept': 'application/json',
    },
  });

  const data = await response.json();
  res.status(200).json(data);
}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sampleBackendSnippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Server className="w-5 h-5 text-slate-800" />
            <h2 className="text-lg font-bold text-slate-900">
              MAS Backend API & Gateway Integration
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 text-sm text-slate-700">
          <div>
            <p className="leading-relaxed">
              This frontend SORA calculator is architected with a decoupled MAS data access layer.
              When ready, connect your Express/Node.js or Python backend proxy below to stream
              real-time rates directly from the Monetary Authority of Singapore (MAS).
            </p>
          </div>

          {/* Configuration Form */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-xs text-slate-900 uppercase tracking-wider">
                API Endpoint Configuration
              </label>

              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={useLiveApi}
                  onChange={(e) => setUseLiveApi(e.target.checked)}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <span className="font-medium text-slate-800">Enable Live API Fetch</span>
              </label>
            </div>

            <div className="space-y-1">
              <label className="block text-xs text-slate-600">
                Backend Proxy URL or MAS REST API Gateway
              </label>
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="/api/sora or https://..."
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-900 bg-white"
              />
              <p className="text-[11px] text-slate-500">
                Default: <code className="font-mono text-slate-700">/api/sora</code>
              </p>
            </div>

            <div className="space-y-1">
              <label className="block text-xs text-slate-600">
                Optional Bearer Authorization / API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Bearer token (optional)"
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-900 bg-white"
              />
            </div>

            {/* Test connection button */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleRunTest}
                disabled={testStatus === 'testing'}
                className="px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {testStatus === 'testing' ? 'Testing Gateway...' : 'Ping Test Endpoint'}
              </button>

              {testStatus === 'success' && (
                <span className="text-xs text-emerald-600 font-medium">
                  ✓ Connected successfully
                </span>
              )}
              {testStatus === 'failed' && (
                <span className="text-xs text-amber-600 font-medium">
                  Endpoint not reachable yet. Using verified MAS seed fallback.
                </span>
              )}
            </div>
          </div>

          {/* Sample Backend Proxy Implementation */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-slate-600" />
                <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  Ready-to-Paste Express / Node Proxy
                </span>
              </div>
              <button
                onClick={copyToClipboard}
                className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>

            <div className="bg-slate-900 text-slate-200 rounded-xl p-4 font-mono text-[11px] overflow-x-auto max-h-56">
              <pre>{sampleBackendSnippet}</pre>
            </div>
          </div>

          {/* MAS Official Links */}
          <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <span>MAS Monetary Policy & Overnight SORA Specification</span>
            </span>
            <a
              href="https://www.mas.gov.sg/monetary-policy/sora"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-slate-700 hover:text-rose-600 font-medium"
            >
              <span>mas.gov.sg/monetary-policy/sora</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};
