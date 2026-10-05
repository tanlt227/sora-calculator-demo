/**
 * Serverless Health Check Endpoint
 * Path: /api/health
 */

export interface HealthStatusResponse {
  status: 'ok' | 'degraded';
  timestamp: string;
  uptimeSeconds: number;
  masKeyConfigured: boolean;
  version: string;
  service: string;
}

// Standard Serverless / Express handler
export default async function handler(req: any, res: any) {
  // CORS configuration
  if (res.setHeader) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, KeyId, x-mas-key-id');
  }

  // Preflight request
  if (req.method === 'OPTIONS') {
    if (res.status && typeof res.status === 'function') {
      return res.status(204).end();
    }
    res.writeHead?.(204);
    return res.end?.();
  }

  const masKey = process.env.MAS_KEY_ID;
  const masKeyConfigured = Boolean(masKey && masKey.trim().length > 0);

  const payload: HealthStatusResponse = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime ? process.uptime() : 0),
    masKeyConfigured,
    version: '1.0.0',
    service: 'MAS SORA API Gateway',
  };

  if (res.status && typeof res.status === 'function') {
    return res.status(200).json(payload);
  }

  res.writeHead?.(200, { 'Content-Type': 'application/json' });
  return res.end?.(JSON.stringify(payload));
}

// Web API Standard GET handler (Next.js / Edge / Cloudflare Workers)
export async function GET() {
  const masKey = process.env.MAS_KEY_ID;
  const masKeyConfigured = Boolean(masKey && masKey.trim().length > 0);

  const payload: HealthStatusResponse = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime ? process.uptime() : 0),
    masKeyConfigured,
    version: '1.0.0',
    service: 'MAS SORA API Gateway',
  };

  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    },
  });
}
