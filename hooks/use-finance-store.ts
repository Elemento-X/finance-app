import { create } from "zustand"
import type { Transaction, Category, UserProfile, FilterPeriod, Goal } from "@/lib/types"
import { storageService } from "@/services/storage"
import { calculationsService } from "@/services/calculations"
import { runMigrations } from "@/services/migrations"

interface FinanceStore {
  transactions: Transaction[]
  categories: Category[]
  profile: UserProfile
  filterPeriod: FilterPeriod
  goals: Goal[] // Added goals state
  isHydrated: boolean // Indicates if data has been loaded from localStorage

  // Actions
  loadData: () => void

  // Transactions
  addTransaction: (transaction: Transaction) => void
  updateTransaction: (id: string, transaction: Transaction) => void
  deleteTransaction: (id: string) => void

  // Categories
  addCategory: (category: Category) => void
  updateCategory: (id: string, category: Category) => void
  deleteCategory: (id: string) => void

  // Profile
  updateProfile: (profile: UserProfile) => void

  // Filter
  setFilterPeriod: (period: FilterPeriod) => void

  addGoal: (goal: Goal) => void
  updateGoal: (id: string, goal: Goal) => void
  deleteGoal: (id: string) => void
  toggleGoal: (id: string) => void

  // Computed
  getFilteredTransactions: () => Transaction[]
  getBalance: () => number
  getTotalIncome: () => number
  getTotalExpense: () => number
  getTotalInvestment: () => number // Added getTotalInvestment method
  getExpensesByCategory: () => Record<string, number>
  getMonthlyEvolution: () => Array<{ month: string; income: number; expense: number; investment: number; balance: number }>
}

export const useFinanceStore = create<FinanceStore>((set, get) => ({
  transactions: [],
  categories: [],
  profile: { name: "", currency: "BRL", defaultMonth: new Date().toISOString().slice(0, 7), language: "en" },
  filterPeriod: { type: "month", date: new Date() },
  goals: [], // Initialize goals
  isHydrated: false, // Initially false until data is loaded

  loadData: () => {
    // Run migrations before loading data
    runMigrations()

    set({
      transactions: storageService.getTransactions(),
      categories: storageService.getCategories(),
      profile: storageService.getProfile(),
      goals: storageService.getGoals(),
      isHydrated: true, // Mark as hydrated after loading
    })
  },

  addTransaction: (transaction) => {
    storageService.addTransaction(transaction)
    set({ transactions: storageService.getTransactions() })
  },

  updateTransaction: (id, transaction) => {
    storageService.updateTransaction(id, transaction)
    set({ transactions: storageService.getTransactions() })
  },

  deleteTransaction: (id) => {
    storageService.deleteTransaction(id)
    set({ transactions: storageService.getTransactions() })
  },

  addCategory: (category) => {
    storageService.addCategory(category)
    set({ categories: storageService.getCategories() })
  },

  updateCategory: (id, category) => {
    storageService.updateCategory(id, category)
    set({ categories: storageService.getCategories() })
  },

  deleteCategory: (id) => {
    storageService.deleteCategory(id)
    set({ categories: storageService.getCategories() })
  },

  updateProfile: (profile) => {
    storageService.saveProfile(profile)
    set({ profile })
  },

  setFilterPeriod: (period) => {
    set({ filterPeriod: period })
  },

  addGoal: (goal) => {
    storageService.addGoal(goal)
    set({ goals: storageService.getGoals() })
  },

  updateGoal: (id, goal) => {
    storageService.updateGoal(id, goal)
    set({ goals: storageService.getGoals() })
  },

  deleteGoal: (id) => {
    storageService.deleteGoal(id)
    set({ goals: storageService.getGoals() })
  },

  toggleGoal: (id) => {
    const goals = storageService.getGoals()
    const goal = goals.find((g) => g.id === id)
    if (goal) {
      storageService.updateGoal(id, { ...goal, completed: !goal.completed })
      set({ goals: storageService.getGoals() })
    }
  },

  getFilteredTransactions: () => {
    const { transactions, filterPeriod } = get()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Filter out future transactions (those marked as future and with date > today)
    const currentTransactions = transactions.filter((t) => {
      if (t.isFuture) {
        const transactionDate = new Date(t.date)
        transactionDate.setHours(0, 0, 0, 0)
        return transactionDate <= today
      }
      return true
    })

    return calculationsService.filterTransactionsByPeriod(currentTransactions, filterPeriod.type, filterPeriod.date)
  },

  getBalance: () => {
    const filtered = get().getFilteredTransactions()
    return calculationsService.calculateBalance(filtered)
  },

  getTotalIncome: () => {
    const filtered = get().getFilteredTransactions()
    return calculationsService.calculateTotalByType(filtered, "income")
  },

  getTotalExpense: () => {
    const filtered = get().getFilteredTransactions()
    return calculationsService.calculateTotalByType(filtered, "expense")
  },

  getTotalInvestment: () => {
    const filtered = get().getFilteredTransactions()
    return calculationsService.calculateTotalByType(filtered, "investment")
  },

  getExpensesByCategory: () => {
    const filtered = get().getFilteredTransactions()
    return calculationsService.getExpensesByCategory(filtered)
  },

  getMonthlyEvolution: () => {
    const { transactions } = get()
    return calculationsService.getMonthlyEvolution(transactions, 6)
  },
}))
