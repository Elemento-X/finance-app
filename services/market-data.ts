// Market Data Service - Fetches real-time market data from external APIs
import type { AssetClass, MarketData } from "@/lib/investment-types"

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const CACHE_KEY = "market_data_cache"

// Retry configuration
const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY = 1000 // 1 second

/**
 * Sleep helper for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Fetch with automatic retry on network errors
 * Uses exponential backoff: 1s, 2s, 3s
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries: number = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options)
      // Return response even if not ok - let caller handle HTTP errors
      return response
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      console.warn(`[MarketData] Fetch attempt ${attempt}/${maxRetries} failed:`, lastError.message)

      // Don't sleep after the last attempt
      if (attempt < maxRetries) {
        const delay = INITIAL_RETRY_DELAY * attempt // 1s, 2s, 3s
        console.log(`[MarketData] Retrying in ${delay}ms...`)
        await sleep(delay)
      }
    }
  }

  // All retries exhausted
  throw lastError || new Error('Fetch failed after retries')
}

interface CacheEntry {
  data: MarketData
  timestamp: number
}

type MarketDataCache = Record<string, CacheEntry>

export interface MarketDataResult {
  data: MarketData | null
  error?: {
    type: 'network' | 'not_found' | 'invalid_response' | 'fixed_income'
    symbol: string
  }
  fromCache?: boolean
}

/**
 * Detects if a ticker symbol is from the Brazilian market (B3)
 * Brazilian tickers typically end with a number (PETR4, VALE3, HGLG11, BOVA11)
 * or have specific suffixes like .SA
 */
function isBrazilianTicker(symbol: string): boolean {
  const upperSymbol = symbol.toUpperCase()

  // Already has .SA suffix
  if (upperSymbol.endsWith('.SA')) {
    return true
  }

  // Brazilian pattern: 4-6 chars ending with number(s)
  // Examples: PETR4, VALE3, ITUB4, HGLG11, BOVA11, IVVB11
  const brazilianPattern = /^[A-Z]{4}[0-9]{1,2}$/
  if (brazilianPattern.test(upperSymbol)) {
    return true
  }

  // BDRs pattern: ends with 34 or 35
  const bdrPattern = /^[A-Z]{4,5}3[45]$/
  if (bdrPattern.test(upperSymbol)) {
    return true
  }

  return false
}

/**
 * Formats the symbol for Yahoo Finance API
 */
function formatYahooSymbol(symbol: string, assetClass: AssetClass): string {
  const upperSymbol = symbol.toUpperCase().replace('.SA', '')

  // Brazilian assets need .SA suffix
  if (isBrazilianTicker(upperSymbol) || assetClass === 'fiis') {
    return `${upperSymbol}.SA`
  }

  // US/International assets - no suffix needed
  return upperSymbol
}

class MarketDataService {
  private cache: MarketDataCache = {}
  private failedSymbols: Set<string> = new Set()

  constructor() {
    this.loadCache()
  }

  private loadCache() {
    if (typeof window === "undefined") return
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        this.cache = JSON.parse(cached)
      }
    } catch (error) {
      console.error("[MarketData] Failed to load cache:", error)
    }
  }

  private saveCache() {
    if (typeof window === "undefined") return
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(this.cache))
    } catch (error) {
      console.error("[MarketData] Failed to save cache:", error)
    }
  }

  private isCacheValid(symbol: string): boolean {
    const entry = this.cache[symbol]
    if (!entry) return false
    return Date.now() - entry.timestamp < CACHE_DURATION
  }

  private getCachedData(symbol: string): MarketData | null {
    return this.cache[symbol]?.data || null
  }

  async fetchStockData(symbol: string, assetClass: AssetClass): Promise<MarketDataResult> {
    const cacheKey = symbol.toUpperCase()

    if (this.isCacheValid(cacheKey)) {
      return {
        data: this.cache[cacheKey].data,
        fromCache: true
      }
    }

    const yahooSymbol = formatYahooSymbol(symbol, assetClass)

    try {
      const response = await fetchWithRetry(
        `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=1d`,
      )

      if (!response.ok) {
        const cachedData = this.getCachedData(cacheKey)
        this.failedSymbols.add(symbol)
        return {
          data: cachedData,
          error: { type: 'network', symbol },
          fromCache: !!cachedData
        }
      }

      const data = await response.json()

      if (!data.chart?.result?.[0]) {
        const cachedData = this.getCachedData(cacheKey)
        this.failedSymbols.add(symbol)
        return {
          data: cachedData,
          error: { type: 'not_found', symbol },
          fromCache: !!cachedData
        }
      }

      const quote = data.chart.result[0]
      const meta = quote.meta
      const currentPrice = meta.regularMarketPrice
      const previousClose = meta.previousClose

      if (!currentPrice || !previousClose) {
        const cachedData = this.getCachedData(cacheKey)
        return {
          data: cachedData,
          error: { type: 'invalid_response', symbol },
          fromCache: !!cachedData
        }
      }

      const dailyChange = ((currentPrice - previousClose) / previousClose) * 100

      const marketData: MarketData = {
        symbol: symbol.toUpperCase(),
        currentPrice,
        dailyChange,
        currency: meta.currency || "BRL",
        lastUpdate: Date.now(),
      }

      this.cache[cacheKey] = { data: marketData, timestamp: Date.now() }
      this.saveCache()
      this.failedSymbols.delete(symbol)

      return { data: marketData }
    } catch (error) {
      console.error(`[MarketData] Failed to fetch ${symbol}:`, error)
      const cachedData = this.getCachedData(cacheKey)
      this.failedSymbols.add(symbol)
      return {
        data: cachedData,
        error: { type: 'network', symbol },
        fromCache: !!cachedData
      }
    }
  }

  async fetchCryptoData(symbol: string): Promise<MarketDataResult> {
    const cacheKey = `crypto_${symbol.toLowerCase()}`

    if (this.isCacheValid(cacheKey)) {
      return {
        data: this.cache[cacheKey].data,
        fromCache: true
      }
    }

    try {
      const coinId = this.getCoinGeckoId(symbol)
      const response = await fetchWithRetry(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=brl&include_24hr_change=true`,
      )

      if (!response.ok) {
        const cachedData = this.getCachedData(cacheKey)
        this.failedSymbols.add(symbol)
        return {
          data: cachedData,
          error: { type: 'network', symbol },
          fromCache: !!cachedData
        }
      }

      const data = await response.json()
      const coinData = data[coinId]

      if (!coinData || coinData.brl === undefined) {
        const cachedData = this.getCachedData(cacheKey)
        this.failedSymbols.add(symbol)
        return {
          data: cachedData,
          error: { type: 'not_found', symbol },
          fromCache: !!cachedData
        }
      }

      const marketData: MarketData = {
        symbol: symbol.toUpperCase(),
        currentPrice: coinData.brl,
        dailyChange: coinData.brl_24h_change || 0,
        currency: "BRL",
        lastUpdate: Date.now(),
      }

      this.cache[cacheKey] = { data: marketData, timestamp: Date.now() }
      this.saveCache()
      this.failedSymbols.delete(symbol)

      return { data: marketData }
    } catch (error) {
      console.error(`[MarketData] Failed to fetch crypto ${symbol}:`, error)
      const cachedData = this.getCachedData(cacheKey)
      this.failedSymbols.add(symbol)
      return {
        data: cachedData,
        error: { type: 'network', symbol },
        fromCache: !!cachedData
      }
    }
  }

  private getCoinGeckoId(symbol: string): string {
    const mapping: Record<string, string> = {
      BTC: "bitcoin",
      ETH: "ethereum",
      BNB: "binancecoin",
      ADA: "cardano",
      SOL: "solana",
      XRP: "ripple",
      DOT: "polkadot",
      DOGE: "dogecoin",
      AVAX: "avalanche-2",
      MATIC: "matic-network",
      USDT: "tether",
      USDC: "usd-coin",
      LINK: "chainlink",
      UNI: "uniswap",
      ATOM: "cosmos",
    }
    return mapping[symbol.toUpperCase()] || symbol.toLowerCase()
  }

  async fetchMarketData(symbol: string, assetClass: AssetClass): Promise<MarketDataResult> {
    // Fixed income doesn't have real-time quotes
    if (assetClass === "fixed-income") {
      return {
        data: null,
        error: { type: 'fixed_income', symbol }
      }
    }

    if (assetClass === "crypto") {
      return this.fetchCryptoData(symbol)
    }

    return this.fetchStockData(symbol, assetClass)
  }

  getFailedSymbols(): string[] {
    return Array.from(this.failedSymbols)
  }

  clearFailedSymbols() {
    this.failedSymbols.clear()
  }

  clearCache() {
    this.cache = {}
    this.failedSymbols.clear()
    this.saveCache()
  }
}

export const marketDataService = new MarketDataService()
