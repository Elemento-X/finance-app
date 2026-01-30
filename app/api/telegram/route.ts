import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { parseMessage, formatQueryResponse } from "@/services/groq"

const telegramToken = process.env.TELEGRAM_BOT_TOKEN
const telegramSecret = process.env.TELEGRAM_WEBHOOK_SECRET

type TelegramMessage = {
  message_id: number
  text?: string
  chat?: { id?: number }
}

type TelegramUpdate = {
  message?: TelegramMessage
  edited_message?: TelegramMessage
}

type TelegramLinkToken = {
  user_id: string
  expires_at: string
  used_at: string | null
}

type ProfileRow = {
  id: string
  telegram_chat_id: number | null
}

type CategoryRow = {
  name: string
}

type TransactionRow = {
  type: string
  amount: number
  category: string
  date: string
}

type BudgetAlertRow = {
  id: string
  user_id: string
  category: string
  monthly_limit: number
  alert_threshold: number
  is_active: boolean
}

async function sendTelegramMessage(chatId: number, text: string): Promise<boolean> {
  if (!telegramToken) {
    console.error("[Telegram] Missing TELEGRAM_BOT_TOKEN")
    return false
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    })

    if (!response.ok) {
      console.error("[Telegram] Failed to send message:", response.status)
      return false
    }
    return true
  } catch (error) {
    console.error("[Telegram] Error sending message:", error)
    return false
  }
}

export async function POST(req: Request) {
  if (!telegramSecret) {
    console.error("[Telegram] Missing TELEGRAM_WEBHOOK_SECRET")
    return new NextResponse("Server misconfigured", { status: 500 })
  }

  const secretHeader = req.headers.get("x-telegram-bot-api-secret-token")
  if (secretHeader !== telegramSecret) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  let update: TelegramUpdate | null = null
  try {
    update = (await req.json()) as TelegramUpdate
  } catch (error) {
    console.error("[Telegram] Invalid JSON", error)
    return NextResponse.json({ ok: true })
  }

  const message = update?.message ?? update?.edited_message
  const text = message?.text?.trim()
  const chatId = message?.chat?.id

  if (!text || !chatId) {
    return NextResponse.json({ ok: true })
  }

  if (text.startsWith("/start")) {
    const code = text.split(" ")[1]?.trim()
    if (!code) {
      await sendTelegramMessage(
        chatId,
        "Envie o link do app e clique em Start para conectar sua conta."
      )
      return NextResponse.json({ ok: true })
    }

    const supabase = getSupabaseAdmin()
    const nowIso = new Date().toISOString()

    const { data: tokenRow, error: tokenError } = await supabase
      .from("telegram_link_tokens")
      .select("user_id, expires_at, used_at")
      .eq("code", code)
      .maybeSingle<TelegramLinkToken>()

    if (tokenError || !tokenRow) {
      await sendTelegramMessage(chatId, "Código inválido. Gere um novo no app.")
      return NextResponse.json({ ok: true })
    }

    if (tokenRow.used_at) {
      await sendTelegramMessage(chatId, "Este código já foi usado. Gere um novo no app.")
      return NextResponse.json({ ok: true })
    }

    if (new Date(tokenRow.expires_at).getTime() < Date.now()) {
      await sendTelegramMessage(chatId, "Código expirado. Gere um novo no app.")
      return NextResponse.json({ ok: true })
    }

    const { data: profileRow, error: profileError } = await supabase
      .from("profiles")
      .select("telegram_chat_id")
      .eq("id", tokenRow.user_id)
      .maybeSingle<Pick<ProfileRow, "telegram_chat_id">>()

    if (profileError) {
      console.error("[Telegram] Failed to load profile:", profileError)
      await sendTelegramMessage(chatId, "Erro ao conectar. Tente novamente.")
      return NextResponse.json({ ok: true })
    }

    if (profileRow?.telegram_chat_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("telegram_link_tokens") as any)
        .update({ used_at: nowIso })
        .eq("code", code)

      await sendTelegramMessage(
        chatId,
        "Sua conta já está conectada. Desconecte no app para relinkar."
      )
      return NextResponse.json({ ok: true })
    }

    const { data: existingChat } = await supabase
      .from("profiles")
      .select("id")
      .eq("telegram_chat_id", chatId)
      .neq("id", tokenRow.user_id)
      .maybeSingle<Pick<ProfileRow, "id">>()

    if (existingChat) {
      await sendTelegramMessage(
        chatId,
        "Este Telegram já está vinculado a outro usuário."
      )
      return NextResponse.json({ ok: true })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase.from("profiles") as any)
      .update({ telegram_chat_id: chatId })
      .eq("id", tokenRow.user_id)
      .is("telegram_chat_id", null)

    if (updateError) {
      console.error("[Telegram] Failed to update profile:", updateError)
      await sendTelegramMessage(chatId, "Erro ao conectar. Tente novamente.")
      return NextResponse.json({ ok: true })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("telegram_link_tokens") as any)
      .update({ used_at: nowIso })
      .eq("code", code)

    await sendTelegramMessage(chatId, "Conta conectada com sucesso!")
    return NextResponse.json({ ok: true })
  }

  // Handle transaction messages
  const supabase = getSupabaseAdmin()

  // Find user by telegram_chat_id
  const { data: userProfile, error: userError } = await supabase
    .from("profiles")
    .select("id")
    .eq("telegram_chat_id", chatId)
    .maybeSingle<Pick<ProfileRow, "id">>()

  if (userError || !userProfile) {
    await sendTelegramMessage(
      chatId,
      "Conta não vinculada. Use o botão no app para conectar o Telegram."
    )
    return NextResponse.json({ ok: true })
  }

  const userId = userProfile.id

  // Get user's categories for better matching
  const { data: categoriesData } = await supabase
    .from("categories")
    .select("name")
    .eq("user_id", userId)

  const userCategories = (categoriesData as CategoryRow[] | null)?.map((c) => c.name) ?? []

  // Parse the message with Groq
  const parseResult = await parseMessage(text, userCategories)

  if (!parseResult.success || !parseResult.response) {
    await sendTelegramMessage(chatId, parseResult.error ?? "Erro ao processar. Tenta de novo? 🔄")
    return NextResponse.json({ ok: true })
  }

  const { response } = parseResult

  // Handle CONVERSATION intent
  if (response.intent === "conversation") {
    await sendTelegramMessage(chatId, response.message ?? "👋")
    return NextResponse.json({ ok: true })
  }

  // Handle QUERY intent
  if (response.intent === "query" && response.query) {
    const financialData = await getFinancialData(supabase, userId)
    const queryResponse = formatQueryResponse(response.query.queryType, financialData)
    await sendTelegramMessage(chatId, queryResponse)
    return NextResponse.json({ ok: true })
  }

  // Handle TRANSACTION intent
  if (response.intent === "transaction" && response.transaction) {
    const { transaction } = response

    // Generate unique ID
    const transactionId = `tg_${crypto.randomUUID()}`

    // Insert transaction into Supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (supabase.from("transactions") as any).insert({
      id: transactionId,
      user_id: userId,
      type: transaction.type,
      amount: transaction.amount,
      category: transaction.category,
      date: transaction.date,
      description: transaction.description ?? null,
      is_future: false,
      is_unexpected: false,
      source: "telegram",
    })

    if (insertError) {
      console.error("[Telegram] Failed to insert transaction:", insertError)
      await sendTelegramMessage(chatId, "Erro ao salvar. Tente novamente. 😕")
      return NextResponse.json({ ok: true })
    }

    // Format confirmation message
    const typeEmoji = transaction.type === "income" ? "💰" : transaction.type === "expense" ? "💸" : "📈"
    const typeLabel = transaction.type === "income" ? "Receita" : transaction.type === "expense" ? "Despesa" : "Investimento"
    const formattedAmount = transaction.amount.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
    const formattedDate = new Date(transaction.date + "T12:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    })

    const confirmation = `${typeEmoji} ${typeLabel} registrada!\n${formattedAmount} — ${transaction.category} — ${formattedDate}`

    await sendTelegramMessage(chatId, confirmation)

    // Check budget alerts for expense transactions
    if (transaction.type === "expense") {
      await checkBudgetAlert(supabase, userId, chatId, transaction.category)
    }

    return NextResponse.json({ ok: true })
  }

  // Fallback
  await sendTelegramMessage(chatId, "Não entendi. Tenta me contar um gasto ou receita? 🤔")
  return NextResponse.json({ ok: true })
}

// =============================================================================
// Helper: Get Financial Data for Queries
// =============================================================================

async function getFinancialData(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  userId: string
) {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]

  // Get all transactions for this month
  const { data: transactions } = await supabase
    .from("transactions")
    .select("type, amount, category, date")
    .eq("user_id", userId)
    .gte("date", startOfMonth)
    .lte("date", endOfMonth)
    .order("date", { ascending: false })

  const txns = (transactions as TransactionRow[] | null) ?? []

  // Calculate totals
  let monthIncome = 0
  let monthExpenses = 0
  let monthInvestments = 0
  const categoryTotals: Record<string, number> = {}

  for (const t of txns) {
    const amount = Number(t.amount)
    if (t.type === "income") {
      monthIncome += amount
    } else if (t.type === "expense") {
      monthExpenses += amount
      categoryTotals[t.category] = (categoryTotals[t.category] ?? 0) + amount
    } else if (t.type === "investment") {
      monthInvestments += amount
    }
  }

  const balance = monthIncome - monthExpenses - monthInvestments

  // Top categories by spending
  const topCategories = Object.entries(categoryTotals)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)

  // Recent transactions (last 10)
  const recentTransactions = txns.slice(0, 10).map((t) => ({
    type: t.type,
    amount: Number(t.amount),
    category: t.category,
    date: t.date,
  }))

  return {
    monthIncome,
    monthExpenses,
    monthInvestments,
    balance,
    topCategories,
    recentTransactions,
  }
}

// =============================================================================
// Helper: Check Budget Alerts
// =============================================================================

async function checkBudgetAlert(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  chatId: number,
  category: string
) {
  // Get budget alert for this category
  const { data: alertData } = await supabase
    .from("budget_alerts")
    .select("*")
    .eq("user_id", userId)
    .eq("category", category)
    .eq("is_active", true)
    .maybeSingle()

  if (!alertData) return

  const alert = alertData as BudgetAlertRow

  // Calculate total spent this month in this category
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]

  const { data: transactionsData } = await supabase
    .from("transactions")
    .select("amount")
    .eq("user_id", userId)
    .eq("category", category)
    .eq("type", "expense")
    .gte("date", startOfMonth)
    .lte("date", endOfMonth)

  const transactions = transactionsData as { amount: number }[] | null
  if (!transactions || transactions.length === 0) return

  const totalSpent = transactions.reduce((sum, t) => sum + Number(t.amount), 0)
  const percentUsed = (totalSpent / alert.monthly_limit) * 100

  // Check if we should send an alert
  if (percentUsed >= 100) {
    const formattedLimit = alert.monthly_limit.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
    const formattedSpent = totalSpent.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
    await sendTelegramMessage(
      chatId,
      `⚠️ Orçamento excedido!\n\n${category}: ${formattedSpent} de ${formattedLimit} (${percentUsed.toFixed(0)}%)`
    )
  } else if (percentUsed >= alert.alert_threshold) {
    const formattedLimit = alert.monthly_limit.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
    const formattedSpent = totalSpent.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
    await sendTelegramMessage(
      chatId,
      `📊 Alerta de orçamento!\n\n${category}: ${formattedSpent} de ${formattedLimit} (${percentUsed.toFixed(0)}%)`
    )
  }
}
