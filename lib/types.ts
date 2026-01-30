export type TransactionType = 'income' | 'expense' | 'investment'

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  category: string
  date: string
  description?: string
  isFuture?: boolean
  isUnexpected?: boolean
  createdAt?: number
}

export interface Category {
  id: string
  name: string
  type: 'mixed' | TransactionType
  icon?: string
}

export interface UserProfile {
  name: string
  currency: string
  defaultMonth: string
  language: 'en' | 'pt' // Added language field
  telegramChatId?: number | null
  telegramSummaryEnabled?: boolean // Opt-in for automatic summaries
}

export interface FilterPeriod {
  type: 'day' | 'week' | 'month' | 'year'
  date: Date
}

export interface Goal {
  id: string
  title: string
  targetAmount?: number // Valor alvo (opcional)
  currentAmount?: number // Valor atual (manual)
  deadline?: string // Data limite YYYY-MM-DD (opcional)
  completed: boolean
  createdAt: string
}

export type RecurringFrequency = 'weekly' | 'monthly' | 'yearly'

export interface BudgetAlert {
  id: string
  category: string
  monthlyLimit: number // Limite mensal em R$
  alertThreshold: number // % para alertar (ex: 80)
  isActive: boolean
  createdAt: string
}

export interface RecurringTransaction {
  id: string
  type: TransactionType
  amount: number
  category: string
  description?: string
  frequency: RecurringFrequency
  dayOfMonth?: number // 1-28 (para monthly)
  dayOfWeek?: number // 0-6 (para weekly, 0=domingo)
  monthOfYear?: number // 1-12 (para yearly)
  startDate: string // YYYY-MM-DD
  endDate?: string | null // null = indefinido
  lastGeneratedDate?: string
  isActive: boolean
  createdAt: string
}
