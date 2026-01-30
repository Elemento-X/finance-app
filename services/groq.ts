// Groq API Service - Financial Assistant with Llama 3
import { logger } from '@/lib/logger'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.3-70b-versatile'

// =============================================================================
// Types
// =============================================================================

export type Locale = 'pt' | 'en'
export type IntentType = 'transaction' | 'query' | 'conversation'

export interface ParsedTransaction {
  type: 'income' | 'expense' | 'investment'
  amount: number
  category: string
  date: string
  description?: string
}

export interface ParsedQuery {
  queryType: 'balance' | 'summary' | 'category_spending' | 'recent'
  period?: 'today' | 'week' | 'month' | 'year'
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
// System Prompts (Multilingual)
// =============================================================================

const SYSTEM_PROMPTS: Record<Locale, string> = {
  pt: `Você é o ControleC, um assistente financeiro pessoal amigável e inteligente no Telegram.

Você pode:
1. REGISTRAR TRANSAÇÕES quando o usuário informar gastos, receitas ou investimentos
2. CONSULTAR DADOS quando o usuário perguntar sobre suas finanças
3. CONVERSAR quando o usuário quiser bater papo ou tiver dúvidas

## COMO RESPONDER

Analise a mensagem e responda com JSON no formato:

### Para TRANSAÇÕES (gastos, receitas, investimentos):
{"intent":"transaction","transaction":{"type":"expense","amount":50,"category":"Alimentação","date":"2026-01-28","description":"almoço"}}

Tipos: "expense" (gastei, paguei, comprei), "income" (recebi, ganhei, salário), "investment" (investi, aportei)

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

## REGRAS IMPORTANTES

- Seja simpático e use emojis moderadamente
- Para transações, extraia o valor como número (sem R$ ou vírgulas)
- Se não especificar data, use a data de hoje
- IMPORTANTE: Para categorias, use EXATAMENTE uma das categorias fornecidas pelo usuário se disponíveis
- Se a mensagem for ambígua, pergunte para clarificar
- Responda APENAS com JSON válido, sem markdown ou texto extra
`,

  en: `You are ControleC, a friendly and intelligent personal finance assistant on Telegram.

You can:
1. RECORD TRANSACTIONS when the user reports expenses, income or investments
2. QUERY DATA when the user asks about their finances
3. CHAT when the user wants to talk or has questions

## HOW TO RESPOND

Analyze the message and respond with JSON in the format:

### For TRANSACTIONS (expenses, income, investments):
{"intent":"transaction","transaction":{"type":"expense","amount":50,"category":"Food","date":"2026-01-28","description":"lunch"}}

Types: "expense" (spent, paid, bought), "income" (received, earned, salary), "investment" (invested)

### For QUERIES (questions about finances):
{"intent":"query","query":{"queryType":"summary","period":"month"}}

queryType: "balance", "summary", "category_spending", "recent" (recent transactions)
period: "today", "week", "month", "year"

### For CONVERSATIONS (greetings, questions, other):
{"intent":"conversation","message":"Your response here"}

## EXAMPLES

"spent 50 on groceries" → {"intent":"transaction","transaction":{"type":"expense","amount":50,"category":"Groceries","date":"2026-01-28"}}
"how much did I spend this month?" → {"intent":"query","query":{"queryType":"summary","period":"month"}}
"hi" → {"intent":"conversation","message":"Hi! 👋 I'm ControleC, your financial assistant. Tell me your expenses and income and I'll record them for you! For example: 'spent 50 on groceries' or 'received 3000 salary'. I can also show you summaries: 'how much did I spend this month?'"}
"thanks" → {"intent":"conversation","message":"You're welcome! 😊 I'm here to help. Just tell me any expense or income!"}
"help" → {"intent":"conversation","message":"Sure! I can help you with:\\n\\n💸 Record expenses: 'spent 50 on groceries'\\n💰 Record income: 'received 3000 salary'\\n📊 View summary: 'how much did I spend this month?'\\n📋 Recent transactions: 'my recent transactions'\\n\\nJust type away!"}

## IMPORTANT RULES

- Be friendly and use emojis moderately
- For transactions, extract the value as a number (without $ or commas)
- If no date is specified, use today's date
- IMPORTANT: For categories, use EXACTLY one of the user's provided categories if available
- If the message is ambiguous, ask for clarification
- Respond ONLY with valid JSON, no markdown or extra text
`,
}

// =============================================================================
// Category Matching (Local)
// =============================================================================

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  // Portuguese keywords
  Alimentação: ['comida', 'almoço', 'jantar', 'café', 'lanche', 'restaurante'],
  Mercado: ['mercado', 'supermercado', 'feira', 'compras', 'hortifruti'],
  Transporte: [
    'uber',
    'táxi',
    'taxi',
    'gasolina',
    'combustível',
    'ônibus',
    'metrô',
    'estacionamento',
  ],
  Moradia: ['aluguel', 'condomínio', 'água', 'luz', 'energia', 'gás', 'iptu'],
  Saúde: [
    'farmácia',
    'remédio',
    'médico',
    'consulta',
    'plano de saúde',
    'dentista',
  ],
  Lazer: [
    'cinema',
    'teatro',
    'show',
    'bar',
    'festa',
    'viagem',
    'netflix',
    'spotify',
  ],
  Educação: ['curso', 'faculdade', 'escola', 'livro', 'material'],
  Salário: ['salário', 'salary', 'pagamento', 'holerite'],
  Freelance: ['freelance', 'freela', 'projeto', 'bico'],
  Investimentos: ['investimento', 'ação', 'fundo', 'tesouro', 'cdb', 'poupança'],
  // English keywords
  Food: ['food', 'lunch', 'dinner', 'breakfast', 'snack', 'restaurant'],
  Groceries: ['grocery', 'groceries', 'supermarket', 'market'],
  Transport: ['uber', 'taxi', 'gas', 'fuel', 'bus', 'subway', 'parking'],
  Housing: ['rent', 'utilities', 'water', 'electricity', 'gas bill'],
  Health: ['pharmacy', 'medicine', 'doctor', 'dentist', 'health insurance'],
  Entertainment: [
    'movie',
    'theater',
    'concert',
    'bar',
    'party',
    'trip',
    'netflix',
    'spotify',
  ],
  Education: ['course', 'college', 'school', 'book', 'tuition'],
  Salary: ['salary', 'paycheck', 'wage'],
}

/**
 * Try to match a category locally based on keywords in the message
 * Returns the matched category name or null if no match
 */
export function matchCategoryLocally(
  message: string,
  userCategories: string[],
): string | null {
  const lowerMessage = message.toLowerCase()

  // First, try to find exact match with user's categories
  for (const category of userCategories) {
    if (lowerMessage.includes(category.toLowerCase())) {
      return category
    }
  }

  // Then, try keyword matching against user's categories
  for (const category of userCategories) {
    const keywords = CATEGORY_KEYWORDS[category]
    if (keywords) {
      for (const keyword of keywords) {
        if (lowerMessage.includes(keyword.toLowerCase())) {
          return category
        }
      }
    }
  }

  // Finally, try keyword matching against default categories
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerMessage.includes(keyword.toLowerCase())) {
        // Check if user has a similar category
        const userMatch = userCategories.find(
          (uc) =>
            uc.toLowerCase() === category.toLowerCase() ||
            uc.toLowerCase().includes(category.toLowerCase()),
        )
        if (userMatch) return userMatch
      }
    }
  }

  return null
}

// =============================================================================
// Main Function
// =============================================================================

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0]
}

const ERROR_MESSAGES: Record<Locale, Record<string, string>> = {
  pt: {
    noApiKey: 'Serviço de IA não configurado',
    apiError: 'Erro ao processar mensagem',
    emptyResponse: 'Resposta vazia da IA',
    parseError: 'Desculpa, não entendi bem. Pode reformular? 🤔',
    missingFields:
      "Não consegui entender o valor ou a categoria. Tenta algo como: 'gastei 50 no mercado'",
    invalidAmount:
      "Não entendi o valor. Pode repetir com o número? Ex: 'gastei 50 reais'",
    connectionError: 'Erro de conexão. Tenta de novo? 🔄',
  },
  en: {
    noApiKey: 'AI service not configured',
    apiError: 'Error processing message',
    emptyResponse: 'Empty AI response',
    parseError: "Sorry, I didn't understand. Can you rephrase? 🤔",
    missingFields:
      "I couldn't understand the amount or category. Try something like: 'spent 50 on groceries'",
    invalidAmount:
      "I didn't understand the amount. Can you repeat with a number? Ex: 'spent 50 dollars'",
    connectionError: 'Connection error. Try again? 🔄',
  },
}

export interface ParseMessageOptions {
  userCategories?: string[]
  financialContext?: string
  locale?: Locale
}

export async function parseMessage(
  message: string,
  userCategories?: string[],
  financialContext?: string,
  locale: Locale = 'pt',
): Promise<ParseResult> {
  const apiKey = process.env.GROQ_API_KEY
  const errors = ERROR_MESSAGES[locale]

  if (!apiKey) {
    logger.telegram.error('Missing GROQ_API_KEY')
    return { success: false, error: errors.noApiKey }
  }

  const today = getTodayDate()
  const categories = userCategories ?? []

  // Try local category matching first for better performance
  const localCategory = matchCategoryLocally(message, categories)

  const dateLabel = locale === 'pt' ? 'Data de hoje' : "Today's date"
  const messageLabel = locale === 'pt' ? 'Mensagem do usuário' : 'User message'
  const categoriesLabel =
    locale === 'pt'
      ? 'Categorias do usuário (USE EXATAMENTE uma destas)'
      : "User's categories (USE EXACTLY one of these)"

  let userPrompt = `${dateLabel}: ${today}\n${messageLabel}: "${message}"`

  if (categories.length > 0) {
    userPrompt += `\n${categoriesLabel}: ${categories.join(', ')}`
  }

  if (localCategory) {
    const matchLabel =
      locale === 'pt'
        ? 'Categoria sugerida (priorize esta)'
        : 'Suggested category (prioritize this)'
    userPrompt += `\n${matchLabel}: ${localCategory}`
  }

  if (financialContext) {
    userPrompt += `\n\n${locale === 'pt' ? 'Contexto financeiro atual' : 'Current financial context'}:\n${financialContext}`
  }

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS[locale] },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.telegram.error('Groq API error:', response.status, errorText)
      return { success: false, error: errors.apiError }
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content?.trim()

    if (!content) {
      return { success: false, error: errors.emptyResponse }
    }

    // Parse JSON response
    let parsed: AssistantResponse
    try {
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim()
      parsed = JSON.parse(cleanContent)
    } catch {
      logger.telegram.error('Groq invalid JSON response:', content)
      return {
        success: true,
        response: {
          intent: 'conversation',
          message: errors.parseError,
        },
      }
    }

    // Validate and fix transaction data
    if (parsed.intent === 'transaction' && parsed.transaction) {
      const t = parsed.transaction

      // Validate required fields
      if (!t.type || !t.amount || !t.category) {
        return {
          success: true,
          response: {
            intent: 'conversation',
            message: errors.missingFields,
          },
        }
      }

      // Ensure amount is valid
      const amount = Number(t.amount)
      if (isNaN(amount) || amount <= 0) {
        return {
          success: true,
          response: {
            intent: 'conversation',
            message: errors.invalidAmount,
          },
        }
      }

      // Fix date if invalid
      if (!t.date || !/^\d{4}-\d{2}-\d{2}$/.test(t.date)) {
        t.date = today
      }

      // Use local category match if AI didn't use user's category
      if (localCategory && categories.length > 0) {
        const aiUsedUserCategory = categories.some(
          (c) => c.toLowerCase() === t.category.toLowerCase(),
        )
        if (!aiUsedUserCategory) {
          t.category = localCategory
        }
      }

      t.amount = amount
    }

    return { success: true, response: parsed }
  } catch (error) {
    logger.telegram.error('Groq request failed:', error)
    return { success: false, error: errors.connectionError }
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
  recentTransactions: {
    type: string
    amount: number
    category: string
    date: string
  }[]
}): string {
  const formatCurrency = (n: number) =>
    n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

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
      const emoji =
        t.type === 'income' ? '💰' : t.type === 'expense' ? '💸' : '📈'
      context += `\n${emoji} ${formatCurrency(t.amount)} - ${t.category} (${t.date})`
    })
  }

  return context
}

// =============================================================================
// Format Response Messages (Multilingual)
// =============================================================================

const QUERY_LABELS: Record<
  Locale,
  {
    balance: string
    income: string
    expenses: string
    investments: string
    balanceLabel: string
    summary: string
    topExpenses: string
    categorySpending: string
    noExpenses: string
    recentTransactions: string
    noTransactions: string
  }
> = {
  pt: {
    balance: '💰 Seu saldo do mês:',
    income: 'Receitas',
    expenses: 'Despesas',
    investments: 'Investimentos',
    balanceLabel: 'Saldo',
    summary: '📊 Resumo do mês:',
    topExpenses: '📋 Maiores gastos:',
    categorySpending: '📋 Gastos por categoria:',
    noExpenses: 'Você ainda não tem gastos registrados esse mês! 📝',
    recentTransactions: '📋 Últimas transações:',
    noTransactions:
      'Você ainda não tem transações registradas! Começa me contando um gasto ou receita 😊',
  },
  en: {
    balance: '💰 Your monthly balance:',
    income: 'Income',
    expenses: 'Expenses',
    investments: 'Investments',
    balanceLabel: 'Balance',
    summary: '📊 Monthly Summary:',
    topExpenses: '📋 Top expenses:',
    categorySpending: '📋 Spending by category:',
    noExpenses: "You don't have any expenses recorded this month yet! 📝",
    recentTransactions: '📋 Recent transactions:',
    noTransactions:
      "You don't have any transactions yet! Start by telling me an expense or income 😊",
  },
}

export function formatQueryResponse(
  queryType: string,
  data: {
    monthIncome: number
    monthExpenses: number
    monthInvestments: number
    balance: number
    topCategories: { category: string; total: number }[]
    recentTransactions: {
      type: string
      amount: number
      category: string
      date: string
    }[]
  },
  locale: Locale = 'pt',
  currency: string = 'BRL',
): string {
  const labels = QUERY_LABELS[locale]
  const localeCode = locale === 'pt' ? 'pt-BR' : 'en-US'

  const formatCurrency = (n: number) =>
    n.toLocaleString(localeCode, { style: 'currency', currency })

  switch (queryType) {
    case 'balance':
      return (
        `${labels.balance}\n\n` +
        `${labels.income}: ${formatCurrency(data.monthIncome)}\n` +
        `${labels.expenses}: ${formatCurrency(data.monthExpenses)}\n` +
        `${labels.investments}: ${formatCurrency(data.monthInvestments)}\n\n` +
        `📊 ${labels.balanceLabel}: ${formatCurrency(data.balance)}`
      )

    case 'summary': {
      let msg =
        `${labels.summary}\n\n` +
        `💰 ${labels.income}: ${formatCurrency(data.monthIncome)}\n` +
        `💸 ${labels.expenses}: ${formatCurrency(data.monthExpenses)}\n` +
        `📈 ${labels.investments}: ${formatCurrency(data.monthInvestments)}\n` +
        `➡️ ${labels.balanceLabel}: ${formatCurrency(data.balance)}`

      if (data.topCategories.length > 0) {
        msg += `\n\n${labels.topExpenses}`
        data.topCategories.slice(0, 5).forEach((c) => {
          msg += `\n• ${c.category}: ${formatCurrency(c.total)}`
        })
      }
      return msg
    }

    case 'category_spending': {
      if (data.topCategories.length === 0) {
        return labels.noExpenses
      }
      let msg = `${labels.categorySpending}\n`
      data.topCategories.forEach((c) => {
        msg += `\n• ${c.category}: ${formatCurrency(c.total)}`
      })
      return msg
    }

    case 'recent': {
      if (data.recentTransactions.length === 0) {
        return labels.noTransactions
      }
      let msg = `${labels.recentTransactions}\n`
      data.recentTransactions.slice(0, 10).forEach((t) => {
        const emoji =
          t.type === 'income' ? '💰' : t.type === 'expense' ? '💸' : '📈'
        const formattedDate = new Date(t.date + 'T12:00:00').toLocaleDateString(
          localeCode,
          {
            day: '2-digit',
            month: '2-digit',
          },
        )
        msg += `\n${emoji} ${formatCurrency(t.amount)} - ${t.category} (${formattedDate})`
      })
      return msg
    }

    default:
      return formatQueryResponse('summary', data, locale, currency)
  }
}
