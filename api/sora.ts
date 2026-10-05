/**
 * Serverless SORA Rates Endpoint
 * Path: /api/sora
 *
 * Pulls MAS-backed daily SORA + compounded 1M/3M/6M averages from the official
 * Monetary Authority of Singapore API Gateway.
 *
 * Upstream Endpoint:
 * https://eservices.mas.gov.sg/apimg-gw/server/monthly_statistical_bulletin_non610mssql/domestic_interest_rates_daily/views/domestic_interest_rates_daily
 *
 * Required Header for upstream:
 * KeyId: <MAS_KEY_ID>
 */

const MAS_SORA_ENDPOINT =
  'https://eservices.mas.gov.sg/apimg-gw/server/monthly_statistical_bulletin_non610mssql/domestic_interest_rates_daily/views/domestic_interest_rates_daily';

export interface NormalizedSoraRecord {
  date: string;
  overnightRate: number;
  compounded1M?: number;
  compounded3M?: number;
  compounded6M?: number;
  soraIndex?: number;
  aggregateVolume?: number;
  percentile10?: number;
  percentile90?: number;
  calculationType?: string;
}

/**
 * Normalizes raw records from MAS API view into standard SORA records
 */
function normalizeMasRecords(rawRecords: any[]): NormalizedSoraRecord[] {
  if (!Array.isArray(rawRecords)) return [];

  const results: NormalizedSoraRecord[] = [];

  for (const item of rawRecords) {
    if (!item) continue;
    const date = item.end_of_day || item.date || item.publication_date || item.date_of_publication;
    const overnightRaw = item.sora ?? item.rate ?? item.overnight_rate;
    const overnightRate = parseFloat(overnightRaw);

    if (!date || isNaN(overnightRate)) continue;

    const c1m = item.sora_compound_1m ?? item.compounded_1m;
    const c3m = item.sora_compound_3m ?? item.compounded_3m;
    const c6m = item.sora_compound_6m ?? item.compounded_6m;
    const sIndex = item.sora_index;
    const vol = item.aggregate_volume ?? item.volume;
    const p10 = item.calculation_percentile_10 ?? item.percentile_10;
    const p90 = item.calculation_percentile_90 ?? item.percentile_90;

    results.push({
      date: String(date).trim(),
      overnightRate: +overnightRate.toFixed(4),
      compounded1M: c1m !== undefined && c1m !== null && !isNaN(parseFloat(c1m)) ? +parseFloat(c1m).toFixed(4) : undefined,
      compounded3M: c3m !== undefined && c3m !== null && !isNaN(parseFloat(c3m)) ? +parseFloat(c3m).toFixed(4) : undefined,
      compounded6M: c6m !== undefined && c6m !== null && !isNaN(parseFloat(c6m)) ? +parseFloat(c6m).toFixed(4) : undefined,
      soraIndex: sIndex !== undefined && sIndex !== null && !isNaN(parseFloat(sIndex)) ? +parseFloat(sIndex).toFixed(4) : undefined,
      aggregateVolume: vol !== undefined && vol !== null && !isNaN(parseFloat(vol)) ? Math.round(parseFloat(vol)) : undefined,
      percentile10: p10 !== undefined && p10 !== null && !isNaN(parseFloat(p10)) ? +parseFloat(p10).toFixed(4) : undefined,
      percentile90: p90 !== undefined && p90 !== null && !isNaN(parseFloat(p90)) ? +parseFloat(p90).toFixed(4) : undefined,
      calculationType: 'Volume-Weighted Average',
    });
  }

  return results.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Standard Serverless Function / Express Handler
 */
export default async function handler(req: any, res: any) {
  // Set CORS headers
  if (res.setHeader) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, KeyId, x-mas-key-id, authorization');
  }

  // Preflight
  if (req.method === 'OPTIONS') {
    if (res.status && typeof res.status === 'function') {
      return res.status(204).end();
    }
    res.writeHead?.(204);
    return res.end?.();
  }

  // Resolve API Key from environment or request headers
  const keyId =
    process.env.MAS_KEY_ID ||
    req.headers?.['keyid'] ||
    req.headers?.['key-id'] ||
    req.headers?.['x-mas-key-id'] ||
    req.query?.key_id;

  if (!keyId || typeof keyId !== 'string' || !keyId.trim()) {
    const errorPayload = {
      error: 'MAS_KEY_ID_REQUIRED',
      message:
        'MAS API KeyId is missing. Please configure the MAS_KEY_ID environment variable or pass the KeyId header.',
      documentation: 'https://eservices.mas.gov.sg/monetary-policy/sora',
      targetEndpoint: MAS_SORA_ENDPOINT,
    };

    if (res.status && typeof res.status === 'function') {
      return res.status(401).json(errorPayload);
    }
    res.writeHead?.(401, { 'Content-Type': 'application/json' });
    return res.end?.(JSON.stringify(errorPayload));
  }

  try {
    // Construct MAS URL with optional query forwarding
    const upstreamUrl = new URL(MAS_SORA_ENDPOINT);
    if (req.query) {
      Object.entries(req.query).forEach(([k, v]) => {
        if (k !== 'key_id' && typeof v === 'string') {
          upstreamUrl.searchParams.append(k, v);
        }
      });
    }

    const upstreamResponse = await fetch(upstreamUrl.toString(), {
      method: 'GET',
      headers: {
        'KeyId': keyId.trim(),
        'Accept': 'application/json',
      },
    });

    if (!upstreamResponse.ok) {
      const errorText = await upstreamResponse.text();
      let parsedError: any;
      try {
        parsedError = JSON.parse(errorText);
      } catch {
        parsedError = errorText;
      }

      const status = upstreamResponse.status;
      const errorPayload = {
        error: 'MAS_UPSTREAM_ERROR',
        status,
        statusText: upstreamResponse.statusText,
        details: parsedError,
        targetEndpoint: MAS_SORA_ENDPOINT,
      };

      if (res.status && typeof res.status === 'function') {
        return res.status(status).json(errorPayload);
      }
      res.writeHead?.(status, { 'Content-Type': 'application/json' });
      return res.end?.(JSON.stringify(errorPayload));
    }

    const data = await upstreamResponse.json();

    // Extract records (MAS views usually provide data under `data`, `result.records`, or direct array)
    const rawRecords = Array.isArray(data)
      ? data
      : Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.result?.records)
      ? data.result.records
      : [];

    const normalized = normalizeMasRecords(rawRecords);

    const responsePayload = {
      source: 'Monetary Authority of Singapore (MAS)',
      endpoint: MAS_SORA_ENDPOINT,
      lastUpdated: new Date().toISOString(),
      count: normalized.length,
      records: normalized,
      rawCount: rawRecords.length,
    };

    if (res.status && typeof res.status === 'function') {
      return res.status(200).json(responsePayload);
    }
    res.writeHead?.(200, { 'Content-Type': 'application/json' });
    return res.end?.(JSON.stringify(responsePayload));
  } catch (error: any) {
    const errorPayload = {
      error: 'MAS_GATEWAY_CONNECTION_FAILED',
      message: error?.message || 'Failed to connect to the MAS API Gateway',
      targetEndpoint: MAS_SORA_ENDPOINT,
    };

    if (res.status && typeof res.status === 'function') {
      return res.status(502).json(errorPayload);
    }
    res.writeHead?.(502, { 'Content-Type': 'application/json' });
    return res.end?.(JSON.stringify(errorPayload));
  }
}

/**
 * Web API Standard GET handler (Next.js / Edge / Cloudflare Workers)
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const keyId =
    process.env.MAS_KEY_ID ||
    request.headers.get('KeyId') ||
    request.headers.get('keyid') ||
    request.headers.get('x-mas-key-id') ||
    url.searchParams.get('key_id');

  if (!keyId || !keyId.trim()) {
    return new Response(
      JSON.stringify({
        error: 'MAS_KEY_ID_REQUIRED',
        message:
          'MAS API KeyId is missing. Please configure the MAS_KEY_ID environment variable or pass the KeyId header.',
        documentation: 'https://eservices.mas.gov.sg/monetary-policy/sora',
        targetEndpoint: MAS_SORA_ENDPOINT,
      }),
      {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }

  try {
    const upstreamUrl = new URL(MAS_SORA_ENDPOINT);
    url.searchParams.forEach((v, k) => {
      if (k !== 'key_id') upstreamUrl.searchParams.append(k, v);
    });

    const upstreamResponse = await fetch(upstreamUrl.toString(), {
      method: 'GET',
      headers: {
        'KeyId': keyId.trim(),
        'Accept': 'application/json',
      },
    });

    if (!upstreamResponse.ok) {
      const text = await upstreamResponse.text();
      return new Response(
        JSON.stringify({
          error: 'MAS_UPSTREAM_ERROR',
          status: upstreamResponse.status,
          statusText: upstreamResponse.statusText,
          details: text,
        }),
        {
          status: upstreamResponse.status,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const data = await upstreamResponse.json();
    const rawRecords = Array.isArray(data)
      ? data
      : Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.result?.records)
      ? data.result.records
      : [];

    const normalized = normalizeMasRecords(rawRecords);

    return new Response(
      JSON.stringify({
        source: 'Monetary Authority of Singapore (MAS)',
        endpoint: MAS_SORA_ENDPOINT,
        lastUpdated: new Date().toISOString(),
        count: normalized.length,
        records: normalized,
        rawCount: rawRecords.length,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        error: 'MAS_GATEWAY_CONNECTION_FAILED',
        message: err?.message || 'Failed to connect to the MAS API Gateway',
      }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}
