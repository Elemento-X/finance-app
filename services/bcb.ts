// BCB (Banco Central do Brasil) API Service
// Free, reliable, no authentication required
// Docs: https://dadosabertos.bcb.gov.br/

import { logger } from '@/lib/logger'

const BASE_URL = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs'
const REQUEST_TIMEOUT_MS = 10 * 1000

// Series codes
const SELIC_SERIES = 432 // Taxa Selic Meta
const IPCA_SERIES = 433 // IPCA - Variação mensal

// Cache keys and TTL
const CACHE_KEY_SELIC = 'bcb_selic_cache'
const CACHE_KEY_IPCA = 'bcb_ipca_cache'
const SELIC_CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours
const IPCA_CACHE_TTL = 7 * 24 * 60 * 60 * 1000 // 7 days (IPCA updates monthly)

export interface MacroData {
  selic: {
    value: number
    date: string
  } | null
  ipca: {
    monthly: number
    accumulated12m: number
    date: string
  } | null
  lastUpdate: number
}

interface BCBDataPoint {
  data: string // DD/MM/YYYY
  valor: string
}

interface CacheEntry<T> {
  data: T
  timestamp: number
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Load from localStorage cache
 */
function loadCache<T>(key: string, ttl: number): T | null {
  if (typeof window === 'undefined') return null

  try {
    const cached = localStorage.getItem(key)
    if (!cached) return null

    const entry: CacheEntry<T> = JSON.parse(cached)
    if (Date.now() - entry.timestamp > ttl) {
      return null
    }

    return entry.data
  } catch {
    return null
  }
}

/**
 * Save to localStorage cache
 */
function saveCache<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return

  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
    }
    localStorage.setItem(key, JSON.stringify(entry))
  } catch (error) {
    logger.app.error('Failed to save BCB cache:', error)
  }
}

/**
 * Fetch Selic rate from BCB
 */
async function fetchSelic(): Promise<MacroData['selic']> {
  // Check cache first
  const cached = loadCache<MacroData['selic']>(CACHE_KEY_SELIC, SELIC_CACHE_TTL)
  if (cached) {
    return cached
  }

  try {
    const response = await fetchWithTimeout(
      `${BASE_URL}.${SELIC_SERIES}/dados/ultimos/1?formato=json`,
    )

    if (!response.ok) {
      logger.app.error('BCB Selic API error:', response.status)
      return null
    }

    const data: BCBDataPoint[] = await response.json()

    if (!data || data.length === 0) {
      return null
    }

    const latest = data[0]
    const result = {
      value: parseFloat(latest.valor),
      date: latest.data,
    }

    saveCache(CACHE_KEY_SELIC, result)
    return result
  } catch (error) {
    logger.app.error('Failed to fetch Selic:', error)
    return null
  }
}

/**
 * Fetch IPCA from BCB (last 12 months for accumulated calculation)
 */
async function fetchIPCA(): Promise<MacroData['ipca']> {
  // Check cache first
  const cached = loadCache<MacroData['ipca']>(CACHE_KEY_IPCA, IPCA_CACHE_TTL)
  if (cached) {
    return cached
  }

  try {
    const response = await fetchWithTimeout(
      `${BASE_URL}.${IPCA_SERIES}/dados/ultimos/12?formato=json`,
    )

    if (!response.ok) {
      logger.app.error('BCB IPCA API error:', response.status)
      return null
    }

    const data: BCBDataPoint[] = await response.json()

    if (!data || data.length === 0) {
      return null
    }

    // Latest monthly value
    const latest = data[data.length - 1]
    const monthly = parseFloat(latest.valor)

    // Calculate accumulated 12 months
    // Formula: ((1 + r1) * (1 + r2) * ... * (1 + r12) - 1) * 100
    const accumulated12m = data.reduce((acc, point) => {
      const rate = parseFloat(point.valor) / 100
      return acc * (1 + rate)
    }, 1)

    const result = {
      monthly,
      accumulated12m: (accumulated12m - 1) * 100,
      date: latest.data,
    }

    saveCache(CACHE_KEY_IPCA, result)
    return result
  } catch (error) {
    logger.app.error('Failed to fetch IPCA:', error)
    return null
  }
}

/**
 * Fetch all macro data
 */
export async function fetchMacroData(): Promise<MacroData> {
  const [selic, ipca] = await Promise.all([fetchSelic(), fetchIPCA()])

  return {
    selic,
    ipca,
    lastUpdate: Date.now(),
  }
}

/**
 * Clear macro data cache
 */
export function clearMacroCache(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(CACHE_KEY_SELIC)
  localStorage.removeItem(CACHE_KEY_IPCA)
}
