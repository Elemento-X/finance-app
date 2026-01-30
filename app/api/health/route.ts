import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { logger } from '@/lib/logger'

const DEFAULT_TIMEOUT_MS = 5000

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

  return NextResponse.json(
    {
      ok,
      timestamp: new Date().toISOString(),
      durationMs,
      checks,
    },
    { status: ok ? 200 : 503 },
  )
}
