import type { Category } from './types'

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'moradia', name: 'Moradia', type: 'mixed', icon: '🏠' },
  { id: 'alimentacao', name: 'Alimentação', type: 'mixed', icon: '🍽️' },
  { id: 'transporte', name: 'Transporte', type: 'mixed', icon: '🚗' },
  { id: 'lazer', name: 'Lazer', type: 'mixed', icon: '🎮' },
  {
    id: 'investimentos',
    name: 'Investimentos',
    type: 'investment',
    icon: '📈',
  },
  { id: 'saude', name: 'Saúde', type: 'mixed', icon: '💊' },
  { id: 'outros', name: 'Outros', type: 'mixed', icon: '📦' },
]

export const CURRENCY_OPTIONS = [
  { value: 'BRL', label: 'R$ (Real)' },
  { value: 'USD', label: '$ (Dólar)' },
  { value: 'EUR', label: '€ (Euro)' },
]

export const TRANSACTION_COLORS = {
  income: 'rgb(34, 197, 94)', // green-500
  expense: 'rgb(239, 68, 68)', // red-500
  investment: 'rgb(59, 130, 246)', // blue-500
  unexpected: 'rgb(249, 115, 22)', // orange-500
}

export const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'pt', label: 'Português' },
]

// =============================================================================
// API Timeouts (milliseconds)
// =============================================================================

/** Timeout for external API calls (Yahoo, CoinGecko, Brapi, BCB) */
export const API_TIMEOUT_MS = 10_000 // 10 seconds

/** Timeout for health check service verification */
export const HEALTH_CHECK_TIMEOUT_MS = 5_000 // 5 seconds

/** Cache duration for health check responses */
export const HEALTH_CHECK_CACHE_MS = 30_000 // 30 seconds

/** Cache duration for market data quotes */
export const MARKET_DATA_CACHE_MS = 60 * 60 * 1000 // 1 hour

/** Cache duration for Brapi radar stocks */
export const BRAPI_CACHE_MS = 24 * 60 * 60 * 1000 // 24 hours

// =============================================================================
// Rate Limiting
// =============================================================================

/** Rate limit window for Telegram webhook */
export const TELEGRAM_RATE_LIMIT_WINDOW_MS = 60_000 // 1 minute

/** Max requests per window for Telegram webhook */
export const TELEGRAM_RATE_LIMIT_MAX_REQUESTS = 10

// =============================================================================
// Data Retention
// =============================================================================

/** Retention period for usage_events in days */
export const USAGE_EVENTS_RETENTION_DAYS = 90
