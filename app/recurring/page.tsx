"use client"

import { useState } from "react"
import { useFinanceStore } from "@/hooks/use-finance-store"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Plus, Trash2, Repeat, Pause, Play, Pencil } from "lucide-react"
import { toast } from "sonner"
import type { RecurringTransaction, RecurringFrequency, TransactionType } from "@/lib/types"
import { useTranslation } from "@/lib/i18n"
import { RecurringForm } from "./recurring-form"

export default function RecurringPage() {
  const { recurringTransactions, categories, addRecurringTransaction, updateRecurringTransaction, deleteRecurringTransaction, toggleRecurringTransaction } = useFinanceStore()
  const t = useTranslation()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingRecurring, setEditingRecurring] = useState<RecurringTransaction | null>(null)

  const handleAdd = (data: Omit<RecurringTransaction, "id" | "createdAt" | "lastGeneratedDate">) => {
    const newRecurring: RecurringTransaction = {
      ...data,
      id: `recurring-${Date.now()}`,
      createdAt: new Date().toISOString(),
    }
    addRecurringTransaction(newRecurring)
    setIsFormOpen(false)
    toast.success(t("recurring.addSuccess"))
  }

  const handleUpdate = (data: Omit<RecurringTransaction, "id" | "createdAt" | "lastGeneratedDate">) => {
    if (!editingRecurring) return
    const updated: RecurringTransaction = {
      ...data,
      id: editingRecurring.id,
      createdAt: editingRecurring.createdAt,
      lastGeneratedDate: editingRecurring.lastGeneratedDate,
    }
    updateRecurringTransaction(editingRecurring.id, updated)
    setEditingRecurring(null)
    toast.success(t("recurring.updateSuccess"))
  }

  const handleDelete = () => {
    if (deletingId) {
      deleteRecurringTransaction(deletingId)
      toast.success(t("recurring.deleteSuccess"))
      setDeletingId(null)
    }
  }

  const handleToggle = (id: string, currentlyActive: boolean) => {
    toggleRecurringTransaction(id)
    toast.success(currentlyActive ? t("recurring.pauseSuccess") : t("recurring.activateSuccess"))
  }

  const formatFrequency = (recurring: RecurringTransaction): string => {
    const days = [
      t("recurring.sunday"),
      t("recurring.monday"),
      t("recurring.tuesday"),
      t("recurring.wednesday"),
      t("recurring.thursday"),
      t("recurring.friday"),
      t("recurring.saturday"),
    ]

    switch (recurring.frequency) {
      case "weekly":
        return `${t("recurring.frequencyWeekly")} - ${days[recurring.dayOfWeek ?? 0]}`
      case "monthly":
        return `${t("recurring.frequencyMonthly")} - ${t("recurring.dayOfMonth")} ${recurring.dayOfMonth ?? 1}`
      case "yearly":
        return `${t("recurring.frequencyYearly")} - ${recurring.dayOfMonth ?? 1}/${recurring.monthOfYear ?? 1}`
      default:
        return ""
    }
  }

  const formatAmount = (amount: number, type: TransactionType): string => {
    const prefix = type === "income" ? "+" : "-"
    return `${prefix} R$ ${amount.toFixed(2)}`
  }

  const getTypeColor = (type: TransactionType): string => {
    switch (type) {
      case "income":
        return "text-green-500"
      case "expense":
        return "text-red-500"
      case "investment":
        return "text-blue-500"
      default:
        return ""
    }
  }

  const activeRecurrings = recurringTransactions.filter((r) => r.isActive)
  const pausedRecurrings = recurringTransactions.filter((r) => !r.isActive)

  const RecurringCard = ({ recurring }: { recurring: RecurringTransaction }) => (
    <Card className={!recurring.isActive ? "opacity-60" : ""}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`font-semibold ${getTypeColor(recurring.type)}`}>
                {formatAmount(recurring.amount, recurring.type)}
              </span>
              <span className="text-sm text-muted-foreground truncate">
                {recurring.category}
              </span>
            </div>
            {recurring.description && (
              <p className="text-sm text-muted-foreground truncate mb-1">
                {recurring.description}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {formatFrequency(recurring)}
            </p>
            {recurring.lastGeneratedDate && (
              <p className="text-xs text-muted-foreground mt-1">
                {t("recurring.lastGenerated")}: {recurring.lastGeneratedDate}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="size-8"
              onClick={() => setEditingRecurring(recurring)}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="size-8"
              onClick={() => handleToggle(recurring.id, recurring.isActive)}
            >
              {recurring.isActive ? (
                <Pause className="size-4" />
              ) : (
                <Play className="size-4" />
              )}
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
      </CardContent>
    </Card>
  )

  return (
    <div className="min-h-screen bg-background">
      <main className="container px-4 py-6 space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t("recurring.title")}</h1>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="size-4 mr-2" />
            {t("recurring.new")}
          </Button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Repeat className="size-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">
              {t("recurring.active")} ({activeRecurrings.length})
            </h2>
          </div>

          {activeRecurrings.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Repeat className="size-12 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">{t("recurring.empty")}</p>
                <p className="text-sm text-muted-foreground">{t("recurring.emptyDesc")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {activeRecurrings.map((recurring) => (
                <RecurringCard key={recurring.id} recurring={recurring} />
              ))}
            </div>
          )}
        </div>

        {pausedRecurrings.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Pause className="size-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">
                {t("recurring.paused")} ({pausedRecurrings.length})
              </h2>
            </div>

            <div className="space-y-2">
              {pausedRecurrings.map((recurring) => (
                <RecurringCard key={recurring.id} recurring={recurring} />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Add/Edit Dialog */}
      <Dialog
        open={isFormOpen || !!editingRecurring}
        onOpenChange={(open) => {
          if (!open) {
            setIsFormOpen(false)
            setEditingRecurring(null)
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingRecurring ? t("recurring.edit") : t("recurring.new")}
            </DialogTitle>
          </DialogHeader>
          <RecurringForm
            categories={categories}
            initialData={editingRecurring}
            onSubmit={editingRecurring ? handleUpdate : handleAdd}
            onCancel={() => {
              setIsFormOpen(false)
              setEditingRecurring(null)
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dialog.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("dialog.confirmDeleteDesc", { item: t("recurring.title").toLowerCase() })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
