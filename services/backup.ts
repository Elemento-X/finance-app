/**
 * Backup Service
 *
 * Handles export and import of user data as JSON files.
 * Designed to be user-friendly while maintaining compatibility with future backend.
 */

import type { Asset } from '@/lib/investment-types'
import type { Category, Goal, Transaction, UserProfile } from '@/lib/types'
import { getCurrentVersion } from './migrations'

const STORAGE_KEYS = {
  TRANSACTIONS: 'finance_transactions',
  CATEGORIES: 'finance_categories',
  PROFILE: 'finance_profile',
  GOALS: 'finance_goals',
  ASSETS: 'finance_app_assets',
} as const

export interface BackupData {
  version: number
  exportedAt: string
  appName: string
  data: {
    transactions: Transaction[]
    categories: Category[]
    profile: UserProfile
    goals: Goal[]
    assets: Asset[]
  }
}

export interface BackupPreview {
  exportedAt: string
  version: number
  counts: {
    transactions: number
    categories: number
    goals: number
    assets: number
  }
  totalTransactionsAmount: {
    income: number
    expense: number
    investment: number
  }
}

export interface ImportResult {
  success: boolean
  message: string
  imported?: {
    transactions: number
    categories: number
    goals: number
    assets: number
  }
}

/**
 * Creates a backup of all user data
 */
export function createBackup(): BackupData {
  const getItem = <T>(key: string, defaultValue: T): T => {
    if (typeof window === 'undefined') return defaultValue
    try {
      const data = localStorage.getItem(key)
      return data ? JSON.parse(data) : defaultValue
    } catch {
      return defaultValue
    }
  }

  return {
    version: getCurrentVersion(),
    exportedAt: new Date().toISOString(),
    appName: 'Controle Financeiro Pessoal',
    data: {
      transactions: getItem<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []),
      categories: getItem<Category[]>(STORAGE_KEYS.CATEGORIES, []),
      profile: getItem<UserProfile>(STORAGE_KEYS.PROFILE, {
        name: '',
        currency: 'BRL',
        defaultMonth: new Date().toISOString().slice(0, 7),
        language: 'en',
      }),
      goals: getItem<Goal[]>(STORAGE_KEYS.GOALS, []),
      assets: getItem<Asset[]>(STORAGE_KEYS.ASSETS, []),
    },
  }
}

/**
 * Downloads backup as a JSON file
 */
export function downloadBackup(): void {
  const backup = createBackup()
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)

  const date = new Date().toISOString().split('T')[0]
  const filename = `meu-financeiro-${date}.json`

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Validates and parses a backup file
 */
export function parseBackupFile(content: string): BackupData | null {
  try {
    const parsed = JSON.parse(content)

    // Validate structure
    if (!parsed.version || !parsed.data) {
      return null
    }

    if (!parsed.data.transactions || !Array.isArray(parsed.data.transactions)) {
      return null
    }

    return parsed as BackupData
  } catch {
    return null
  }
}

/**
 * Generates a preview of backup data before import
 */
export function generateBackupPreview(backup: BackupData): BackupPreview {
  const transactions = backup.data.transactions || []

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalInvestment = transactions
    .filter((t) => t.type === 'investment')
    .reduce((sum, t) => sum + t.amount, 0)

  return {
    exportedAt: backup.exportedAt,
    version: backup.version,
    counts: {
      transactions: transactions.length,
      categories: (backup.data.categories || []).length,
      goals: (backup.data.goals || []).length,
      assets: (backup.data.assets || []).length,
    },
    totalTransactionsAmount: {
      income: totalIncome,
      expense: totalExpense,
      investment: totalInvestment,
    },
  }
}

/**
 * Imports backup data, replacing all existing data
 */
export function importBackup(
  backup: BackupData,
  mode: 'replace' | 'merge' = 'replace',
): ImportResult {
  if (typeof window === 'undefined') {
    return { success: false, message: 'Cannot import in server environment' }
  }

  try {
    if (mode === 'replace') {
      localStorage.setItem(
        STORAGE_KEYS.TRANSACTIONS,
        JSON.stringify(backup.data.transactions || []),
      )
      localStorage.setItem(
        STORAGE_KEYS.CATEGORIES,
        JSON.stringify(backup.data.categories || []),
      )
      localStorage.setItem(
        STORAGE_KEYS.PROFILE,
        JSON.stringify(backup.data.profile || {}),
      )
      localStorage.setItem(
        STORAGE_KEYS.GOALS,
        JSON.stringify(backup.data.goals || []),
      )
      localStorage.setItem(
        STORAGE_KEYS.ASSETS,
        JSON.stringify(backup.data.assets || []),
      )
    } else {
      const existingTransactions = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.TRANSACTIONS) || '[]',
      )
      const existingCategories = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.CATEGORIES) || '[]',
      )
      const existingGoals = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.GOALS) || '[]',
      )
      const existingAssets = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.ASSETS) || '[]',
      )

      const existingTransactionIds = new Set(
        existingTransactions.map((t: Transaction) => t.id),
      )
      const existingCategoryIds = new Set(
        existingCategories.map((c: Category) => c.id),
      )
      const existingGoalIds = new Set(existingGoals.map((g: Goal) => g.id))
      const existingAssetIds = new Set(existingAssets.map((a: Asset) => a.id))

      const newTransactions = (backup.data.transactions || []).filter(
        (t) => !existingTransactionIds.has(t.id),
      )
      const newCategories = (backup.data.categories || []).filter(
        (c) => !existingCategoryIds.has(c.id),
      )
      const newGoals = (backup.data.goals || []).filter(
        (g) => !existingGoalIds.has(g.id),
      )
      const newAssets = (backup.data.assets || []).filter(
        (a) => !existingAssetIds.has(a.id),
      )

      localStorage.setItem(
        STORAGE_KEYS.TRANSACTIONS,
        JSON.stringify([...existingTransactions, ...newTransactions]),
      )
      localStorage.setItem(
        STORAGE_KEYS.CATEGORIES,
        JSON.stringify([...existingCategories, ...newCategories]),
      )
      localStorage.setItem(
        STORAGE_KEYS.GOALS,
        JSON.stringify([...existingGoals, ...newGoals]),
      )
      localStorage.setItem(
        STORAGE_KEYS.ASSETS,
        JSON.stringify([...existingAssets, ...newAssets]),
      )

      return {
        success: true,
        message: 'Dados mesclados com sucesso',
        imported: {
          transactions: newTransactions.length,
          categories: newCategories.length,
          goals: newGoals.length,
          assets: newAssets.length,
        },
      }
    }

    return {
      success: true,
      message: 'Backup restaurado com sucesso',
      imported: {
        transactions: (backup.data.transactions || []).length,
        categories: (backup.data.categories || []).length,
        goals: (backup.data.goals || []).length,
        assets: (backup.data.assets || []).length,
      },
    }
  } catch (error) {
    return {
      success: false,
      message: `Erro ao importar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
    }
  }
}

/**
 * Reads a file and returns its content as string
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Falha ao ler arquivo'))
    reader.readAsText(file)
  })
}
