// Sync Service - Offline-first sync layer between localStorage and Supabase
import { supabaseService } from "./supabase"
import { storageService } from "./storage"
import { investmentsStorageService } from "./investments-storage"
import type { Transaction, Category, UserProfile, Goal, RecurringTransaction } from "@/lib/types"
import type { Asset } from "@/lib/investment-types"

// =============================================================================
// Types
// =============================================================================

type EntityType = 'transactions' | 'categories' | 'goals' | 'profile' | 'assets' | 'recurringTransactions'
type OperationType = 'create' | 'update' | 'delete'

interface SyncOperation {
  id: string
  operationType: OperationType
  entity: EntityType
  entityId: string
  data: Transaction | Category | Goal | UserProfile | Asset | Partial<Asset> | RecurringTransaction | null
  timestamp: number
}

interface SyncState {
  lastSync: number | null
  isSyncing: boolean
  isOnline: boolean
}

// =============================================================================
// Constants
// =============================================================================

const SYNC_QUEUE_KEY = 'supabase_sync_queue'
const LAST_SYNC_KEY = 'supabase_last_sync'
const SYNC_INTERVAL_MS = 15 * 60 * 1000 // 15 minutes

// =============================================================================
// State
// =============================================================================

let syncState: SyncState = {
  lastSync: null,
  isSyncing: false,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
}

let syncIntervalId: ReturnType<typeof setInterval> | null = null

// =============================================================================
// Queue Management
// =============================================================================

function getQueue(): SyncOperation[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveQueue(queue: SyncOperation[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue))
}

function addToQueue(operation: Omit<SyncOperation, 'id' | 'timestamp'>): void {
  const queue = getQueue()

  // Generate unique ID for the operation
  const op: SyncOperation = {
    ...operation,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: Date.now(),
  }

  // For updates/deletes, remove previous pending operations for the same entity
  const filtered = queue.filter(q =>
    !(q.entity === operation.entity && q.entityId === operation.entityId)
  )

  filtered.push(op)
  saveQueue(filtered)
}

function removeFromQueue(operationId: string): void {
  const queue = getQueue()
  saveQueue(queue.filter(q => q.id !== operationId))
}

function clearQueue(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(SYNC_QUEUE_KEY)
}

// =============================================================================
// Online/Offline Detection
// =============================================================================

function updateOnlineStatus(): void {
  const wasOffline = !syncState.isOnline
  syncState.isOnline = navigator.onLine

  // If we just came back online, flush the queue
  if (wasOffline && syncState.isOnline) {
    console.log('[Sync] Back online, flushing queue...')
    flushQueue()
  }
}

function setupOnlineListeners(): void {
  if (typeof window === 'undefined') return

  window.addEventListener('online', updateOnlineStatus)
  window.addEventListener('offline', updateOnlineStatus)
}

function removeOnlineListeners(): void {
  if (typeof window === 'undefined') return

  window.removeEventListener('online', updateOnlineStatus)
  window.removeEventListener('offline', updateOnlineStatus)
}

// =============================================================================
// Flush Queue - Execute pending operations
// =============================================================================

async function flushQueue(): Promise<{ success: number; failed: number }> {
  const queue = getQueue()
  if (queue.length === 0) return { success: 0, failed: 0 }

  if (!syncState.isOnline) {
    console.log('[Sync] Offline, skipping flush')
    return { success: 0, failed: queue.length }
  }

  console.log(`[Sync] Flushing ${queue.length} operations...`)

  let success = 0
  let failed = 0

  // Sort by timestamp to maintain order
  const sortedQueue = [...queue].sort((a, b) => a.timestamp - b.timestamp)

  for (const op of sortedQueue) {
    try {
      const result = await executeOperation(op)
      if (result) {
        removeFromQueue(op.id)
        success++
      } else {
        failed++
      }
    } catch (error) {
      console.error(`[Sync] Failed to execute operation:`, op, error)
      failed++
    }
  }

  console.log(`[Sync] Flush complete: ${success} success, ${failed} failed`)
  return { success, failed }
}

async function executeOperation(op: SyncOperation): Promise<boolean> {
  switch (op.entity) {
    case 'transactions':
      return executeTransactionOp(op)
    case 'categories':
      return executeCategoryOp(op)
    case 'goals':
      return executeGoalOp(op)
    case 'profile':
      return executeProfileOp(op)
    case 'assets':
      return executeAssetOp(op)
    case 'recurringTransactions':
      return executeRecurringTransactionOp(op)
    default:
      console.warn(`[Sync] Unknown entity type: ${op.entity}`)
      return false
  }
}

async function executeTransactionOp(op: SyncOperation): Promise<boolean> {
  switch (op.operationType) {
    case 'create':
      return supabaseService.addTransaction(op.data as Transaction)
    case 'update':
      return supabaseService.updateTransaction(op.entityId, op.data as Transaction)
    case 'delete':
      return supabaseService.deleteTransaction(op.entityId)
    default:
      return false
  }
}

async function executeCategoryOp(op: SyncOperation): Promise<boolean> {
  switch (op.operationType) {
    case 'create':
      return supabaseService.addCategory(op.data as Category)
    case 'update':
      return supabaseService.updateCategory(op.entityId, op.data as Category)
    case 'delete':
      return supabaseService.deleteCategory(op.entityId)
    default:
      return false
  }
}

async function executeGoalOp(op: SyncOperation): Promise<boolean> {
  switch (op.operationType) {
    case 'create':
      return supabaseService.addGoal(op.data as Goal)
    case 'update':
      return supabaseService.updateGoal(op.entityId, op.data as Goal)
    case 'delete':
      return supabaseService.deleteGoal(op.entityId)
    default:
      return false
  }
}

async function executeProfileOp(op: SyncOperation): Promise<boolean> {
  if (op.operationType === 'update') {
    return supabaseService.saveProfile(op.data as UserProfile)
  }
  return false
}

async function executeAssetOp(op: SyncOperation): Promise<boolean> {
  switch (op.operationType) {
    case 'create':
      return supabaseService.addAsset(op.data as Asset)
    case 'update':
      return supabaseService.updateAsset(op.entityId, op.data as Partial<Asset>)
    case 'delete':
      return supabaseService.deleteAsset(op.entityId)
    default:
      return false
  }
}

async function executeRecurringTransactionOp(op: SyncOperation): Promise<boolean> {
  switch (op.operationType) {
    case 'create':
      return supabaseService.addRecurringTransaction(op.data as RecurringTransaction)
    case 'update':
      return supabaseService.updateRecurringTransaction(op.entityId, op.data as RecurringTransaction)
    case 'delete':
      return supabaseService.deleteRecurringTransaction(op.entityId)
    default:
      return false
  }
}

// =============================================================================
// Pull from Supabase - Update localStorage with cloud data
// =============================================================================

async function pullFromSupabase(): Promise<boolean> {
  if (!syncState.isOnline) {
    console.log('[Sync] Offline, skipping pull')
    return false
  }

  console.log('[Sync] Pulling data from Supabase...')

  try {
    // Pull all entities in parallel
    const [transactions, categories, goals, profile, assets, recurringTransactions] = await Promise.all([
      supabaseService.getTransactions(),
      supabaseService.getCategories(),
      supabaseService.getGoals(),
      supabaseService.getProfile(),
      supabaseService.getAssets(),
      supabaseService.getRecurringTransactions(),
    ])

    // Update localStorage with cloud data
    // Only update if we got data (empty array is valid, null/undefined is not)
    if (transactions) {
      storageService.saveTransactions(transactions)
    }

    if (categories && categories.length > 0) {
      storageService.saveCategories(categories)
    }

    if (goals) {
      storageService.saveGoals(goals)
    }

    if (profile) {
      storageService.saveProfile(profile)
    }

    if (assets) {
      investmentsStorageService.saveAssets(assets)
    }

    if (recurringTransactions) {
      storageService.saveRecurringTransactions(recurringTransactions)
    }

    // Update last sync timestamp
    const now = Date.now()
    syncState.lastSync = now
    if (typeof window !== 'undefined') {
      localStorage.setItem(LAST_SYNC_KEY, now.toString())
    }

    console.log('[Sync] Pull complete')
    return true
  } catch (error) {
    console.error('[Sync] Pull failed:', error)
    return false
  }
}

// =============================================================================
// Main Sync Functions
// =============================================================================

/**
 * Initial sync on app load
 * 1. Flush any pending operations first
 * 2. Pull latest data from Supabase
 */
async function syncOnLoad(): Promise<void> {
  if (syncState.isSyncing) {
    console.log('[Sync] Already syncing, skipping...')
    return
  }

  syncState.isSyncing = true
  console.log('[Sync] Starting initial sync...')

  try {
    // First, flush any pending operations
    await flushQueue()

    // Then pull latest data
    await pullFromSupabase()
  } finally {
    syncState.isSyncing = false
  }
}

/**
 * Periodic sync (every 15 min)
 */
async function syncPeriodic(): Promise<void> {
  if (syncState.isSyncing) {
    console.log('[Sync] Already syncing, skipping periodic sync...')
    return
  }

  console.log('[Sync] Starting periodic sync...')
  await syncOnLoad()
}

/**
 * Start the sync service
 */
function startSync(): void {
  if (typeof window === 'undefined') return

  // Setup online/offline listeners
  setupOnlineListeners()

  // Load last sync timestamp
  const lastSync = localStorage.getItem(LAST_SYNC_KEY)
  if (lastSync) {
    syncState.lastSync = parseInt(lastSync, 10)
  }

  // Start periodic sync
  if (syncIntervalId === null) {
    syncIntervalId = setInterval(syncPeriodic, SYNC_INTERVAL_MS)
  }

  console.log('[Sync] Sync service started')
}

/**
 * Stop the sync service
 */
function stopSync(): void {
  removeOnlineListeners()

  if (syncIntervalId !== null) {
    clearInterval(syncIntervalId)
    syncIntervalId = null
  }

  console.log('[Sync] Sync service stopped')
}

// =============================================================================
// Queue Operations - Called by stores to queue changes
// =============================================================================

function queueTransaction(type: OperationType, transaction: Transaction): void {
  addToQueue({
    operationType: type,
    entity: 'transactions',
    entityId: transaction.id,
    data: type === 'delete' ? null : transaction,
  })

  // If online, try to flush in background (non-blocking)
  if (syncState.isOnline) {
    setTimeout(() => flushQueue(), 0)
  }
}

function queueCategory(type: OperationType, category: Category): void {
  addToQueue({
    operationType: type,
    entity: 'categories',
    entityId: category.id,
    data: type === 'delete' ? null : category,
  })

  // If online, try to flush in background (non-blocking)
  if (syncState.isOnline) {
    setTimeout(() => flushQueue(), 0)
  }
}

function queueGoal(type: OperationType, goal: Goal): void {
  addToQueue({
    operationType: type,
    entity: 'goals',
    entityId: goal.id,
    data: type === 'delete' ? null : goal,
  })

  // If online, try to flush in background (non-blocking)
  if (syncState.isOnline) {
    setTimeout(() => flushQueue(), 0)
  }
}

function queueProfile(profile: UserProfile): void {
  addToQueue({
    operationType: 'update',
    entity: 'profile',
    entityId: 'profile', // Profile is singleton per user
    data: profile,
  })

  // If online, try to flush in background (non-blocking)
  if (syncState.isOnline) {
    setTimeout(() => flushQueue(), 0)
  }
}

function queueAsset(type: OperationType, asset: Asset | Partial<Asset> & { id: string }): void {
  addToQueue({
    operationType: type,
    entity: 'assets',
    entityId: asset.id,
    data: type === 'delete' ? null : asset,
  })

  // If online, try to flush in background (non-blocking)
  if (syncState.isOnline) {
    setTimeout(() => flushQueue(), 0)
  }
}

function queueRecurringTransaction(type: OperationType, recurringTransaction: RecurringTransaction): void {
  addToQueue({
    operationType: type,
    entity: 'recurringTransactions',
    entityId: recurringTransaction.id,
    data: type === 'delete' ? null : recurringTransaction,
  })

  // If online, try to flush in background (non-blocking)
  if (syncState.isOnline) {
    setTimeout(() => flushQueue(), 0)
  }
}

// =============================================================================
// Export
// =============================================================================

export const syncService = {
  // Lifecycle
  startSync,
  stopSync,

  // Manual sync
  syncOnLoad,
  syncPeriodic,
  flushQueue,
  pullFromSupabase,

  // Queue operations
  queueTransaction,
  queueCategory,
  queueGoal,
  queueProfile,
  queueAsset,
  queueRecurringTransaction,

  // Queue management
  getQueue,
  clearQueue,

  // State
  getState: () => ({ ...syncState }),
  isOnline: () => syncState.isOnline,
  isSyncing: () => syncState.isSyncing,
  getLastSync: () => syncState.lastSync,
  getPendingCount: () => getQueue().length,
}
