/**
 * localStorage Data Migration System
 *
 * This module handles versioning and migrations for localStorage data.
 * When the data structure changes, add a new migration function and increment CURRENT_VERSION.
 */
import { logger } from '@/lib/logger'

const STORAGE_VERSION_KEY = 'finance_data_version'
const CURRENT_VERSION = 2

type MigrationFn = () => void

interface LegacyTransaction {
  id: string
  type: 'income' | 'expense' | 'investment' | 'unexpected'
  amount: number
  category: string
  date: string
  description?: string
  isFuture?: boolean
  isUnexpected?: boolean
  createdAt?: number
}

/**
 * Migration registry - add new migrations here
 * Key is the version TO migrate to (e.g., migration "1" upgrades from 0 to 1)
 */
const migrations: Record<number, MigrationFn> = {
  // Version 1: Initial version - no migration needed, just sets the version
  1: () => {
    // Initial version - no changes needed
  },

  // Version 2: Convert type "unexpected" to isUnexpected flag
  // - Transactions with type "unexpected" become type "expense" + isUnexpected: true
  // - Categories with type "unexpected" become type "expense"
  2: () => {
    const TRANSACTIONS_KEY = 'finance_transactions'
    const CATEGORIES_KEY = 'finance_categories'

    try {
      // Migrate transactions
      const transactionsData = localStorage.getItem(TRANSACTIONS_KEY)
      if (transactionsData) {
        const transactions: LegacyTransaction[] = JSON.parse(transactionsData)
        let transactionsModified = false

        const migratedTransactions = transactions.map((t) => {
          if (t.type === 'unexpected') {
            transactionsModified = true
            return {
              ...t,
              type: 'expense' as const,
              isUnexpected: true,
            }
          }
          return {
            ...t,
            isUnexpected: t.isUnexpected ?? false,
          }
        })

        if (transactionsModified) {
          localStorage.setItem(
            TRANSACTIONS_KEY,
            JSON.stringify(migratedTransactions),
          )
          logger.migrations.info(
            'Migrated unexpected transactions to isUnexpected flag',
          )
        }
      }

      // Migrate categories
      const categoriesData = localStorage.getItem(CATEGORIES_KEY)
      if (categoriesData) {
        const categories = JSON.parse(categoriesData) as Array<{
          id: string
          name: string
          type: string
          icon?: string
        }>
        let categoriesModified = false

        const migratedCategories = categories.map((c) => {
          if (c.type === 'unexpected') {
            categoriesModified = true
            return { ...c, type: 'expense' }
          }
          return c
        })

        if (categoriesModified) {
          localStorage.setItem(
            CATEGORIES_KEY,
            JSON.stringify(migratedCategories),
          )
          logger.migrations.info(
            'Migrated unexpected categories to expense type',
          )
        }
      }
    } catch (error) {
      logger.migrations.error('Migration v2 failed:', error)
      throw error
    }
  },
}

/**
 * Gets the current data version from localStorage
 */
function getStoredVersion(): number {
  if (typeof window === 'undefined') return CURRENT_VERSION
  const version = localStorage.getItem(STORAGE_VERSION_KEY)
  return version ? parseInt(version, 10) : 0
}

/**
 * Sets the data version in localStorage
 */
function setStoredVersion(version: number): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_VERSION_KEY, version.toString())
}

/**
 * Runs all pending migrations from current version to latest
 * Should be called on app initialization before loading data
 */
export function runMigrations(): void {
  if (typeof window === 'undefined') return

  const storedVersion = getStoredVersion()

  if (storedVersion >= CURRENT_VERSION) {
    return // Already up to date
  }

  logger.migrations.info(
    `Running migrations from v${storedVersion} to v${CURRENT_VERSION}`,
  )

  // Run each migration in order
  for (let version = storedVersion + 1; version <= CURRENT_VERSION; version++) {
    const migration = migrations[version]
    if (migration) {
      try {
        logger.migrations.info(`Running migration to v${version}`)
        migration()
      } catch (error) {
        logger.migrations.error(`Migration to v${version} failed:`, error)
        // Don't update version on failure - will retry next time
        return
      }
    }
  }

  setStoredVersion(CURRENT_VERSION)
  logger.migrations.info(`Migrations complete. Now at v${CURRENT_VERSION}`)
}

/**
 * Gets the current schema version
 */
export function getCurrentVersion(): number {
  return CURRENT_VERSION
}

/**
 * Gets the stored data version
 */
export function getDataVersion(): number {
  return getStoredVersion()
}

/**
 * Helper to safely get and parse JSON from localStorage with type validation
 */
export function safeGetItem<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue
  try {
    const data = localStorage.getItem(key)
    if (!data) return defaultValue
    return JSON.parse(data) as T
  } catch (error) {
    logger.migrations.error(`Failed to parse ${key}:`, error)
    return defaultValue
  }
}

/**
 * Helper to safely set JSON in localStorage
 */
export function safeSetItem(key: string, value: unknown): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    logger.migrations.error(`Failed to save ${key}:`, error)
  }
}
