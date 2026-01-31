/**
 * Security utilities for input validation, sanitization, and rate limiting
 */

import {
  TELEGRAM_RATE_LIMIT_MAX_REQUESTS,
  TELEGRAM_RATE_LIMIT_WINDOW_MS,
} from './constants'

// =============================================================================
// Rate Limiting (in-memory fallback + Supabase persistence)
// =============================================================================

interface RateLimitEntry {
  count: number
  resetAt: number
}

// In-memory store as fallback (for client-side or when DB is unavailable)
const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up old entries periodically (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000
let lastCleanup = Date.now()

function cleanupExpiredEntries(): void {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return

  lastCleanup = now
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key)
    }
  }
}

export interface RateLimitConfig {
  maxRequests: number // Maximum requests allowed
  windowMs: number // Time window in milliseconds
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

/**
 * Check if a request should be rate limited (in-memory, for client-side)
 * @param key Unique identifier (e.g., chatId, IP address)
 * @param config Rate limit configuration
 * @returns Whether the request is allowed and remaining quota
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig,
): RateLimitResult {
  cleanupExpiredEntries()

  const now = Date.now()
  const entry = rateLimitStore.get(key)

  // No existing entry or window expired - allow and start new window
  if (!entry || entry.resetAt < now) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + config.windowMs,
    }
    rateLimitStore.set(key, newEntry)
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: newEntry.resetAt,
    }
  }

  // Within window - check count
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    }
  }

  // Increment count
  entry.count++
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  }
}

// =============================================================================
// Supabase-based Rate Limiting (persisted across cold starts)
// =============================================================================

interface RateLimitRow {
  key: string
  count: number
  reset_at: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClientLike = any

/**
 * Check rate limit using Supabase for persistence (server-side)
 * Falls back to in-memory if DB call fails
 * @param supabase Supabase admin client
 * @param key Unique identifier (e.g., telegram:chatId)
 * @param config Rate limit configuration
 */
export async function checkRateLimitAsync(
  supabase: SupabaseClientLike,
  key: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const now = Date.now()
  const nowIso = new Date(now).toISOString()
  const resetAtIso = new Date(now + config.windowMs).toISOString()

  try {
    // Try to get existing entry
    const { data: existing, error: selectError } = await supabase
      .from('rate_limit_entries')
      .select('key, count, reset_at')
      .eq('key', key)
      .maybeSingle()

    if (selectError) {
      // Fallback to in-memory on DB error
      return checkRateLimit(key, config)
    }

    // No entry or expired - create new
    if (!existing || new Date(existing.reset_at).getTime() < now) {
      await supabase.from('rate_limit_entries').upsert(
        {
          key,
          count: 1,
          reset_at: resetAtIso,
          updated_at: nowIso,
        },
        { onConflict: 'key' },
      )

      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetAt: now + config.windowMs,
      }
    }

    // Check if limit exceeded
    if (existing.count >= config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(existing.reset_at).getTime(),
      }
    }

    // Increment count
    await supabase.from('rate_limit_entries').upsert(
      {
        key,
        count: existing.count + 1,
        reset_at: existing.reset_at,
        updated_at: nowIso,
      },
      { onConflict: 'key' },
    )

    return {
      allowed: true,
      remaining: config.maxRequests - (existing.count + 1),
      resetAt: new Date(existing.reset_at).getTime(),
    }
  } catch {
    // Fallback to in-memory on any error
    return checkRateLimit(key, config)
  }
}

/**
 * Cleanup expired rate limit entries (call from a cron job)
 */
export async function cleanupRateLimitEntries(
  supabase: SupabaseClientLike,
): Promise<void> {
  const nowIso = new Date().toISOString()
  await supabase.from('rate_limit_entries').delete().lt('reset_at', nowIso)
}

// =============================================================================
// Input Sanitization
// =============================================================================

export interface SanitizeConfig {
  maxLength: number // Maximum allowed length
  stripControlChars: boolean // Remove control characters (except newline, tab)
  stripHtml: boolean // Remove HTML tags
}

const DEFAULT_SANITIZE_CONFIG: SanitizeConfig = {
  maxLength: 1000,
  stripControlChars: true,
  stripHtml: true,
}

/**
 * Sanitize user input to prevent prompt injection and other attacks
 * @param input Raw user input
 * @param config Sanitization configuration
 * @returns Sanitized input
 */
export function sanitizeInput(
  input: string,
  config: Partial<SanitizeConfig> = {},
): string {
  const cfg = { ...DEFAULT_SANITIZE_CONFIG, ...config }

  let sanitized = input

  // Strip control characters (keep newline \n and tab \t)
  if (cfg.stripControlChars) {
    // eslint-disable-next-line no-control-regex
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  }

  // Strip HTML tags
  if (cfg.stripHtml) {
    sanitized = sanitized.replace(/<[^>]*>/g, '')
  }

  // Normalize whitespace (multiple spaces/newlines to single)
  sanitized = sanitized.replace(/\s+/g, ' ').trim()

  // Truncate to max length
  if (sanitized.length > cfg.maxLength) {
    sanitized = sanitized.slice(0, cfg.maxLength)
  }

  return sanitized
}

/**
 * Validate that input meets basic requirements
 * @param input User input to validate
 * @returns Object with validation result and error message
 */
export function validateInput(input: string): {
  valid: boolean
  error?: string
} {
  // Check for empty input
  if (!input || input.trim().length === 0) {
    return { valid: false, error: 'Input cannot be empty' }
  }

  // Check minimum length (at least 1 non-whitespace character)
  if (input.trim().length < 1) {
    return { valid: false, error: 'Input too short' }
  }

  // Check for potentially malicious patterns (basic prompt injection detection)
  const suspiciousPatterns = [
    /ignore\s+(previous|above|all)\s+instructions/i,
    /disregard\s+(previous|above|all)/i,
    /system\s*:\s*you\s+are/i,
    /\[\s*INST\s*\]/i,
    /<<\s*SYS\s*>>/i,
  ]

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(input)) {
      return { valid: false, error: 'Invalid input pattern detected' }
    }
  }

  return { valid: true }
}

// =============================================================================
// Security Constants
// =============================================================================

// Rate limit for Telegram webhook (10 messages per minute per chat)
export const TELEGRAM_RATE_LIMIT: RateLimitConfig = {
  maxRequests: TELEGRAM_RATE_LIMIT_MAX_REQUESTS,
  windowMs: TELEGRAM_RATE_LIMIT_WINDOW_MS,
}

// Maximum message length for Telegram messages
export const MAX_MESSAGE_LENGTH = 1000
