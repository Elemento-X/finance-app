import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { logger } from '@/lib/logger'

// =============================================================================
// Types
// =============================================================================

interface ProfileRow {
  id: string
  telegram_chat_id: number
  language: string | null
  currency: string | null
  name: string | null
}

interface TransactionRow {
  type: string
  amount: number
  category: string
  date: string
}

interface SummaryData {
  income: number
  expenses: number
  investments: number
  balance: number
  topCategories: Array<{ category: string; total: number }>
  transactionCount: number
}

// =============================================================================
// Telegram Helper
// =============================================================================

const telegramToken = process.env.TELEGRAM_BOT_TOKEN

async function sendTelegramMessage(
  chatId: number,
  text: string,
): Promise<boolean> {
  if (!telegramToken) {
    logger.cron.error('Missing TELEGRAM_BOT_TOKEN')
    return false
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${telegramToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
        }),
      },
    )

    if (!response.ok) {
      const errorData = await response.json()
      logger.cron.error(`Failed to send message to chat ${chatId}:`, errorData)
      return false
    }

    return true
  } catch (error) {
    logger.cron.error(`Error sending message to chat ${chatId}:`, error)
    return false
  }
}

// =============================================================================
// Summary Generation
// =============================================================================

function formatCurrency(
  amount: number,
  currency: string,
  locale: string,
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount)
}

function generateWeeklySummary(
  data: SummaryData,
  prevWeekData: SummaryData,
  locale: string,
  currency: string,
  userName: string | null,
): string {
  const isPt = locale === 'pt-BR'
  const greeting = userName
    ? isPt
      ? `Olá, ${userName}!`
      : `Hello, ${userName}!`
    : isPt
      ? 'Olá!'
      : 'Hello!'

  const title = isPt ? '📊 <b>Resumo Semanal</b>' : '📊 <b>Weekly Summary</b>'

  const incomeLabel = isPt ? 'Receitas' : 'Income'
  const expensesLabel = isPt ? 'Despesas' : 'Expenses'
  const investmentsLabel = isPt ? 'Investimentos' : 'Investments'
  const balanceLabel = isPt ? 'Saldo' : 'Balance'
  const topCategoriesLabel = isPt ? 'Top Categorias' : 'Top Categories'
  const comparisonLabel = isPt ? 'vs semana anterior' : 'vs last week'
  const noTransactionsLabel = isPt
    ? 'Nenhuma transação esta semana'
    : 'No transactions this week'

  if (data.transactionCount === 0) {
    return `${greeting}\n\n${title}\n\n${noTransactionsLabel}`
  }

  const incomeFormatted = formatCurrency(data.income, currency, locale)
  const expensesFormatted = formatCurrency(data.expenses, currency, locale)
  const investmentsFormatted = formatCurrency(
    data.investments,
    currency,
    locale,
  )
  const balanceFormatted = formatCurrency(data.balance, currency, locale)

  // Calculate comparison with previous week
  const expensesDiff =
    prevWeekData.expenses > 0
      ? (
          ((data.expenses - prevWeekData.expenses) / prevWeekData.expenses) *
          100
        ).toFixed(0)
      : null
  const expensesTrend = expensesDiff
    ? Number(expensesDiff) > 0
      ? `↑${expensesDiff}%`
      : Number(expensesDiff) < 0
        ? `↓${Math.abs(Number(expensesDiff))}%`
        : '→'
    : ''

  let message = `${greeting}\n\n${title}\n\n`
  message += `💰 ${incomeLabel}: ${incomeFormatted}\n`
  message += `💸 ${expensesLabel}: ${expensesFormatted} ${expensesTrend ? `(${expensesTrend} ${comparisonLabel})` : ''}\n`

  if (data.investments > 0) {
    message += `📈 ${investmentsLabel}: ${investmentsFormatted}\n`
  }

  const balanceEmoji = data.balance >= 0 ? '✅' : '⚠️'
  message += `\n${balanceEmoji} ${balanceLabel}: ${balanceFormatted}`

  // Top categories (max 3)
  if (data.topCategories.length > 0) {
    message += `\n\n📂 ${topCategoriesLabel}:`
    data.topCategories.slice(0, 3).forEach((cat, i) => {
      const emoji = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'
      message += `\n${emoji} ${cat.category}: ${formatCurrency(cat.total, currency, locale)}`
    })
  }

  return message
}

function generateMonthlySummary(
  data: SummaryData,
  prevMonthData: SummaryData,
  locale: string,
  currency: string,
  userName: string | null,
  monthName: string,
): string {
  const isPt = locale === 'pt-BR'
  const greeting = userName
    ? isPt
      ? `Olá, ${userName}!`
      : `Hello, ${userName}!`
    : isPt
      ? 'Olá!'
      : 'Hello!'

  const title = isPt
    ? `📊 <b>Resumo de ${monthName}</b>`
    : `📊 <b>${monthName} Summary</b>`

  const incomeLabel = isPt ? 'Receitas' : 'Income'
  const expensesLabel = isPt ? 'Despesas' : 'Expenses'
  const investmentsLabel = isPt ? 'Investimentos' : 'Investments'
  const balanceLabel = isPt ? 'Saldo' : 'Balance'
  const topCategoriesLabel = isPt
    ? 'Top Categorias de Despesas'
    : 'Top Expense Categories'
  const comparisonLabel = isPt ? 'vs mês anterior' : 'vs previous month'
  const noTransactionsLabel = isPt
    ? 'Nenhuma transação no mês'
    : 'No transactions this month'

  if (data.transactionCount === 0) {
    return `${greeting}\n\n${title}\n\n${noTransactionsLabel}`
  }

  const incomeFormatted = formatCurrency(data.income, currency, locale)
  const expensesFormatted = formatCurrency(data.expenses, currency, locale)
  const investmentsFormatted = formatCurrency(
    data.investments,
    currency,
    locale,
  )
  const balanceFormatted = formatCurrency(data.balance, currency, locale)

  // Calculate comparison with previous month
  const expensesDiff =
    prevMonthData.expenses > 0
      ? (
          ((data.expenses - prevMonthData.expenses) / prevMonthData.expenses) *
          100
        ).toFixed(0)
      : null
  const expensesTrend = expensesDiff
    ? Number(expensesDiff) > 0
      ? `↑${expensesDiff}%`
      : Number(expensesDiff) < 0
        ? `↓${Math.abs(Number(expensesDiff))}%`
        : '→'
    : ''

  const incomeDiff =
    prevMonthData.income > 0
      ? (
          ((data.income - prevMonthData.income) / prevMonthData.income) *
          100
        ).toFixed(0)
      : null
  const incomeTrend = incomeDiff
    ? Number(incomeDiff) > 0
      ? `↑${incomeDiff}%`
      : Number(incomeDiff) < 0
        ? `↓${Math.abs(Number(incomeDiff))}%`
        : '→'
    : ''

  let message = `${greeting}\n\n${title}\n\n`
  message += `💰 ${incomeLabel}: ${incomeFormatted} ${incomeTrend ? `(${incomeTrend} ${comparisonLabel})` : ''}\n`
  message += `💸 ${expensesLabel}: ${expensesFormatted} ${expensesTrend ? `(${expensesTrend} ${comparisonLabel})` : ''}\n`

  if (data.investments > 0) {
    message += `📈 ${investmentsLabel}: ${investmentsFormatted}\n`
  }

  const balanceEmoji = data.balance >= 0 ? '✅' : '⚠️'
  message += `\n${balanceEmoji} ${balanceLabel}: ${balanceFormatted}`

  // Top categories (max 5 for monthly)
  if (data.topCategories.length > 0) {
    message += `\n\n📂 ${topCategoriesLabel}:`
    data.topCategories.slice(0, 5).forEach((cat, i) => {
      const emoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '•'
      message += `\n${emoji} ${cat.category}: ${formatCurrency(cat.total, currency, locale)}`
    })
  }

  return message
}

// =============================================================================
// Data Fetching
// =============================================================================

async function getSummaryData(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  startDate: string,
  endDate: string,
): Promise<SummaryData> {
  const { data: transactions } = await supabase
    .from('transactions')
    .select('type, amount, category, date')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)

  const txns = (transactions as TransactionRow[] | null) ?? []

  let income = 0
  let expenses = 0
  let investments = 0
  const categoryTotals: Record<string, number> = {}

  for (const t of txns) {
    const amount = Number(t.amount)
    if (t.type === 'income') {
      income += amount
    } else if (t.type === 'expense') {
      expenses += amount
      categoryTotals[t.category] = (categoryTotals[t.category] ?? 0) + amount
    } else if (t.type === 'investment') {
      investments += amount
    }
  }

  const balance = income - expenses - investments

  const topCategories = Object.entries(categoryTotals)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)

  return {
    income,
    expenses,
    investments,
    balance,
    topCategories,
    transactionCount: txns.length,
  }
}

// =============================================================================
// Date Helpers
// =============================================================================

function getWeekRange(date: Date): { start: string; end: string } {
  const dayOfWeek = date.getUTCDay()
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Monday = 0

  const startOfWeek = new Date(date)
  startOfWeek.setUTCDate(date.getUTCDate() - diff - 7) // Previous week Monday

  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setUTCDate(startOfWeek.getUTCDate() + 6) // Previous week Sunday

  return {
    start: startOfWeek.toISOString().split('T')[0],
    end: endOfWeek.toISOString().split('T')[0],
  }
}

function getPreviousWeekRange(date: Date): { start: string; end: string } {
  const dayOfWeek = date.getUTCDay()
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1

  const startOfWeek = new Date(date)
  startOfWeek.setUTCDate(date.getUTCDate() - diff - 14) // Two weeks ago Monday

  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setUTCDate(startOfWeek.getUTCDate() + 6)

  return {
    start: startOfWeek.toISOString().split('T')[0],
    end: endOfWeek.toISOString().split('T')[0],
  }
}

function getMonthRange(
  year: number,
  month: number,
): { start: string; end: string } {
  const start = new Date(Date.UTC(year, month, 1))
  const end = new Date(Date.UTC(year, month + 1, 0))

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}

function getMonthName(month: number, locale: string): string {
  const date = new Date(2000, month, 1)
  return date.toLocaleDateString(locale, { month: 'long' })
}

// =============================================================================
// Main Handler
// =============================================================================

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
      logger.cron.warn('Invalid authorization attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Determine summary type from query param
    const summaryType = request.nextUrl.searchParams.get('type') || 'weekly'

    const supabase = getSupabaseAdmin()
    const now = new Date()

    logger.cron.info(`Starting ${summaryType} summary generation`)

    // Fetch all users with telegram enabled and summary opted-in
    const { data: profiles, error: fetchError } = await supabase
      .from('profiles')
      .select('id, telegram_chat_id, language, currency, name')
      .not('telegram_chat_id', 'is', null)
      .eq('telegram_summary_enabled', true)

    if (fetchError) {
      logger.cron.error('Error fetching profiles:', fetchError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!profiles || profiles.length === 0) {
      logger.cron.info('No users with telegram summaries enabled')
      return NextResponse.json({ sent: 0, skipped: 0 })
    }

    logger.cron.info(`Found ${profiles.length} users with summaries enabled`)

    let sent = 0
    let failed = 0

    for (const profile of profiles as ProfileRow[]) {
      const locale = profile.language === 'pt' ? 'pt-BR' : 'en-US'
      const currency = profile.currency || 'BRL'

      let message: string

      if (summaryType === 'monthly') {
        // Monthly summary: first day of month, summarize previous month
        const prevMonth = now.getUTCMonth() === 0 ? 11 : now.getUTCMonth() - 1
        const prevMonthYear =
          now.getUTCMonth() === 0
            ? now.getUTCFullYear() - 1
            : now.getUTCFullYear()

        const currentRange = getMonthRange(prevMonthYear, prevMonth)
        const prevRange = getMonthRange(
          prevMonth === 0 ? prevMonthYear - 1 : prevMonthYear,
          prevMonth === 0 ? 11 : prevMonth - 1,
        )

        const currentData = await getSummaryData(
          supabase,
          profile.id,
          currentRange.start,
          currentRange.end,
        )
        const prevData = await getSummaryData(
          supabase,
          profile.id,
          prevRange.start,
          prevRange.end,
        )

        const monthName = getMonthName(prevMonth, locale)
        message = generateMonthlySummary(
          currentData,
          prevData,
          locale,
          currency,
          profile.name,
          monthName,
        )
      } else {
        // Weekly summary: every Monday, summarize previous week
        const currentWeekRange = getWeekRange(now)
        const prevWeekRange = getPreviousWeekRange(now)

        const currentData = await getSummaryData(
          supabase,
          profile.id,
          currentWeekRange.start,
          currentWeekRange.end,
        )
        const prevData = await getSummaryData(
          supabase,
          profile.id,
          prevWeekRange.start,
          prevWeekRange.end,
        )

        message = generateWeeklySummary(
          currentData,
          prevData,
          locale,
          currency,
          profile.name,
        )
      }

      const success = await sendTelegramMessage(
        profile.telegram_chat_id,
        message,
      )

      if (success) {
        sent++
        logger.cron.info(`Sent ${summaryType} summary to user ${profile.id}`)
      } else {
        failed++
        logger.cron.error(`Failed to send to user ${profile.id}`)
      }
    }

    logger.cron.info(`Complete: ${sent} sent, ${failed} failed`)

    return NextResponse.json({
      type: summaryType,
      sent,
      failed,
      total: profiles.length,
      timestamp: now.toISOString(),
    })
  } catch (error) {
    logger.cron.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
