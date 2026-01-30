"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useFinanceStore } from "@/hooks/use-finance-store"
import { formatCurrency } from "@/utils/formatters"
import { TrendingUp, TrendingDown, Wallet, Indent as Investment } from "lucide-react"
import { useTranslation } from "@/lib/i18n"
import { cn } from "@/lib/utils"

function FinancialSummarySkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-9 w-9 rounded-lg" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function FinancialSummary() {
  const { getBalance, getTotalIncome, getTotalExpense, getTotalInvestment, profile, isHydrated, transactions, filterPeriod } = useFinanceStore()
  const t = useTranslation()

  // Memoize expensive calculations - only recalculate when transactions or filter change
  const { balance, income, expense, investment } = useMemo(() => ({
    balance: getBalance(),
    income: getTotalIncome(),
    expense: getTotalExpense(),
    investment: getTotalInvestment(),
  }), [transactions, filterPeriod, getBalance, getTotalIncome, getTotalExpense, getTotalInvestment])

  if (!isHydrated) {
    return <FinancialSummarySkeleton />
  }

  const summaryCards = [
    {
      title: t("summary.balance"),
      value: balance,
      icon: Wallet,
      color: balance >= 0 ? "text-income" : "text-expense",
      bgColor: balance >= 0 ? "bg-income/10" : "bg-expense/10",
    },
    {
      title: t("summary.income"),
      value: income,
      icon: TrendingUp,
      color: "text-income",
      bgColor: "bg-income/10",
    },
    {
      title: t("summary.expenses"),
      value: expense,
      icon: TrendingDown,
      color: "text-expense",
      bgColor: "bg-expense/10",
    },
    {
      title: t("summary.investments"),
      value: investment,
      icon: Investment,
      color: "text-investment",
      bgColor: "bg-investment/10",
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {summaryCards.map((card) => {
        const Icon = card.icon
        return (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <div className={cn("p-2 rounded-lg", card.bgColor)}>
                <Icon className={cn("size-5", card.color)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={cn("text-2xl font-bold", card.color)}>
                {formatCurrency(Math.abs(card.value), profile.currency)}
              </div>
              {card.title === t("summary.balance") && balance < 0 && (
                <p className="text-xs text-muted-foreground mt-1">{t("summary.negativeBalance")}</p>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
