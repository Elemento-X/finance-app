import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { logger } from '@/lib/logger'
import { cleanupRateLimitEntries } from '@/lib/security'
import { USAGE_EVENTS_RETENTION_DAYS } from '@/lib/constants'

/**
 * Cron job to cleanup old usage_events and rate_limit_entries
 * Schedule: Monthly (1st day of each month at 04:00 UTC)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      logger.cron.error('CRON_SECRET not configured')
      return NextResponse.json(
        { error: 'Server misconfigured' },
        { status: 500 },
      )
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      logger.cron.warn('Invalid authorization attempt for cleanup-usage')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()

    // Calculate cutoff date (90 days ago)
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - USAGE_EVENTS_RETENTION_DAYS)
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0]

    logger.cron.info(
      `Starting cleanup: deleting usage_events older than ${cutoffDateStr}`,
    )

    // Delete old usage_events
    const { error: usageError } = await supabase
      .from('usage_events')
      .delete()
      .lt('day', cutoffDateStr)

    if (usageError) {
      logger.cron.error('Error deleting old usage_events:', usageError)
      return NextResponse.json(
        { error: 'Failed to cleanup usage_events' },
        { status: 500 },
      )
    }

    // Cleanup expired rate limit entries
    await cleanupRateLimitEntries(supabase)

    logger.cron.info(
      `Cleanup complete: deleted usage_events older than ${USAGE_EVENTS_RETENTION_DAYS} days`,
    )

    return NextResponse.json({
      success: true,
      retentionDays: USAGE_EVENTS_RETENTION_DAYS,
      cutoffDate: cutoffDateStr,
    })
  } catch (error) {
    logger.cron.error('Unexpected error in cleanup-usage:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
