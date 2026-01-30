import { logger } from '@/lib/logger'

type SupabaseClientLike = {
  from: (table: string) => {
    upsert: (values: Record<string, unknown>, options?: unknown) => Promise<{
      error: { code?: string; message?: string } | null
    }>
  }
}

type UsageMetric = 'transaction_created' | 'telegram_message'

const USAGE_TABLE = 'usage_events'

function getDayKey(date: Date = new Date()): string {
  return date.toISOString().split('T')[0]
}

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
