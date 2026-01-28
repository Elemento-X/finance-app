import { create } from "zustand"
import type { Transaction, Category, UserProfile, FilterPeriod, Goal } from "@/lib/types"
import { storageService } from "@/services/storage"
import { calculationsService } from "@/services/calculations"
import { runMigrations } from "@/services/migrations"
import { syncService } from "@/services/sync"

interface FinanceStore {
  transactions: Transaction[]
  categories: Category[]
  profile: UserProfile
  filterPeriod: FilterPeriod
  goals: Goal[]
  isHydrated: boolean
  isSyncing: boolean

  // Actions
  loadData: () => Promise<void>

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
  goals: [],
  isHydrated: false,
  isSyncing: false,

  loadData: async () => {
    // Run migrations before loading data
    runMigrations()

    // Start sync service
    syncService.startSync()

    // Load from localStorage first (instant)
    set({
      transactions: storageService.getTransactions(),
      categories: storageService.getCategories(),
      profile: storageService.getProfile(),
      goals: storageService.getGoals(),
      isHydrated: true,
    })

    // Then sync with Supabase in background
    set({ isSyncing: true })
    try {
      await syncService.syncOnLoad()
      // Reload from localStorage after sync (may have new data from Supabase)
      set({
        transactions: storageService.getTransactions(),
        categories: storageService.getCategories(),
        profile: storageService.getProfile(),
        goals: storageService.getGoals(),
      })
    } finally {
      set({ isSyncing: false })
    }
  },

  addTransaction: (transaction) => {
    storageService.addTransaction(transaction)
    syncService.queueTransaction('create', transaction)
    set({ transactions: storageService.getTransactions() })
  },

  updateTransaction: (id, transaction) => {
    storageService.updateTransaction(id, transaction)
    syncService.queueTransaction('update', transaction)
    set({ transactions: storageService.getTransactions() })
  },

  deleteTransaction: (id) => {
    const transactions = storageService.getTransactions()
    const transaction = transactions.find(t => t.id === id)
    storageService.deleteTransaction(id)
    if (transaction) {
      syncService.queueTransaction('delete', transaction)
    }
    set({ transactions: storageService.getTransactions() })
  },

  addCategory: (category) => {
    storageService.addCategory(category)
    syncService.queueCategory('create', category)
    set({ categories: storageService.getCategories() })
  },

  updateCategory: (id, category) => {
    storageService.updateCategory(id, category)
    syncService.queueCategory('update', category)
    set({ categories: storageService.getCategories() })
  },

  deleteCategory: (id) => {
    const categories = storageService.getCategories()
    const category = categories.find(c => c.id === id)
    storageService.deleteCategory(id)
    if (category) {
      syncService.queueCategory('delete', category)
    }
    set({ categories: storageService.getCategories() })
  },

  updateProfile: (profile) => {
    storageService.saveProfile(profile)
    syncService.queueProfile(profile)
    set({ profile })
  },

  setFilterPeriod: (period) => {
    set({ filterPeriod: period })
  },

  addGoal: (goal) => {
    storageService.addGoal(goal)
    syncService.queueGoal('create', goal)
    set({ goals: storageService.getGoals() })
  },

  updateGoal: (id, goal) => {
    storageService.updateGoal(id, goal)
    syncService.queueGoal('update', goal)
    set({ goals: storageService.getGoals() })
  },

  deleteGoal: (id) => {
    const goals = storageService.getGoals()
    const goal = goals.find(g => g.id === id)
    storageService.deleteGoal(id)
    if (goal) {
      syncService.queueGoal('delete', goal)
    }
    set({ goals: storageService.getGoals() })
  },

  toggleGoal: (id) => {
    const goals = storageService.getGoals()
    const goal = goals.find((g) => g.id === id)
    if (goal) {
      const updatedGoal = { ...goal, completed: !goal.completed }
      storageService.updateGoal(id, updatedGoal)
      syncService.queueGoal('update', updatedGoal)
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
