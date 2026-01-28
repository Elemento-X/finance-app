export type TransactionType = "income" | "expense" | "investment"

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
  type: "mixed" | TransactionType
  icon?: string
}

export interface UserProfile {
  name: string
  currency: string
  defaultMonth: string
  language: "en" | "pt" // Added language field
}

export interface FilterPeriod {
  type: "day" | "week" | "month" | "year"
  date: Date
}

export interface Goal {
  id: string
  title: string
  completed: boolean
  createdAt: string
}
