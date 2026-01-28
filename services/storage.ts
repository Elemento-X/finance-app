import type { Transaction, Category, UserProfile, Goal } from "@/lib/types"
import { DEFAULT_CATEGORIES } from "@/lib/constants"
import { safeGetItem, safeSetItem } from "./migrations"
import {
  TransactionSchema,
  CategorySchema,
  UserProfileSchema,
  GoalSchema,
  validateArray,
  validateObject,
} from "@/lib/schemas"
import { getTranslation } from "@/lib/i18n"
import { toast } from "sonner"

const STORAGE_KEYS = {
  TRANSACTIONS: "finance_transactions",
  CATEGORIES: "finance_categories",
  PROFILE: "finance_profile",
  GOALS: "finance_goals",
} as const

// Track if we've already shown validation warnings in this session
const validationWarningsShown: Record<string, boolean> = {}

function showValidationWarning(type: string, invalidCount: number): void {
  const key = `validation_${type}`
  if (validationWarningsShown[key]) return
  validationWarningsShown[key] = true

  const typeTranslation = getTranslation(`validation.${type}` as keyof typeof import("@/lib/i18n").translations.en)

  toast.warning(getTranslation("validation.corruptedData"), {
    description: getTranslation("validation.corruptedDataDesc", {
      count: invalidCount.toString(),
      type: typeTranslation,
    }),
    duration: 6000,
  })
}

export const storageService = {
  getTransactions(): Transaction[] {
    const raw = safeGetItem<unknown[]>(STORAGE_KEYS.TRANSACTIONS, [])
    if (!Array.isArray(raw)) return []

    const { valid, invalidCount } = validateArray(raw, TransactionSchema)

    if (invalidCount > 0) {
      showValidationWarning("transactions", invalidCount)
      // Save only valid transactions back to storage
      this.saveTransactions(valid as Transaction[])
    }

    return valid as Transaction[]
  },

  saveTransactions(transactions: Transaction[]): void {
    safeSetItem(STORAGE_KEYS.TRANSACTIONS, transactions)
  },

  addTransaction(transaction: Transaction): void {
    const transactions = this.getTransactions()
    transactions.push(transaction)
    this.saveTransactions(transactions)
  },

  updateTransaction(id: string, updatedTransaction: Transaction): void {
    const transactions = this.getTransactions()
    const index = transactions.findIndex((t) => t.id === id)
    if (index !== -1) {
      transactions[index] = updatedTransaction
      this.saveTransactions(transactions)
    }
  },

  deleteTransaction(id: string): void {
    const transactions = this.getTransactions()
    const filtered = transactions.filter((t) => t.id !== id)
    this.saveTransactions(filtered)
  },

  getCategories(): Category[] {
    const raw = safeGetItem<unknown[]>(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES)
    if (!Array.isArray(raw)) return DEFAULT_CATEGORIES

    const { valid, invalidCount } = validateArray(raw, CategorySchema)

    if (invalidCount > 0) {
      showValidationWarning("categories", invalidCount)
      this.saveCategories(valid as Category[])
    }

    // Return defaults if all categories were invalid
    return valid.length > 0 ? (valid as Category[]) : DEFAULT_CATEGORIES
  },

  saveCategories(categories: Category[]): void {
    safeSetItem(STORAGE_KEYS.CATEGORIES, categories)
  },

  addCategory(category: Category): void {
    const categories = this.getCategories()
    categories.push(category)
    this.saveCategories(categories)
  },

  updateCategory(id: string, updatedCategory: Category): void {
    const categories = this.getCategories()
    const index = categories.findIndex((c) => c.id === id)
    if (index !== -1) {
      categories[index] = updatedCategory
      this.saveCategories(categories)
    }
  },

  deleteCategory(id: string): void {
    const categories = this.getCategories()
    const filtered = categories.filter((c) => c.id !== id)
    this.saveCategories(filtered)
  },

  getProfile(): UserProfile {
    const defaultProfile: UserProfile = {
      name: "",
      currency: "BRL",
      defaultMonth: new Date().toISOString().slice(0, 7),
      language: "en",
      telegramChatId: null,
    }

    const raw = safeGetItem<unknown>(STORAGE_KEYS.PROFILE, defaultProfile)
    const { value, isValid } = validateObject(raw, UserProfileSchema, defaultProfile)

    if (!isValid && raw !== null && raw !== undefined) {
      // Only show warning if there was actual data that was invalid
      const key = "validation_profile"
      if (!validationWarningsShown[key]) {
        validationWarningsShown[key] = true
        toast.warning(getTranslation("validation.corruptedData"), {
          description: getTranslation("validation.profileReset"),
          duration: 6000,
        })
      }
      this.saveProfile(defaultProfile)
      return defaultProfile
    }

    return value as UserProfile
  },

  saveProfile(profile: UserProfile): void {
    safeSetItem(STORAGE_KEYS.PROFILE, profile)
  },

  getGoals(): Goal[] {
    const raw = safeGetItem<unknown[]>(STORAGE_KEYS.GOALS, [])
    if (!Array.isArray(raw)) return []

    const { valid, invalidCount } = validateArray(raw, GoalSchema)

    if (invalidCount > 0) {
      showValidationWarning("goals", invalidCount)
      this.saveGoals(valid as Goal[])
    }

    return valid as Goal[]
  },

  saveGoals(goals: Goal[]): void {
    safeSetItem(STORAGE_KEYS.GOALS, goals)
  },

  addGoal(goal: Goal): void {
    const goals = this.getGoals()
    goals.push(goal)
    this.saveGoals(goals)
  },

  updateGoal(id: string, updatedGoal: Goal): void {
    const goals = this.getGoals()
    const index = goals.findIndex((g) => g.id === id)
    if (index !== -1) {
      goals[index] = updatedGoal
      this.saveGoals(goals)
    }
  },

  deleteGoal(id: string): void {
    const goals = this.getGoals()
    const filtered = goals.filter((g) => g.id !== id)
    this.saveGoals(filtered)
  },
}
