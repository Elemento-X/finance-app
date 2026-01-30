// Groq API Service - Financial Assistant with Llama 3
import { logger } from "@/lib/logger"

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
const GROQ_MODEL = "llama-3.3-70b-versatile"

// =============================================================================
// Types
// =============================================================================

export type IntentType = "transaction" | "query" | "conversation"

export interface ParsedTransaction {
  type: "income" | "expense" | "investment"
  amount: number
  category: string
  date: string
  description?: string
}

export interface ParsedQuery {
  queryType: "balance" | "summary" | "category_spending" | "recent"
  period?: "today" | "week" | "month" | "year"
  category?: string
}

export interface AssistantResponse {
  intent: IntentType
  transaction?: ParsedTransaction
  query?: ParsedQuery
  message?: string // For conversation responses
}

export interface ParseResult {
  success: boolean
  response?: AssistantResponse
  error?: string
}

// =============================================================================
// System Prompt
// =============================================================================

const SYSTEM_PROMPT = `Você é o ControleC, um assistente financeiro pessoal amigável e inteligente no Telegram.

Você pode:
1. REGISTRAR TRANSAÇÕES quando o usuário informar gastos, receitas ou investimentos
2. CONSULTAR DADOS quando o usuário perguntar sobre suas finanças
3. CONVERSAR quando o usuário quiser bater papo ou tiver dúvidas

## COMO RESPONDER

Analise a mensagem e responda com JSON no formato:

### Para TRANSAÇÕES (gastos, receitas, investimentos):
{"intent":"transaction","transaction":{"type":"expense","amount":50,"category":"Alimentação","date":"2026-01-28","description":"almoço"}}

Tipos: "expense" (gastei, paguei, comprei), "income" (recebi, ganhei, salário), "investment" (investi, aportei)
Categorias comuns: Alimentação, Transporte, Moradia, Lazer, Saúde, Educação, Mercado, Salário, Freelance, Investimentos

### Para CONSULTAS (perguntas sobre finanças):
{"intent":"query","query":{"queryType":"summary","period":"month"}}

queryType: "balance" (saldo), "summary" (resumo), "category_spending" (gastos por categoria), "recent" (últimas transações)
period: "today", "week", "month", "year"

### Para CONVERSAS (saudações, dúvidas, outros):
{"intent":"conversation","message":"Sua resposta aqui"}

## EXEMPLOS

"gastei 50 no mercado" → {"intent":"transaction","transaction":{"type":"expense","amount":50,"category":"Mercado","date":"2026-01-28"}}
"quanto gastei esse mês?" → {"intent":"query","query":{"queryType":"summary","period":"month"}}
"oi" → {"intent":"conversation","message":"Oi! 👋 Sou o ControleC, seu assistente financeiro. Pode me dizer seus gastos e receitas que eu registro pra você! Por exemplo: 'gastei 50 no mercado' ou 'recebi 3000 de salário'. Também posso te mostrar resumos: 'quanto gastei esse mês?'"}
"obrigado" → {"intent":"conversation","message":"Por nada! 😊 Estou aqui pra ajudar. Qualquer gasto ou receita, é só me contar!"}
"me ajuda" → {"intent":"conversation","message":"Claro! Posso te ajudar a:\\n\\n💸 Registrar gastos: 'gastei 50 no mercado'\\n💰 Registrar receitas: 'recebi 3000 salário'\\n📊 Ver resumo: 'quanto gastei esse mês?'\\n📋 Últimas transações: 'minhas últimas transações'\\n\\nÉ só digitar!"}

## REGRAS

- Seja simpático e use emojis moderadamente
- Para transações, extraia o valor como número (sem R$ ou vírgulas)
- Se não especificar data, use a data de hoje
- Se a mensagem for ambígua, pergunte para clarificar
- Responda APENAS com JSON válido, sem markdown ou texto extra
`

// =============================================================================
// Main Function
// =============================================================================

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0]
}

export async function parseMessage(
  message: string,
  userCategories?: string[],
  financialContext?: string
): Promise<ParseResult> {
  const apiKey = process.env.GROQ_API_KEY

  if (!apiKey) {
    logger.telegram.error("Missing GROQ_API_KEY")
    return { success: false, error: "Serviço de IA não configurado" }
  }

  const today = getTodayDate()

  let userPrompt = `Data de hoje: ${today}\nMensagem do usuário: "${message}"`

  if (userCategories && userCategories.length > 0) {
    userPrompt += `\nCategorias personalizadas do usuário: ${userCategories.join(", ")}`
  }

  if (financialContext) {
    userPrompt += `\n\nContexto financeiro atual do usuário:\n${financialContext}`
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
        temperature: 0.3,
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.telegram.error("Groq API error:", response.status, errorText)
      return { success: false, error: "Erro ao processar mensagem" }
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content?.trim()

    if (!content) {
      return { success: false, error: "Resposta vazia da IA" }
    }

    // Parse JSON response
    let parsed: AssistantResponse
    try {
      const cleanContent = content.replace(/```json\n?|\n?```/g, "").trim()
      parsed = JSON.parse(cleanContent)
    } catch {
      logger.telegram.error("Groq invalid JSON response:", content)
      // If JSON parsing fails, treat as conversation
      return {
        success: true,
        response: {
          intent: "conversation",
          message: "Desculpa, não entendi bem. Pode reformular? 🤔",
        },
      }
    }

    // Validate and fix transaction data
    if (parsed.intent === "transaction" && parsed.transaction) {
      const t = parsed.transaction

      // Validate required fields
      if (!t.type || !t.amount || !t.category) {
        return {
          success: true,
          response: {
            intent: "conversation",
            message: "Não consegui entender o valor ou a categoria. Tenta algo como: 'gastei 50 no mercado'",
          },
        }
      }

      // Ensure amount is valid
      const amount = Number(t.amount)
      if (isNaN(amount) || amount <= 0) {
        return {
          success: true,
          response: {
            intent: "conversation",
            message: "Não entendi o valor. Pode repetir com o número? Ex: 'gastei 50 reais'",
          },
        }
      }

      // Fix date if invalid
      if (!t.date || !/^\d{4}-\d{2}-\d{2}$/.test(t.date)) {
        t.date = today
      }

      t.amount = amount
    }

    return { success: true, response: parsed }
  } catch (error) {
    logger.telegram.error("Groq request failed:", error)
    return { success: false, error: "Erro de conexão. Tenta de novo? 🔄" }
  }
}

// =============================================================================
// Format Financial Summary for Context
// =============================================================================

export function formatFinancialContext(data: {
  monthIncome: number
  monthExpenses: number
  monthInvestments: number
  balance: number
  topCategories: { category: string; total: number }[]
  recentTransactions: { type: string; amount: number; category: string; date: string }[]
}): string {
  const formatCurrency = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

  let context = `Resumo do mês atual:
- Receitas: ${formatCurrency(data.monthIncome)}
- Despesas: ${formatCurrency(data.monthExpenses)}
- Investimentos: ${formatCurrency(data.monthInvestments)}
- Saldo: ${formatCurrency(data.balance)}`

  if (data.topCategories.length > 0) {
    context += `\n\nMaiores gastos por categoria:`
    data.topCategories.slice(0, 5).forEach((c) => {
      context += `\n- ${c.category}: ${formatCurrency(c.total)}`
    })
  }

  if (data.recentTransactions.length > 0) {
    context += `\n\nÚltimas transações:`
    data.recentTransactions.slice(0, 5).forEach((t) => {
      const emoji = t.type === "income" ? "💰" : t.type === "expense" ? "💸" : "📈"
      context += `\n${emoji} ${formatCurrency(t.amount)} - ${t.category} (${t.date})`
    })
  }

  return context
}

// =============================================================================
// Format Response Messages
// =============================================================================

export function formatQueryResponse(
  queryType: string,
  data: {
    monthIncome: number
    monthExpenses: number
    monthInvestments: number
    balance: number
    topCategories: { category: string; total: number }[]
    recentTransactions: { type: string; amount: number; category: string; date: string }[]
  }
): string {
  const formatCurrency = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

  switch (queryType) {
    case "balance":
      return `💰 Seu saldo do mês:\n\n` +
        `Receitas: ${formatCurrency(data.monthIncome)}\n` +
        `Despesas: ${formatCurrency(data.monthExpenses)}\n` +
        `Investimentos: ${formatCurrency(data.monthInvestments)}\n\n` +
        `📊 Saldo: ${formatCurrency(data.balance)}`

    case "summary": {
      let msg = `📊 Resumo do mês:\n\n` +
        `💰 Receitas: ${formatCurrency(data.monthIncome)}\n` +
        `💸 Despesas: ${formatCurrency(data.monthExpenses)}\n` +
        `📈 Investimentos: ${formatCurrency(data.monthInvestments)}\n` +
        `➡️ Saldo: ${formatCurrency(data.balance)}`

      if (data.topCategories.length > 0) {
        msg += `\n\n📋 Maiores gastos:`
        data.topCategories.slice(0, 5).forEach((c) => {
          msg += `\n• ${c.category}: ${formatCurrency(c.total)}`
        })
      }
      return msg
    }

    case "category_spending": {
      if (data.topCategories.length === 0) {
        return "Você ainda não tem gastos registrados esse mês! 📝"
      }
      let msg = `📋 Gastos por categoria:\n`
      data.topCategories.forEach((c) => {
        msg += `\n• ${c.category}: ${formatCurrency(c.total)}`
      })
      return msg
    }

    case "recent": {
      if (data.recentTransactions.length === 0) {
        return "Você ainda não tem transações registradas! Começa me contando um gasto ou receita 😊"
      }
      let msg = `📋 Últimas transações:\n`
      data.recentTransactions.slice(0, 10).forEach((t) => {
        const emoji = t.type === "income" ? "💰" : t.type === "expense" ? "💸" : "📈"
        const formattedDate = new Date(t.date + "T12:00:00").toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
        })
        msg += `\n${emoji} ${formatCurrency(t.amount)} - ${t.category} (${formattedDate})`
      })
      return msg
    }

    default:
      return formatQueryResponse("summary", data)
  }
}
