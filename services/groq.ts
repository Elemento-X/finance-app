// Groq API Service for parsing financial messages with Llama 3

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
const GROQ_MODEL = "llama-3.3-70b-versatile"

export interface ParsedTransaction {
  type: "income" | "expense" | "investment"
  amount: number
  category: string
  date: string // YYYY-MM-DD
  description?: string
  confidence: number // 0-1
}

export interface ParseResult {
  success: boolean
  transaction?: ParsedTransaction
  error?: string
}

const SYSTEM_PROMPT = `Você é um assistente financeiro que extrai informações de transações de mensagens em português brasileiro.

Analise a mensagem e extraia:
- type: "expense" (gastos, pagamentos, compras), "income" (recebimentos, salário, vendas), ou "investment" (investimentos, aportes)
- amount: valor numérico (apenas o número, sem R$ ou vírgulas)
- category: categoria mais apropriada (ex: Alimentação, Transporte, Salário, Moradia, Lazer, Saúde, Educação, Mercado, Investimentos, Outros)
- date: data no formato YYYY-MM-DD (use a data de hoje se não especificada)
- description: descrição breve (opcional)
- confidence: sua confiança na extração de 0 a 1

Palavras-chave para EXPENSE: gastei, paguei, comprei, custou, foi, deu, almocei, jantei, abasteci
Palavras-chave para INCOME: recebi, ganhei, entrou, me pagaram, vendi, salário
Palavras-chave para INVESTMENT: investi, apliquei, aportei, comprei ações/fii/crypto

Responda APENAS com JSON válido, sem markdown ou explicações:
{"type":"expense","amount":50,"category":"Alimentação","date":"2026-01-28","description":"almoço","confidence":0.95}

Se não conseguir extrair uma transação válida, responda:
{"error":"Não entendi. Tente algo como: gastei 50 no mercado"}
`

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0]
}

export async function parseFinancialMessage(
  message: string,
  userCategories?: string[]
): Promise<ParseResult> {
  const apiKey = process.env.GROQ_API_KEY

  if (!apiKey) {
    console.error("[Groq] Missing GROQ_API_KEY")
    return { success: false, error: "Serviço de IA não configurado" }
  }

  const today = getTodayDate()

  // Build user prompt with context
  let userPrompt = `Data de hoje: ${today}\nMensagem: "${message}"`

  if (userCategories && userCategories.length > 0) {
    userPrompt += `\nCategorias do usuário: ${userCategories.join(", ")}`
  }

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1, // Low temperature for consistent parsing
        max_tokens: 200,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[Groq] API error:", response.status, errorText)
      return { success: false, error: "Erro ao processar mensagem" }
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content?.trim()

    if (!content) {
      return { success: false, error: "Resposta vazia da IA" }
    }

    // Parse JSON response
    let parsed: Record<string, unknown>
    try {
      // Clean potential markdown code blocks
      const cleanContent = content.replace(/```json\n?|\n?```/g, "").trim()
      parsed = JSON.parse(cleanContent)
    } catch {
      console.error("[Groq] Invalid JSON response:", content)
      return { success: false, error: "Não entendi. Tente: gastei 50 no mercado" }
    }

    // Check for error response
    if (parsed.error) {
      return { success: false, error: parsed.error as string }
    }

    // Validate required fields
    if (
      !parsed.type ||
      !parsed.amount ||
      !parsed.category ||
      !["income", "expense", "investment"].includes(parsed.type as string)
    ) {
      return { success: false, error: "Não entendi. Tente: gastei 50 no mercado" }
    }

    // Ensure amount is a valid positive number
    const amount = Number(parsed.amount)
    if (isNaN(amount) || amount <= 0) {
      return { success: false, error: "Valor inválido. Informe um número positivo." }
    }

    // Ensure date is valid, default to today
    let date = parsed.date as string
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      date = today
    }

    const transaction: ParsedTransaction = {
      type: parsed.type as "income" | "expense" | "investment",
      amount,
      category: parsed.category as string,
      date,
      description: parsed.description as string | undefined,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.8,
    }

    return { success: true, transaction }
  } catch (error) {
    console.error("[Groq] Request failed:", error)
    return { success: false, error: "Erro de conexão com IA" }
  }
}
