import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

// =============================================================================
// Types
// =============================================================================

interface RecurringTransactionRow {
  id: string
  user_id: string
  type: string
  amount: number
  category: string
  description: string | null
  frequency: string
  day_of_month: number | null
  day_of_week: number | null
  month_of_year: number | null
  start_date: string
  end_date: string | null
  last_generated_date: string | null
  is_active: boolean
}

// =============================================================================
// Helpers
// =============================================================================

function getTodayDateString(): string {
  // Use UTC to ensure consistency across timezones
  const today = new Date()
  return today.toISOString().split("T")[0]
}

function shouldGenerateToday(recurring: RecurringTransactionRow, today: Date): boolean {
  const startDate = new Date(recurring.start_date)

  // Check if start_date is in the future
  if (startDate > today) {
    return false
  }

  // Check if end_date has passed
  if (recurring.end_date) {
    const endDate = new Date(recurring.end_date)
    if (endDate < today) {
      return false
    }
  }

  const todayStr = getTodayDateString()

  // Check if already generated today
  if (recurring.last_generated_date === todayStr) {
    return false
  }

  // Check frequency
  switch (recurring.frequency) {
    case "weekly":
      // Check if today is the correct day of week (0 = Sunday, 6 = Saturday)
      return recurring.day_of_week === today.getUTCDay()

    case "monthly":
      // Check if today is the correct day of month
      // Handle end of month edge cases (e.g., day 31 for Feb = last day)
      const dayOfMonth = recurring.day_of_month ?? 1
      const lastDayOfMonth = new Date(today.getUTCFullYear(), today.getUTCMonth() + 1, 0).getUTCDate()
      const targetDay = Math.min(dayOfMonth, lastDayOfMonth)
      return today.getUTCDate() === targetDay

    case "yearly":
      // Check if today is the correct month and day
      const monthOfYear = recurring.month_of_year ?? 1
      const dayOfMonthYearly = recurring.day_of_month ?? 1
      const lastDayOfMonthYearly = new Date(today.getUTCFullYear(), monthOfYear, 0).getUTCDate()
      const targetDayYearly = Math.min(dayOfMonthYearly, lastDayOfMonthYearly)
      return today.getUTCMonth() + 1 === monthOfYear && today.getUTCDate() === targetDayYearly

    default:
      return false
  }
}

function generateTransactionId(): string {
  return crypto.randomUUID()
}

// =============================================================================
// Main Handler
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      console.error("[Cron] CRON_SECRET not configured")
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 })
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error("[Cron] Invalid authorization")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()
    const today = new Date()
    const todayStr = getTodayDateString()

    console.log(`[Cron] Starting recurring transactions generation for ${todayStr}`)

    // Fetch all active recurring transactions
    const { data: recurringList, error: fetchError } = await supabase
      .from("recurring_transactions")
      .select("*")
      .eq("is_active", true)

    if (fetchError) {
      console.error("[Cron] Error fetching recurring transactions:", fetchError)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    if (!recurringList || recurringList.length === 0) {
      console.log("[Cron] No active recurring transactions found")
      return NextResponse.json({ generated: 0, skipped: 0 })
    }

    console.log(`[Cron] Found ${recurringList.length} active recurring transactions`)

    let generated = 0
    let skipped = 0
    let errors = 0

    for (const recurring of recurringList as RecurringTransactionRow[]) {
      if (!shouldGenerateToday(recurring, today)) {
        skipped++
        continue
      }

      // Generate transaction
      const transactionId = generateTransactionId()
      const transactionData = {
        id: transactionId,
        user_id: recurring.user_id,
        type: recurring.type,
        amount: recurring.amount,
        category: recurring.category,
        date: todayStr,
        description: recurring.description,
        is_future: false,
        is_unexpected: false,
        source: "recurring",
      }
      const { error: insertError } = await supabase
        .from("transactions")
        .insert(transactionData as never)

      if (insertError) {
        console.error(`[Cron] Error inserting transaction for recurring ${recurring.id}:`, insertError)
        errors++
        continue
      }

      // Update last_generated_date
      const { error: updateError } = await supabase
        .from("recurring_transactions")
        .update({ last_generated_date: todayStr } as never)
        .eq("id", recurring.id)

      if (updateError) {
        console.error(`[Cron] Error updating last_generated_date for ${recurring.id}:`, updateError)
        // Transaction was created, so count as generated even if update failed
      }

      console.log(`[Cron] Generated transaction for recurring ${recurring.id} (${recurring.category})`)
      generated++
    }

    console.log(`[Cron] Complete: ${generated} generated, ${skipped} skipped, ${errors} errors`)

    return NextResponse.json({
      generated,
      skipped,
      errors,
      date: todayStr,
    })
  } catch (error) {
    console.error("[Cron] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
