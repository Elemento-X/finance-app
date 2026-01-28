"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
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
import type { Transaction } from "@/lib/types"
import { useFinanceStore } from "@/hooks/use-finance-store"
import { formatCurrency, formatDate } from "@/utils/formatters"
import { TransactionForm } from "./transaction-form"
import { Pencil, Trash2, TrendingUp, TrendingDown, DollarSign, AlertCircle } from "lucide-react"
import { useTranslation } from "@/lib/i18n"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

function TransactionListSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-24" />
              </div>
              <div className="flex flex-col items-end gap-2">
                <Skeleton className="h-7 w-24" />
                <div className="flex gap-1">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function TransactionList() {
  const {
    getFilteredTransactions,
    deleteTransaction,
    categories,
    profile,
    transactions: allTransactions,
    isHydrated,
  } = useFinanceStore()
  const t = useTranslation()
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  if (!isHydrated) {
    return <TransactionListSkeleton />
  }

  const transactions = getFilteredTransactions()

  const handleDelete = () => {
    if (deletingId) {
      deleteTransaction(deletingId)
      toast.success(t("transaction.deleted"))
      setDeletingId(null)
    }
  }

  const getCategoryName = (categoryId: string) => {
    const cat = categories.find((c) => c.id === categoryId)
    return cat ? `${cat.icon} ${cat.name}` : categoryId
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "income":
        return <TrendingUp className="size-4" />
      case "expense":
        return <TrendingDown className="size-4" />
      case "investment":
        return <DollarSign className="size-4" />
      default:
        return null
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "income":
        return t("type.income")
      case "expense":
        return t("type.expense")
      case "investment":
        return t("type.investment")
      default:
        return type
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "income":
        return "text-income"
      case "expense":
        return "text-expense"
      case "investment":
        return "text-investment"
      default:
        return ""
    }
  }

  const sortedTransactions = [...allTransactions].sort((a, b) => {
    const timeA = a.createdAt || Number.parseInt(a.id.split("-")[0]) || 0
    const timeB = b.createdAt || Number.parseInt(b.id.split("-")[0]) || 0
    return timeB - timeA
  })

  const isFutureTransaction = (transaction: Transaction) => {
    if (!transaction.isFuture) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const transactionDate = new Date(transaction.date)
    transactionDate.setHours(0, 0, 0, 0)
    return transactionDate > today
  }

  if (allTransactions.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">{t("transaction.noTransactions")}</p>
          <p className="text-sm text-muted-foreground">{t("transaction.addToStart")}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {sortedTransactions.map((transaction) => (
          <Card
            key={transaction.id}
            className={cn("overflow-hidden", isFutureTransaction(transaction) && "border-dashed opacity-70")}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={cn("font-medium", getTypeColor(transaction.type))}>
                      {getTypeIcon(transaction.type)}
                    </span>
                    <Badge variant="outline" className={cn("text-xs", getTypeColor(transaction.type))}>
                      {getTypeLabel(transaction.type)}
                    </Badge>
                    {isFutureTransaction(transaction) && (
                      <Badge variant="secondary" className="text-xs">
                        {t("transaction.futureBadge")}
                      </Badge>
                    )}
                    {transaction.isUnexpected && (
                      <Badge variant="outline" className="text-xs text-unexpected">
                        <AlertCircle className="size-3 mr-1" />
                        {t("transaction.unexpectedBadge")}
                      </Badge>
                    )}
                  </div>

                  <div className="text-sm text-muted-foreground">{getCategoryName(transaction.category)}</div>

                  {transaction.description && <p className="text-sm text-foreground/80">{transaction.description}</p>}

                  <div className="text-xs text-muted-foreground">{formatDate(transaction.date)}</div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className={cn("text-xl font-bold", getTypeColor(transaction.type))}>
                    {transaction.type === "income" ? "+" : "-"}
                    {formatCurrency(transaction.amount, profile.currency)}
                  </div>

                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      onClick={() => setEditingTransaction(transaction)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 text-destructive hover:text-destructive"
                      onClick={() => setDeletingId(transaction.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <TransactionForm
        open={!!editingTransaction}
        onOpenChange={(open) => !open && setEditingTransaction(undefined)}
        transaction={editingTransaction}
        mode="edit"
      />

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("transactionList.confirmDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("transaction.confirmDelete")}</AlertDialogDescription>
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
    </>
  )
}
