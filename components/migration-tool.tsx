'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Cloud, Upload, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from '@/lib/i18n'
import { storageService } from '@/services/storage'
import { investmentsStorageService } from '@/services/investments-storage'
import { supabaseService } from '@/services/supabase'
import {
  TransactionSchema,
  CategorySchema,
  GoalSchema,
  AssetSchema,
  validateArray,
} from '@/lib/schemas'

type MigrationStatus = 'idle' | 'migrating' | 'success' | 'error'

interface MigrationResult {
  transactions: { success: number; failed: number }
  categories: { success: number; failed: number }
  goals: { success: number; failed: number }
  assets: { success: number; failed: number }
  profile: boolean
}

export function MigrationTool() {
  const t = useTranslation()
  const [status, setStatus] = useState<MigrationStatus>('idle')
  const [result, setResult] = useState<MigrationResult | null>(null)

  const getLocalCounts = () => {
    const transactions = storageService.getTransactions()
    const categories = storageService.getCategories()
    const goals = storageService.getGoals()
    const assets = investmentsStorageService.getAssets()

    return {
      transactions: transactions.length,
      categories: categories.length,
      goals: goals.length,
      assets: assets.length,
    }
  }

  const handleMigrate = async () => {
    setStatus('migrating')
    setResult(null)

    try {
      // Get and validate data from localStorage
      const localTransactions = storageService.getTransactions()
      const localCategories = storageService.getCategories()
      const localGoals = storageService.getGoals()
      const localProfile = storageService.getProfile()
      const localAssets = investmentsStorageService.getAssets()

      // Validate with Zod
      const { valid: validTransactions } = validateArray(
        localTransactions,
        TransactionSchema,
      )
      const { valid: validCategories } = validateArray(
        localCategories,
        CategorySchema,
      )
      const { valid: validGoals } = validateArray(localGoals, GoalSchema)
      const { valid: validAssets } = validateArray(localAssets, AssetSchema)

      const migrationResult: MigrationResult = {
        transactions: { success: 0, failed: 0 },
        categories: { success: 0, failed: 0 },
        goals: { success: 0, failed: 0 },
        assets: { success: 0, failed: 0 },
        profile: false,
      }

      // Migrate profile first
      if (localProfile.name) {
        migrationResult.profile =
          await supabaseService.saveProfile(localProfile)
      } else {
        migrationResult.profile = true // No profile to migrate
      }

      // Migrate categories
      for (const category of validCategories) {
        const success = await supabaseService.addCategory(category)
        if (success) {
          migrationResult.categories.success++
        } else {
          migrationResult.categories.failed++
        }
      }

      // Migrate transactions
      for (const transaction of validTransactions) {
        const success = await supabaseService.addTransaction(transaction)
        if (success) {
          migrationResult.transactions.success++
        } else {
          migrationResult.transactions.failed++
        }
      }

      // Migrate goals
      for (const goal of validGoals) {
        const success = await supabaseService.addGoal(goal)
        if (success) {
          migrationResult.goals.success++
        } else {
          migrationResult.goals.failed++
        }
      }

      // Migrate assets
      for (const asset of validAssets) {
        const success = await supabaseService.addAsset(asset)
        if (success) {
          migrationResult.assets.success++
        } else {
          migrationResult.assets.failed++
        }
      }

      setResult(migrationResult)

      const totalSuccess =
        migrationResult.transactions.success +
        migrationResult.categories.success +
        migrationResult.goals.success +
        migrationResult.assets.success

      const totalFailed =
        migrationResult.transactions.failed +
        migrationResult.categories.failed +
        migrationResult.goals.failed +
        migrationResult.assets.failed

      if (totalFailed === 0) {
        setStatus('success')
        toast.success(t('migration.success'), {
          description: t('migration.successDesc', {
            count: totalSuccess.toString(),
          }),
        })
      } else {
        setStatus('error')
        toast.warning(t('migration.partial'), {
          description: t('migration.partialDesc', {
            success: totalSuccess.toString(),
            failed: totalFailed.toString(),
          }),
        })
      }
    } catch (error) {
      console.error('Migration failed:', error)
      setStatus('error')
      toast.error(t('migration.error'), {
        description: t('migration.errorDesc'),
      })
    }
  }

  const counts = getLocalCounts()
  const totalItems =
    counts.transactions + counts.categories + counts.goals + counts.assets

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Cloud className="size-5 text-primary" />
          </div>
          <div>
            <CardTitle>{t('migration.title')}</CardTitle>
            <CardDescription>{t('migration.description')}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg border border-border text-center">
            <p className="text-xl font-bold">{counts.transactions}</p>
            <p className="text-xs text-muted-foreground">
              {t('home.transactions')}
            </p>
          </div>
          <div className="p-3 rounded-lg border border-border text-center">
            <p className="text-xl font-bold">{counts.categories}</p>
            <p className="text-xs text-muted-foreground">
              {t('categories.title')}
            </p>
          </div>
          <div className="p-3 rounded-lg border border-border text-center">
            <p className="text-xl font-bold">{counts.goals}</p>
            <p className="text-xs text-muted-foreground">{t('goals.title')}</p>
          </div>
          <div className="p-3 rounded-lg border border-border text-center">
            <p className="text-xl font-bold">{counts.assets}</p>
            <p className="text-xs text-muted-foreground">
              {t('investments.myAssets')}
            </p>
          </div>
        </div>

        {result && (
          <div className="p-3 rounded-lg border border-border bg-muted/50 text-sm space-y-1">
            <p className="font-medium">{t('migration.results')}:</p>
            <p>
              {t('home.transactions')}: {result.transactions.success}{' '}
              {t('migration.migrated')}
              {result.transactions.failed > 0 &&
                `, ${result.transactions.failed} ${t('migration.failed')}`}
            </p>
            <p>
              {t('categories.title')}: {result.categories.success}{' '}
              {t('migration.migrated')}
              {result.categories.failed > 0 &&
                `, ${result.categories.failed} ${t('migration.failed')}`}
            </p>
            <p>
              {t('goals.title')}: {result.goals.success}{' '}
              {t('migration.migrated')}
              {result.goals.failed > 0 &&
                `, ${result.goals.failed} ${t('migration.failed')}`}
            </p>
            <p>
              {t('investments.myAssets')}: {result.assets.success}{' '}
              {t('migration.migrated')}
              {result.assets.failed > 0 &&
                `, ${result.assets.failed} ${t('migration.failed')}`}
            </p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button
            onClick={handleMigrate}
            disabled={status === 'migrating' || totalItems === 0}
            className="flex-1 sm:flex-none"
          >
            {status === 'migrating' ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                {t('migration.migrating')}
              </>
            ) : status === 'success' ? (
              <>
                <CheckCircle2 className="size-4 mr-2" />
                {t('migration.completed')}
              </>
            ) : status === 'error' ? (
              <>
                <AlertCircle className="size-4 mr-2" />
                {t('migration.retry')}
              </>
            ) : (
              <>
                <Upload className="size-4 mr-2" />
                {t('migration.migrate')}
              </>
            )}
          </Button>

          {totalItems === 0 && (
            <p className="text-sm text-muted-foreground">
              {t('migration.noData')}
            </p>
          )}
        </div>

        <p className="text-xs text-muted-foreground">{t('migration.note')}</p>
      </CardContent>
    </Card>
  )
}
