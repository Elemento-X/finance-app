import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

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
      .maybeSingle()

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
      .maybeSingle()

    if (profileError) {
      console.error("[Telegram] Failed to load profile:", profileError)
      await sendTelegramMessage(chatId, "Erro ao conectar. Tente novamente.")
      return NextResponse.json({ ok: true })
    }

    if (profileRow?.telegram_chat_id) {
      await supabase
        .from("telegram_link_tokens")
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
      .maybeSingle()

    if (existingChat) {
      await sendTelegramMessage(
        chatId,
        "Este Telegram já está vinculado a outro usuário."
      )
      return NextResponse.json({ ok: true })
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ telegram_chat_id: chatId })
      .eq("id", tokenRow.user_id)
      .is("telegram_chat_id", null)

    if (updateError) {
      console.error("[Telegram] Failed to update profile:", updateError)
      await sendTelegramMessage(chatId, "Erro ao conectar. Tente novamente.")
      return NextResponse.json({ ok: true })
    }

    await supabase
      .from("telegram_link_tokens")
      .update({ used_at: nowIso })
      .eq("code", code)

    await sendTelegramMessage(chatId, "Conta conectada com sucesso!")
    return NextResponse.json({ ok: true })
  }

  await sendTelegramMessage(
    chatId,
    "Use o botão do app para conectar o Telegram e começar a registrar transações."
  )

  return NextResponse.json({ ok: true })
}
