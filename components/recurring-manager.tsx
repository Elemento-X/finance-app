'use client'

import { useState } from 'react'
import { useFinanceStore } from '@/hooks/use-finance-store'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Trash2, Repeat, Pause, Play } from 'lucide-react'
import { toast } from 'sonner'
import type { RecurringTransaction, TransactionType } from '@/lib/types'
import { useTranslation } from '@/lib/i18n'

export function RecurringManager() {
  const {
    recurringTransactions,
    deleteRecurringTransaction,
    toggleRecurringTransaction,
  } = useFinanceStore()
  const t = useTranslation()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = () => {
    if (deletingId) {
      deleteRecurringTransaction(deletingId)
      toast.success(t('recurring.deleteSuccess'))
      setDeletingId(null)
    }
  }

  const handleToggle = (id: string, currentlyActive: boolean) => {
    toggleRecurringTransaction(id)
    toast.success(
      currentlyActive
        ? t('recurring.pauseSuccess')
        : t('recurring.activateSuccess'),
    )
  }

  const formatFrequency = (recurring: RecurringTransaction): string => {
    const days = [
      t('recurring.sunday'),
      t('recurring.monday'),
      t('recurring.tuesday'),
      t('recurring.wednesday'),
      t('recurring.thursday'),
      t('recurring.friday'),
      t('recurring.saturday'),
    ]

    switch (recurring.frequency) {
      case 'weekly':
        return `${t('recurring.frequencyWeekly')} - ${days[recurring.dayOfWeek ?? 0]}`
      case 'monthly':
        return `${t('recurring.frequencyMonthly')} - ${t('recurring.dayOfMonth')} ${recurring.dayOfMonth ?? 1}`
      case 'yearly':
        return `${t('recurring.frequencyYearly')} - ${recurring.dayOfMonth ?? 1}/${recurring.monthOfYear ?? 1}`
      default:
        return ''
    }
  }

  const formatAmount = (amount: number, type: TransactionType): string => {
    const prefix = type === 'income' ? '+' : '-'
    return `${prefix} R$ ${amount.toFixed(2)}`
  }

  const getTypeColor = (type: TransactionType): string => {
    switch (type) {
      case 'income':
        return 'text-green-500'
      case 'expense':
        return 'text-red-500'
      case 'investment':
        return 'text-blue-500'
      default:
        return ''
    }
  }

  const activeRecurrings = recurringTransactions.filter((r) => r.isActive)
  const pausedRecurrings = recurringTransactions.filter((r) => !r.isActive)

  if (recurringTransactions.length === 0) {
    return null
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Repeat className="size-5 text-primary" />
            </div>
            <div>
              <CardTitle>{t('recurring.title')}</CardTitle>
              <CardDescription>{t('recurring.manageDesc')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeRecurrings.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                {t('recurring.active')} ({activeRecurrings.length})
              </p>
              {activeRecurrings.map((recurring) => (
                <div
                  key={recurring.id}
                  className="flex items-center justify-between gap-2 p-3 rounded-lg border border-border"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-semibold ${getTypeColor(recurring.type)}`}
                      >
                        {formatAmount(recurring.amount, recurring.type)}
                      </span>
                      <span className="text-sm text-muted-foreground truncate">
                        {recurring.category}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatFrequency(recurring)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      onClick={() =>
                        handleToggle(recurring.id, recurring.isActive)
                      }
                    >
                      <Pause className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 text-destructive hover:text-destructive"
                      onClick={() => setDeletingId(recurring.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pausedRecurrings.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                {t('recurring.paused')} ({pausedRecurrings.length})
              </p>
              {pausedRecurrings.map((recurring) => (
                <div
                  key={recurring.id}
                  className="flex items-center justify-between gap-2 p-3 rounded-lg border border-border opacity-60"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-semibold ${getTypeColor(recurring.type)}`}
                      >
                        {formatAmount(recurring.amount, recurring.type)}
                      </span>
                      <span className="text-sm text-muted-foreground truncate">
                        {recurring.category}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatFrequency(recurring)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      onClick={() =>
                        handleToggle(recurring.id, recurring.isActive)
                      }
                    >
                      <Play className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 text-destructive hover:text-destructive"
                      onClick={() => setDeletingId(recurring.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dialog.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dialog.confirmDeleteDesc', {
                item: t('recurring.title').toLowerCase(),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
