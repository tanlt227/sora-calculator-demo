import { SoraDailyRate } from '../types/sora';
import {
  SEEDED_MAS_SORA_RATES,
  LATEST_MAS_BENCHMARKS,
  isSgBusinessDay,
} from './masRatesData';

// Configuration for MAS backend integration
export interface BackendConfig {
  apiUrl: string;
  useLiveApi: boolean;
  apiKey?: string;
  cacheTtlMinutes: number;
}

const DEFAULT_CONFIG: BackendConfig = {
  apiUrl: '/api/sora',
  useLiveApi: true,
  cacheTtlMinutes: 60,
};

const STORAGE_KEY_CONFIG = 'sora_calculator_backend_config';
const STORAGE_KEY_RATES = 'sora_calculator_cached_rates';

export class SoraService {
  private config: BackendConfig;
  private ratesCache: SoraDailyRate[] = [];
  private lastFetchedTime: string | null = null;
  private isOnlineSource: boolean = false;

  constructor() {
    this.config = this.loadConfig();
    this.ratesCache = this.loadCachedRates() || SEEDED_MAS_SORA_RATES;
    this.lastFetchedTime = new Date().toISOString();
  }

  public async checkHealth(): Promise<{ status: string; masKeyConfigured: boolean }> {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // offline / client-only fallback
    }
    return { status: 'unknown', masKeyConfigured: false };
  }

  public getConfig(): BackendConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<BackendConfig>): void {
    this.config = { ...this.config, ...newConfig };
    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(this.config));
    } catch {
      // LocalStorage disabled
    }
  }

  private loadConfig(): BackendConfig {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (saved) return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
    } catch {
      // fallback
    }
    return { ...DEFAULT_CONFIG };
  }

  private loadCachedRates(): SoraDailyRate[] | null {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RATES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return null;
  }

  private saveRatesToCache(rates: SoraDailyRate[]) {
    try {
      localStorage.setItem(STORAGE_KEY_RATES, JSON.stringify(rates));
    } catch {
      // ignore
    }
  }

  /**
   * Fetch rates: tries live backend/MAS endpoint if configured, else returns official seeded benchmark series
   */
  public async fetchRates(forceRefresh: boolean = false): Promise<{
    rates: SoraDailyRate[];
    source: 'MAS Official Seed' | 'Live MAS Gateway' | 'Custom Backend API';
    lastUpdated: string;
    totalRecords: number;
  }> {
    if (this.config.useLiveApi) {
      try {
        const headers: Record<string, string> = {
          'Accept': 'application/json',
        };
        if (this.config.apiKey) {
          headers['KeyId'] = this.config.apiKey;
          headers['x-mas-key-id'] = this.config.apiKey;
        }

        const response = await fetch(this.config.apiUrl, {
          method: 'GET',
          headers,
        });

        if (response.ok) {
          const data = await response.json();
          // Normalize MAS API format or backend proxy format
          const formatted = this.normalizeApiResponse(data);
          if (formatted.length > 0) {
            this.ratesCache = formatted;
            this.saveRatesToCache(formatted);
            this.lastFetchedTime = new Date().toISOString();
            this.isOnlineSource = true;
            return {
              rates: formatted,
              source: this.config.apiUrl.includes('eservices.mas.gov.sg')
                ? 'Live MAS Gateway'
                : 'Custom Backend API',
              lastUpdated: this.lastFetchedTime,
              totalRecords: formatted.length,
            };
          }
        }
      } catch (err) {
        console.warn('Could not fetch from live MAS API/backend endpoint, using authentic benchmark data', err);
      }
    }

    // Default to verified MAS dataset
    this.ratesCache = SEEDED_MAS_SORA_RATES;
    this.lastFetchedTime = new Date().toISOString();
    return {
      rates: this.ratesCache,
      source: 'MAS Official Seed',
      lastUpdated: this.lastFetchedTime,
      totalRecords: this.ratesCache.length,
    };
  }

  public getRates(): SoraDailyRate[] {
    return this.ratesCache.length > 0 ? this.ratesCache : SEEDED_MAS_SORA_RATES;
  }

  public getLatestBenchmarks() {
    const rates = this.getRates();
    const latest = rates[0] || SEEDED_MAS_SORA_RATES[0];
    return {
      ...LATEST_MAS_BENCHMARKS,
      publicationDate: latest.date,
      overnight: latest.overnightRate,
      compounded1M: latest.compounded1M || LATEST_MAS_BENCHMARKS.compounded1M,
      compounded3M: latest.compounded3M || LATEST_MAS_BENCHMARKS.compounded3M,
      compounded6M: latest.compounded6M || LATEST_MAS_BENCHMARKS.compounded6M,
      soraIndex: latest.soraIndex || LATEST_MAS_BENCHMARKS.soraIndex,
      volumeSGD: latest.aggregateVolume || LATEST_MAS_BENCHMARKS.volumeSGD,
      percentile10: latest.percentile10 || LATEST_MAS_BENCHMARKS.percentile10,
      percentile90: latest.percentile90 || LATEST_MAS_BENCHMARKS.percentile90,
    };
  }

  /**
   * Parse response from MAS API or custom backend
   */
  private normalizeApiResponse(data: any): SoraDailyRate[] {
    // If array already
    if (Array.isArray(data)) return data;

    // Serverless endpoint format: { records: [...] }
    if (data?.records && Array.isArray(data.records)) {
      return data.records;
    }

    // Standard MAS CKAN Datastore JSON format: data.result.records
    if (data?.result?.records && Array.isArray(data.result.records)) {
      return data.result.records
        .map((rec: any) => ({
          date: rec.end_of_day || rec.date || rec.date_of_publication,
          overnightRate: parseFloat(rec.sora || rec.rate || rec.overnight_rate),
          compounded1M: rec.compounded_1m ? parseFloat(rec.compounded_1m) : undefined,
          compounded3M: rec.compounded_3m ? parseFloat(rec.compounded_3m) : undefined,
          compounded6M: rec.compounded_6m ? parseFloat(rec.compounded_6m) : undefined,
          soraIndex: rec.sora_index ? parseFloat(rec.sora_index) : undefined,
          aggregateVolume: rec.aggregate_volume ? parseFloat(rec.aggregate_volume) : undefined,
          percentile10: rec.calculation_percentile_10 ? parseFloat(rec.calculation_percentile_10) : undefined,
          percentile90: rec.calculation_percentile_90 ? parseFloat(rec.calculation_percentile_90) : undefined,
        }))
        .filter((r: SoraDailyRate) => r.date && !isNaN(r.overnightRate));
    }

    return [];
  }

  /**
   * Export rate series to CSV file
   */
  public exportRatesToCSV(rates: SoraDailyRate[]): string {
    const headers = [
      'Date',
      'Overnight_SORA_Pct',
      'Compounded_1M_Pct',
      'Compounded_3M_Pct',
      'Compounded_6M_Pct',
      'SORA_Index',
      'Volume_SGD_M',
      'Percentile_10_Pct',
      'Percentile_90_Pct',
    ];

    const rows = rates.map((r) => [
      r.date,
      r.overnightRate.toFixed(4),
      (r.compounded1M ?? '').toString(),
      (r.compounded3M ?? '').toString(),
      (r.compounded6M ?? '').toString(),
      (r.soraIndex ?? '').toString(),
      (r.aggregateVolume ?? '').toString(),
      (r.percentile10 ?? '').toString(),
      (r.percentile90 ?? '').toString(),
    ]);

    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  }

  /**
   * Export Amortization Schedule to CSV
   */
  public exportAmortizationCSV(schedule: any[]): string {
    const headers = [
      'Month',
      'Date',
      'Beginning_Balance_SGD',
      'Monthly_Payment_SGD',
      'Principal_Paid_SGD',
      'Interest_Paid_SGD',
      'Ending_Balance_SGD',
      'Cumulative_Interest_SGD',
      'Cumulative_Principal_SGD',
      'Effective_Rate_Pct',
    ];

    const rows = schedule.map((r) => [
      r.period,
      `"${r.date}"`,
      r.beginningBalance.toFixed(2),
      r.monthlyPayment.toFixed(2),
      r.principalPaid.toFixed(2),
      r.interestPaid.toFixed(2),
      r.endingBalance.toFixed(2),
      r.cumulativeInterest.toFixed(2),
      r.cumulativePrincipal.toFixed(2),
      r.effectiveRate.toFixed(4),
    ]);

    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  }
}

export const soraService = new SoraService();
