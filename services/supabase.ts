// Supabase CRUD Service - Mirrors storage.ts interface for cloud persistence
import { supabase } from "@/lib/supabase"
import type { Transaction, Category, UserProfile, Goal } from "@/lib/types"
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
}

function profileToRow(p: UserProfile, userId: string): Omit<ProfileRow, 'telegram_chat_id'> {
  return {
    id: userId,
    name: p.name || null,
    currency: p.currency,
    language: p.language,
    default_month: p.defaultMonth || null,
  }
}

function rowToProfile(row: ProfileRow): UserProfile {
  return {
    name: row.name ?? '',
    currency: row.currency || 'BRL',
    defaultMonth: row.default_month ?? new Date().toISOString().slice(0, 7),
    language: (row.language as 'en' | 'pt') || 'pt',
  }
}

// Goal
interface GoalRow {
  id: string
  user_id: string
  title: string
  completed: boolean
  created_at: string
}

function goalToRow(g: Goal, userId: string): Omit<GoalRow, 'created_at'> {
  return {
    id: g.id,
    user_id: userId,
    title: g.title,
    completed: g.completed,
  }
}

function rowToGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    title: row.title,
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
    if (!userId) return false

    const { error } = await supabase
      .from('transactions')
      .insert(transactionToRow(transaction, userId))

    if (error) {
      console.error('Error adding transaction:', error)
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
}
