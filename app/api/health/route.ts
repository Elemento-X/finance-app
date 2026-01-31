import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { logger } from '@/lib/logger'
import { HEALTH_CHECK_TIMEOUT_MS, HEALTH_CHECK_CACHE_MS } from '@/lib/constants'

const DEFAULT_TIMEOUT_MS = HEALTH_CHECK_TIMEOUT_MS

// Cache for health check responses (30 seconds)
interface CachedHealthResponse {
  data: HealthResponse
  cachedAt: number
}

interface HealthResponse {
  ok: boolean
  timestamp: string
  durationMs: number
  checks: Record<string, ServiceCheck>
  cached?: boolean
}

let healthCache: CachedHealthResponse | null = null

type ServiceCheck = {
  ok: boolean
  status?: number
  error?: string
  latencyMs?: number
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<{ response?: Response; error?: string; latencyMs: number }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  const start = Date.now()

  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    return { response, latencyMs: Date.now() - start }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { error: message, latencyMs: Date.now() - start }
  } finally {
    clearTimeout(timeout)
  }
}

async function checkSupabase(): Promise<ServiceCheck> {
  try {
    const supabase = getSupabaseAdmin()
    const start = Date.now()
    const { error } = await supabase.from('profiles').select('id').limit(1)
    const latencyMs = Date.now() - start

    if (error) {
      return { ok: false, error: error.message, latencyMs }
    }

    return { ok: true, latencyMs }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { ok: false, error: message }
  }
}

async function checkExternal(
  name: string,
  url: string,
  options: RequestInit = {},
): Promise<{ name: string; result: ServiceCheck }> {
  const { response, error, latencyMs } = await fetchWithTimeout(url, options)
  if (error) {
    return { name, result: { ok: false, error, latencyMs } }
  }
  return {
    name,
    result: {
      ok: !!response?.ok,
      status: response?.status,
      latencyMs,
      error: response?.ok ? undefined : response?.statusText,
    },
  }
}

export async function GET() {
  // Check cache first (30 seconds TTL)
  const now = Date.now()
  if (healthCache && now - healthCache.cachedAt < HEALTH_CHECK_CACHE_MS) {
    return NextResponse.json(
      { ...healthCache.data, cached: true },
      { status: healthCache.data.ok ? 200 : 503 },
    )
  }

  const startedAt = Date.now()

  const supabase = await checkSupabase()

  const externalChecks = await Promise.all([
    checkExternal(
      'yahoo',
      'https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d&range=1d',
    ),
    checkExternal(
      'coingecko',
      'https://api.coingecko.com/api/v3/ping',
    ),
    checkExternal('brapi', 'https://brapi.dev/api/quote/PETR4'),
    checkExternal('bcb', 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json'),
  ])

  const checks: Record<string, ServiceCheck> = {
    supabase,
    groq: {
      ok: !!process.env.GROQ_API_KEY,
      error: process.env.GROQ_API_KEY ? undefined : 'Missing GROQ_API_KEY',
    },
  }

  externalChecks.forEach(({ name, result }) => {
    checks[name] = result
  })

  const ok = Object.values(checks).every((c) => c.ok)
  const durationMs = Date.now() - startedAt

  if (!ok) {
    logger.app.error('Health check failed', { checks })
  }

  const response: HealthResponse = {
    ok,
    timestamp: new Date().toISOString(),
    durationMs,
    checks,
  }

  // Cache the response
  healthCache = {
    data: response,
    cachedAt: now,
  }

  return NextResponse.json(response, { status: ok ? 200 : 503 })
}
