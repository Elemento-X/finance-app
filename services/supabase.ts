// Supabase CRUD Service - Mirrors storage.ts interface for cloud persistence
import { supabase } from "@/lib/supabase"
import type { Transaction, Category, UserProfile, Goal, RecurringTransaction, BudgetAlert } from "@/lib/types"
import type { Asset } from "@/lib/investment-types"

// =============================================================================
// Type Converters (camelCase ↔ snake_case)
// =============================================================================

// Transaction
interface TransactionRow {
  id: string
  user_id: string
  type: string
  amount: number
  category: string
  date: string
  description: string | null
  is_future: boolean
  is_unexpected: boolean
  source: string
  created_at: string
}

function transactionToRow(t: Transaction, userId: string): Omit<TransactionRow, 'created_at'> {
  return {
    id: t.id,
    user_id: userId,
    type: t.type,
    amount: t.amount,
    category: t.category,
    date: t.date,
    description: t.description ?? null,
    is_future: t.isFuture ?? false,
    is_unexpected: t.isUnexpected ?? false,
    source: 'web',
  }
}

function rowToTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    type: row.type as Transaction['type'],
    amount: row.amount,
    category: row.category,
    date: row.date,
    description: row.description ?? undefined,
    isFuture: row.is_future,
    isUnexpected: row.is_unexpected,
    createdAt: new Date(row.created_at).getTime(),
  }
}

// Category
interface CategoryRow {
  id: string
  user_id: string
  name: string
  type: string
  icon: string | null
}

function categoryToRow(c: Category, userId: string): CategoryRow {
  return {
    id: c.id,
    user_id: userId,
    name: c.name,
    type: c.type,
    icon: c.icon ?? null,
  }
}

function rowToCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    type: row.type as Category['type'],
    icon: row.icon ?? undefined,
  }
}

// Profile
interface ProfileRow {
  id: string
  name: string | null
  currency: string
  language: string
  default_month: string | null
  telegram_chat_id: number | null
  telegram_summary_enabled: boolean | null
}

function profileToRow(p: UserProfile, userId: string): Omit<ProfileRow, 'telegram_chat_id' | 'telegram_summary_enabled'> & { telegram_summary_enabled?: boolean } {
  return {
    id: userId,
    name: p.name || null,
    currency: p.currency,
    language: p.language,
    default_month: p.defaultMonth || null,
    telegram_summary_enabled: p.telegramSummaryEnabled ?? false,
  }
}

function rowToProfile(row: ProfileRow): UserProfile {
  return {
    name: row.name ?? '',
    currency: row.currency || 'BRL',
    defaultMonth: row.default_month ?? new Date().toISOString().slice(0, 7),
    language: (row.language as 'en' | 'pt') || 'pt',
    telegramChatId: row.telegram_chat_id ?? null,
    telegramSummaryEnabled: row.telegram_summary_enabled ?? false,
  }
}

// Goal
interface GoalRow {
  id: string
  user_id: string
  title: string
  target_amount: number | null
  current_amount: number | null
  deadline: string | null
  completed: boolean
  created_at: string
}

function goalToRow(g: Goal, userId: string): Omit<GoalRow, 'created_at'> {
  return {
    id: g.id,
    user_id: userId,
    title: g.title,
    target_amount: g.targetAmount ?? null,
    current_amount: g.currentAmount ?? null,
    deadline: g.deadline ?? null,
    completed: g.completed,
  }
}

function rowToGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    title: row.title,
    targetAmount: row.target_amount ?? undefined,
    currentAmount: row.current_amount ?? undefined,
    deadline: row.deadline ?? undefined,
    completed: row.completed,
    createdAt: row.created_at,
  }
}

// Asset
interface AssetRow {
  id: string
  user_id: string
  symbol: string
  name: string
  asset_class: string
  quantity: number
  average_price: number
  total_invested: number
  purchase_date: string
  created_at: string
}

function assetToRow(a: Asset, userId: string): Omit<AssetRow, 'created_at'> {
  return {
    id: a.id,
    user_id: userId,
    symbol: a.symbol,
    name: a.name,
    asset_class: a.assetClass,
    quantity: a.quantity,
    average_price: a.averagePrice,
    total_invested: a.totalInvested,
    purchase_date: a.purchaseDate,
  }
}

function rowToAsset(row: AssetRow): Asset {
  return {
    id: row.id,
    symbol: row.symbol,
    name: row.name,
    assetClass: row.asset_class as Asset['assetClass'],
    quantity: row.quantity,
    averagePrice: row.average_price,
    totalInvested: row.total_invested,
    purchaseDate: row.purchase_date,
    createdAt: new Date(row.created_at).getTime(),
  }
}

// RecurringTransaction
interface RecurringTransactionRow {
  id: string
  user_id: string
  type: string
  amount: number
  category: string
  description: string | null
  frequency: string
  day_of_month: number | null
  day_of_week: number | null
  month_of_year: number | null
  start_date: string
  end_date: string | null
  last_generated_date: string | null
  is_active: boolean
  created_at: string
}

function recurringTransactionToRow(r: RecurringTransaction, userId: string): Omit<RecurringTransactionRow, 'created_at'> {
  return {
    id: r.id,
    user_id: userId,
    type: r.type,
    amount: r.amount,
    category: r.category,
    description: r.description ?? null,
    frequency: r.frequency,
    day_of_month: r.dayOfMonth ?? null,
    day_of_week: r.dayOfWeek ?? null,
    month_of_year: r.monthOfYear ?? null,
    start_date: r.startDate,
    end_date: r.endDate ?? null,
    last_generated_date: r.lastGeneratedDate ?? null,
    is_active: r.isActive,
  }
}

function rowToRecurringTransaction(row: RecurringTransactionRow): RecurringTransaction {
  return {
    id: row.id,
    type: row.type as RecurringTransaction['type'],
    amount: row.amount,
    category: row.category,
    description: row.description ?? undefined,
    frequency: row.frequency as RecurringTransaction['frequency'],
    dayOfMonth: row.day_of_month ?? undefined,
    dayOfWeek: row.day_of_week ?? undefined,
    monthOfYear: row.month_of_year ?? undefined,
    startDate: row.start_date,
    endDate: row.end_date ?? undefined,
    lastGeneratedDate: row.last_generated_date ?? undefined,
    isActive: row.is_active,
    createdAt: row.created_at,
  }
}

// BudgetAlert
interface BudgetAlertRow {
  id: string
  user_id: string
  category: string
  monthly_limit: number
  alert_threshold: number
  is_active: boolean
  created_at: string
}

function budgetAlertToRow(b: BudgetAlert, userId: string): Omit<BudgetAlertRow, 'created_at'> {
  return {
    id: b.id,
    user_id: userId,
    category: b.category,
    monthly_limit: b.monthlyLimit,
    alert_threshold: b.alertThreshold,
    is_active: b.isActive,
  }
}

function rowToBudgetAlert(row: BudgetAlertRow): BudgetAlert {
  return {
    id: row.id,
    category: row.category,
    monthlyLimit: row.monthly_limit,
    alertThreshold: row.alert_threshold,
    isActive: row.is_active,
    createdAt: row.created_at,
  }
}

// =============================================================================
// Helper: Get current user ID
// =============================================================================

async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

// =============================================================================
// Transactions CRUD
// =============================================================================

export const supabaseService = {
  // ---------------------------------------------------------------------------
  // Transactions
  // ---------------------------------------------------------------------------
  async getTransactions(): Promise<Transaction[]> {
    const userId = await getCurrentUserId()
    if (!userId) return []

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })

    if (error) {
      console.error('Error fetching transactions:', error)
      return []
    }

    return (data as TransactionRow[]).map(rowToTransaction)
  },

  async addTransaction(transaction: Transaction): Promise<boolean> {
    const userId = await getCurrentUserId()
    if (!userId) {
      console.warn('[Supabase] No user ID, skipping transaction sync')
      return false
    }

    const row = transactionToRow(transaction, userId)

    // Use upsert to handle potential duplicate key conflicts gracefully
    const { error } = await supabase
      .from('transactions')
      .upsert(row, { onConflict: 'id' })

    if (error) {
      // Only log as error if it's not a known recoverable issue
      if (error.code === '42501') {
        // RLS policy violation - likely auth issue
        console.warn('[Supabase] Transaction sync failed (auth):', error.message)
      } else {
        console.error('[Supabase] Error adding transaction:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          transaction: { id: transaction.id, type: transaction.type, category: transaction.category },
        })
      }
      return false
    }

    return true
  },

  async updateTransaction(id: string, transaction: Transaction): Promise<boolean> {
    const userId = await getCurrentUserId()
    if (!userId) return false

    const row = transactionToRow(transaction, userId)
    const { error } = await supabase
      .from('transactions')
      .update(row)
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.error('Error updating transaction:', error)
      return false
    }

    return true
  },

  async deleteTransaction(id: string): Promise<boolean> {
    const userId = await getCurrentUserId()
    if (!userId) return false

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting transaction:', error)
      return false
    }

    return true
  },

  // ---------------------------------------------------------------------------
  // Categories
  // ---------------------------------------------------------------------------
  async getCategories(): Promise<Category[]> {
    const userId = await getCurrentUserId()
    if (!userId) return []

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching categories:', error)
      return []
    }

    return (data as CategoryRow[]).map(rowToCategory)
  },

  async addCategory(category: Category): Promise<boolean> {
    const userId = await getCurrentUserId()
    if (!userId) return false

    const { error } = await supabase
      .from('categories')
      .insert(categoryToRow(category, userId))

    if (error) {
      console.error('Error adding category:', error)
      return false
    }

    return true
  },

  async updateCategory(id: string, category: Category): Promise<boolean> {
    const userId = await getCurrentUserId()
    if (!userId) return false

    const row = categoryToRow(category, userId)
    const { error } = await supabase
      .from('categories')
      .update(row)
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.error('Error updating category:', error)
      return false
    }

    return true
  },

  async deleteCategory(id: string): Promise<boolean> {
    const userId = await getCurrentUserId()
    if (!userId) return false

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting category:', error)
      return false
    }

    return true
  },

  // ---------------------------------------------------------------------------
  // Profile
  // ---------------------------------------------------------------------------
  async getProfile(): Promise<UserProfile | null> {
    const userId = await getCurrentUserId()
    if (!userId) return null

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching profile:', error)
      return null
    }

    return rowToProfile(data as ProfileRow)
  },

  async saveProfile(profile: UserProfile): Promise<boolean> {
    const userId = await getCurrentUserId()
    if (!userId) return false

    const row = profileToRow(profile, userId)
    const { error } = await supabase
      .from('profiles')
      .upsert(row, { onConflict: 'id' })

    if (error) {
      console.error('Error saving profile:', error)
      return false
    }

    return true
  },

  async updateTelegramChatId(chatId: number | null): Promise<boolean> {
    const userId = await getCurrentUserId()
    if (!userId) return false

    const { error } = await supabase
      .from('profiles')
      .update({ telegram_chat_id: chatId })
      .eq('id', userId)

    if (error) {
      console.error('Error updating telegram chat id:', error)
      return false
    }

    return true
  },

  async updateTelegramSummaryEnabled(enabled: boolean): Promise<boolean> {
    const userId = await getCurrentUserId()
    if (!userId) return false

    const { error } = await supabase
      .from('profiles')
      .update({ telegram_summary_enabled: enabled })
      .eq('id', userId)

    if (error) {
      console.error('Error updating telegram summary enabled:', error)
      return false
    }

    return true
  },

  // ---------------------------------------------------------------------------
  // Goals
  // ---------------------------------------------------------------------------
  async getGoals(): Promise<Goal[]> {
    const userId = await getCurrentUserId()
    if (!userId) return []

    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching goals:', error)
      return []
    }

    return (data as GoalRow[]).map(rowToGoal)
  },

  async addGoal(goal: Goal): Promise<boolean> {
    const userId = await getCurrentUserId()
    if (!userId) return false

    const { error } = await supabase
      .from('goals')
      .insert(goalToRow(goal, userId))

    if (error) {
      console.error('Error adding goal:', error)
      return false
    }

    return true
  },

  async updateGoal(id: string, goal: Goal): Promise<boolean> {
    const userId = await getCurrentUserId()
    if (!userId) return false

    const row = goalToRow(goal, userId)
    const { error } = await supabase
      .from('goals')
      .update(row)
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.error('Error updating goal:', error)
      return false
    }

    return true
  },

  async deleteGoal(id: string): Promise<boolean> {
    const userId = await getCurrentUserId()
    if (!userId) return false

    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting goal:', error)
      return false
    }

    return true
  },

  // ---------------------------------------------------------------------------
  // Assets (Investments)
  // ---------------------------------------------------------------------------
  async getAssets(): Promise<Asset[]> {
    const userId = await getCurrentUserId()
    if (!userId) return []

    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching assets:', error)
      return []
    }

    return (data as AssetRow[]).map(rowToAsset)
  },

  async addAsset(asset: Asset): Promise<boolean> {
    const userId = await getCurrentUserId()
    if (!userId) return false

    const { error } = await supabase
      .from('assets')
      .insert(assetToRow(asset, userId))

    if (error) {
      console.error('Error adding asset:', error)
      return false
    }

    return true
  },

  async updateAsset(id: string, updates: Partial<Asset>): Promise<boolean> {
    const userId = await getCurrentUserId()
    if (!userId) return false

    // Convert partial updates to snake_case
    const updateRow: Record<string, unknown> = {}
    if (updates.symbol !== undefined) updateRow.symbol = updates.symbol
    if (updates.name !== undefined) updateRow.name = updates.name
    if (updates.assetClass !== undefined) updateRow.asset_class = updates.assetClass
    if (updates.quantity !== undefined) updateRow.quantity = updates.quantity
    if (updates.averagePrice !== undefined) updateRow.average_price = updates.averagePrice
    if (updates.totalInvested !== undefined) updateRow.total_invested = updates.totalInvested
    if (updates.purchaseDate !== undefined) updateRow.purchase_date = updates.purchaseDate

    const { error } = await supabase
      .from('assets')
      .update(updateRow)
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.error('Error updating asset:', error)
      return false
    }

    return true
  },

  async deleteAsset(id: string): Promise<boolean> {
    const userId = await getCurrentUserId()
    if (!userId) return false

    const { error } = await supabase
      .from('assets')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting asset:', error)
      return false
    }

    return true
  },

  // ---------------------------------------------------------------------------
  // Recurring Transactions
  // ---------------------------------------------------------------------------
  async getRecurringTransactions(): Promise<RecurringTransaction[]> {
    const userId = await getCurrentUserId()
    if (!userId) return []

    const { data, error } = await supabase
      .from('recurring_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching recurring transactions:', error)
      return []
    }

    return (data as RecurringTransactionRow[]).map(rowToRecurringTransaction)
  },

  async getActiveRecurringTransactions(): Promise<RecurringTransaction[]> {
    const userId = await getCurrentUserId()
    if (!userId) return []

    const { data, error } = await supabase
      .from('recurring_transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching active recurring transactions:', error)
      return []
    }

    return (data as RecurringTransactionRow[]).map(rowToRecurringTransaction)
  },

  async addRecurringTransaction(recurringTransaction: RecurringTransaction): Promise<boolean> {
    const userId = await getCurrentUserId()
    if (!userId) {
      console.warn('[Supabase] No user ID, skipping recurring transaction sync')
      return false
    }

    const row = recurringTransactionToRow(recurringTransaction, userId)

    // Use upsert to handle potential duplicate key conflicts gracefully
    const { error } = await supabase
      .from('recurring_transactions')
      .upsert(row, { onConflict: 'id' })

    if (error) {
      if (error.code === '42501') {
        console.warn('[Supabase] Recurring transaction sync failed (auth):', error.message)
      } else {
        console.error('[Supabase] Error adding recurring transaction:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          recurringTransaction: { id: recurringTransaction.id, type: recurringTransaction.type, frequency: recurringTransaction.frequency },
        })
      }
      return false
    }

    return true
  },

  async updateRecurringTransaction(id: string, recurringTransaction: RecurringTransaction): Promise<boolean> {
    const userId = await getCurrentUserId()
    if (!userId) return false

    const row = recurringTransactionToRow(recurringTransaction, userId)
    const { error } = await supabase
      .from('recurring_transactions')
      .update(row)
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.error('Error updating recurring transaction:', error)
      return false
    }

    return true
  },

  async updateRecurringTransactionLastGenerated(id: string, lastGeneratedDate: string): Promise<boolean> {
    const userId = await getCurrentUserId()
    if (!userId) return false

    const { error } = await supabase
      .from('recurring_transactions')
      .update({ last_generated_date: lastGeneratedDate })
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.error('Error updating recurring transaction last generated date:', error)
      return false
    }

    return true
  },

  async deleteRecurringTransaction(id: string): Promise<boolean> {
    const userId = await getCurrentUserId()
    if (!userId) return false

    const { error } = await supabase
      .from('recurring_transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting recurring transaction:', error)
      return false
    }

    return true
  },

  // ---------------------------------------------------------------------------
  // Budget Alerts
  // ---------------------------------------------------------------------------
  async getBudgetAlerts(): Promise<BudgetAlert[]> {
    const userId = await getCurrentUserId()
    if (!userId) return []

    const { data, error } = await supabase
      .from('budget_alerts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching budget alerts:', error)
      return []
    }

    return (data as BudgetAlertRow[]).map(rowToBudgetAlert)
  },

  async getBudgetAlertByCategory(category: string): Promise<BudgetAlert | null> {
    const userId = await getCurrentUserId()
    if (!userId) return null

    const { data, error } = await supabase
      .from('budget_alerts')
      .select('*')
      .eq('user_id', userId)
      .eq('category', category)
      .eq('is_active', true)
      .maybeSingle()

    if (error) {
      console.error('Error fetching budget alert:', error)
      return null
    }

    return data ? rowToBudgetAlert(data as BudgetAlertRow) : null
  },

  async addBudgetAlert(alert: BudgetAlert): Promise<boolean> {
    const userId = await getCurrentUserId()
    if (!userId) return false

    const row = budgetAlertToRow(alert, userId)
    const { error } = await supabase
      .from('budget_alerts')
      .upsert(row, { onConflict: 'user_id,category' })

    if (error) {
      console.error('Error adding budget alert:', error)
      return false
    }

    return true
  },

  async updateBudgetAlert(id: string, alert: BudgetAlert): Promise<boolean> {
    const userId = await getCurrentUserId()
    if (!userId) return false

    const row = budgetAlertToRow(alert, userId)
    const { error } = await supabase
      .from('budget_alerts')
      .update(row)
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.error('Error updating budget alert:', error)
      return false
    }

    return true
  },

  async deleteBudgetAlert(id: string): Promise<boolean> {
    const userId = await getCurrentUserId()
    if (!userId) return false

    const { error } = await supabase
      .from('budget_alerts')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting budget alert:', error)
      return false
    }

    return true
  },
}
