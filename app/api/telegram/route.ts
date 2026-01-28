import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { parseFinancialMessage } from "@/services/groq"

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

async function sendTelegramMessage(chatId: number, text: string): Promise<void> {
  if (!telegramToken) {
    console.error("[Telegram] Missing TELEGRAM_BOT_TOKEN")
    return
  }

  await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  })
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
  const parseResult = await parseFinancialMessage(text, userCategories)

  if (!parseResult.success || !parseResult.transaction) {
    await sendTelegramMessage(chatId, parseResult.error ?? "Não entendi. Tente: gastei 50 no mercado")
    return NextResponse.json({ ok: true })
  }

  const { transaction } = parseResult

  // Generate unique ID
  const transactionId = `tg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

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
    await sendTelegramMessage(chatId, "Erro ao salvar. Tente novamente.")
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
  return NextResponse.json({ ok: true })
}
