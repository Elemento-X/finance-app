import { logger } from '@/lib/logger'
import { supabase } from '@/lib/supabase'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClientLike = any

export type UsageMetric = 'transaction_created' | 'telegram_message' | 'api_call'

const USAGE_TABLE = 'usage_events'

function getDayKey(date: Date = new Date()): string {
  return date.toISOString().split('T')[0]
}

/**
 * Record a usage event (server-side, requires Supabase client)
 */
export async function recordUsageEvent(
  client: SupabaseClientLike,
  payload: {
    id: string
    userId: string
    metric: UsageMetric
    source?: string
    occurredAt?: Date
  },
): Promise<void> {
  const day = getDayKey(payload.occurredAt ?? new Date())

  const { error } = await client.from(USAGE_TABLE).upsert(
    {
      id: payload.id,
      user_id: payload.userId,
      metric: payload.metric,
      day,
      source: payload.source ?? null,
    },
    { onConflict: 'id' },
  )

  if (error) {
    logger.supabase.warn('Usage metric insert failed:', {
      code: error.code,
      message: error.message,
      metric: payload.metric,
      userId: payload.userId,
      id: payload.id,
    })
  }
}

/**
 * Record an API call metric (client-side, uses browser Supabase client)
 * Only records if user is authenticated
 */
export async function recordApiCall(source: string): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const day = getDayKey()
    const id = `api_${day}_${source}_${crypto.randomUUID().slice(0, 8)}`

    const { error } = await supabase.from(USAGE_TABLE).upsert(
      {
        id,
        user_id: user.id,
        metric: 'api_call',
        day,
        source,
      },
      { onConflict: 'id' },
    )

    if (error) {
      logger.supabase.warn('API call metric insert failed:', {
        code: error.code,
        message: error.message,
        source,
      })
    }
  } catch {
    // Silently fail - metrics should not break the app
  }
}
