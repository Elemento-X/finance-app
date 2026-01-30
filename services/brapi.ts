// Stock Data Service - Brazilian Stocks via Brapi.dev
// Free tier: 15,000 requests/month
// Docs: https://brapi.dev/docs

import { logger } from '@/lib/logger'

const API_KEY = process.env.NEXT_PUBLIC_BRAPI_API_KEY
const BASE_URL = 'https://brapi.dev/api'
const CACHE_KEY = 'brapi_stocks_cache'
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours
const REQUEST_TIMEOUT_MS = 10 * 1000

// List of 15 Brazilian stocks to display in the radar
export const RADAR_STOCKS = [
  'DIRR3',
  'ITSA4',
  'CURY3',
  'CMIG4',
  'KLBN11',
  'BMOB3',
  'AAPL34', // BDR Apple
  'MSFT34', // BDR Microsoft
  'ITUB4', // Itaú Unibanco
  'MRVE3',
  'PETR3',
  'PETR4',
  'VALE3',
  'BBAS3',
  'ABEV3', // Ambev
]

function logRadarListIssues(): void {
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  const invalid: string[] = []

  for (const symbol of RADAR_STOCKS) {
    const trimmed = symbol.trim()
    if (!trimmed) {
      invalid.push(symbol)
      continue
    }

    if (seen.has(trimmed)) {
      duplicates.add(trimmed)
    } else {
      seen.add(trimmed)
    }
  }

  if (invalid.length > 0) {
    logger.brapi.warn('RADAR_STOCKS has empty/invalid symbols:', invalid)
  }

  if (duplicates.size > 0) {
    logger.brapi.warn(
      'RADAR_STOCKS has duplicated symbols:',
      Array.from(duplicates),
    )
  }
}

logRadarListIssues()

// Interface with ALL data available in free tier
export interface StockData {
  // Identification
  symbol: string
  shortName: string
  longName: string
  logoUrl?: string
  currency: string

  // Current price data
  currentPrice: number
  previousClose: number
  open: number
  change: number
  changePercent: number
  updatedAt: string

  // Day range
  dayHigh: number
  dayLow: number

  // 52 week range
  weekHigh52: number
  weekLow52: number

  // Volume & Market Cap
  volume: number
  marketCap: number

  // Fundamentals
  peRatio: number // P/L
  eps: number // LPA (Lucro por Ação)

  // Metadata
  lastUpdate: number
  error?: string
}

interface CacheData {
  stocks: StockData[]
  timestamp: number
}

interface BrapiQuoteResult {
  symbol: string
  shortName?: string
  longName?: string
  logourl?: string
  currency?: string
  regularMarketPrice?: number
  regularMarketPreviousClose?: number
  regularMarketOpen?: number
  regularMarketChange?: number
  regularMarketChangePercent?: number
  regularMarketTime?: string
  regularMarketDayHigh?: number
  regularMarketDayLow?: number
  regularMarketVolume?: number
  marketCap?: number
  fiftyTwoWeekHigh?: number
  fiftyTwoWeekLow?: number
  priceEarnings?: number
  earningsPerShare?: number
}

/**
 * Load cache from localStorage
 */
function loadCache(): CacheData | null {
  if (typeof window === 'undefined') return null

  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return null

    const data: CacheData = JSON.parse(cached)

    if (Date.now() - data.timestamp > CACHE_TTL) {
      return null
    }

    return data
  } catch {
    return null
  }
}

/**
 * Save cache to localStorage
 */
function saveCache(stocks: StockData[]): void {
  if (typeof window === 'undefined') return

  try {
    const data: CacheData = {
      stocks,
      timestamp: Date.now(),
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(data))
  } catch (error) {
    logger.brapi.error('Failed to save cache:', error)
  }
}

/**
 * Fetch stock data from Brapi.dev
 */
async function fetchStockFromBrapi(symbol: string): Promise<StockData | null> {
  const url = `${BASE_URL}/quote/${symbol}`
  const headers: HeadersInit = {}
  if (API_KEY) {
    headers.Authorization = `Bearer ${API_KEY}`
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(url, { headers, signal: controller.signal })

    if (!response.ok) {
      logger.brapi.error(`HTTP error for ${symbol}:`, response.status)
      return null
    }

    const data = await response.json()

    if (!data.results || data.results.length === 0) {
      logger.brapi.warn(`No data for ${symbol}`)
      return null
    }

    const r: BrapiQuoteResult = data.results[0]

    const peRatio = r.priceEarnings || 0

    return {
      symbol: r.symbol || symbol,
      shortName: r.shortName || symbol,
      longName: r.longName || r.shortName || symbol,
      logoUrl: r.logourl,
      currency: r.currency || 'BRL',
      currentPrice: r.regularMarketPrice || 0,
      previousClose: r.regularMarketPreviousClose || 0,
      open: r.regularMarketOpen || 0,
      change: r.regularMarketChange || 0,
      changePercent: r.regularMarketChangePercent || 0,
      updatedAt: r.regularMarketTime || new Date().toISOString(),
      dayHigh: r.regularMarketDayHigh || 0,
      dayLow: r.regularMarketDayLow || 0,
      weekHigh52: r.fiftyTwoWeekHigh || 0,
      weekLow52: r.fiftyTwoWeekLow || 0,
      volume: r.regularMarketVolume || 0,
      marketCap: r.marketCap || 0,
      peRatio,
      eps: r.earningsPerShare || 0,
      lastUpdate: Date.now(),
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      logger.brapi.warn(`Request timed out for ${symbol}`)
    }
    logger.brapi.error(`Error fetching ${symbol}:`, error)
    return null
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Create error placeholder for failed fetches
 */
function createErrorStock(symbol: string): StockData {
  return {
    symbol,
    shortName: symbol,
    longName: symbol,
    currency: 'BRL',
    currentPrice: 0,
    previousClose: 0,
    open: 0,
    change: 0,
    changePercent: 0,
    updatedAt: new Date().toISOString(),
    dayHigh: 0,
    dayLow: 0,
    weekHigh52: 0,
    weekLow52: 0,
    volume: 0,
    marketCap: 0,
    peRatio: 0,
    eps: 0,
    lastUpdate: Date.now(),
    error: 'Failed to fetch data',
  }
}

/**
 * Main function to fetch all stocks data
 */
export async function fetchRadarStocks(): Promise<StockData[]> {
  const cached = loadCache()
  if (cached) {
    return cached.stocks
  }

  const results: StockData[] = []

  for (const symbol of RADAR_STOCKS) {
    const stockData = await fetchStockFromBrapi(symbol)

    if (stockData) {
      results.push(stockData)
    } else {
      results.push(createErrorStock(symbol))
      logger.brapi.warn(`Failed to fetch ${symbol}`)
    }

    // Delay to respect rate limits (500ms between requests)
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  if (results.some((r) => !r.error)) {
    saveCache(results)
  }

  const unavailableSymbols = results
    .filter((stock) => stock.error)
    .map((stock) => stock.symbol)
  if (unavailableSymbols.length > 0) {
    logger.brapi.warn(
      'Radar stocks unavailable (Dados Indisponíveis):',
      unavailableSymbols,
    )
  }

  return results
}

/**
 * Clear the cache
 */
export function clearRadarCache(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(CACHE_KEY)
}

/**
 * Check if cache exists and is valid
 */
export function hasCachedData(): boolean {
  return loadCache() !== null
}

/**
 * Get cache age in hours
 */
export function getCacheAge(): number | null {
  if (typeof window === 'undefined') return null

  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return null

    const data: CacheData = JSON.parse(cached)
    return (Date.now() - data.timestamp) / (1000 * 60 * 60)
  } catch {
    return null
  }
}

/**
 * Format large numbers (market cap, volume)
 */
export function formatLargeNumber(
  value: number,
  locale: string = 'pt-BR',
): string {
  if (value == null || isNaN(value)) return '0'
  if (value >= 1e12) {
    return `${(value / 1e12).toLocaleString(locale, { maximumFractionDigits: 2 })} T`
  }
  if (value >= 1e9) {
    return `${(value / 1e9).toLocaleString(locale, { maximumFractionDigits: 2 })} B`
  }
  if (value >= 1e6) {
    return `${(value / 1e6).toLocaleString(locale, { maximumFractionDigits: 2 })} M`
  }
  if (value >= 1e3) {
    return `${(value / 1e3).toLocaleString(locale, { maximumFractionDigits: 2 })} K`
  }
  return value.toLocaleString(locale)
}
