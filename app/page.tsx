"use client"

import { FloatingActionButton } from "@/components/floating-action-button"
import { PeriodFilter } from "@/components/period-filter"
import { TransactionList } from "@/components/transaction-list"
import { FinancialSummary } from "@/components/dashboard/financial-summary"
import { ExpensesByCategoryChart } from "@/components/dashboard/expenses-by-category-chart"
import { MonthlyEvolutionChart } from "@/components/dashboard/monthly-evolution-chart"
import { IncomeVsExpenseChart } from "@/components/dashboard/income-vs-expense-chart"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart3, List } from "lucide-react"
import { useTranslation } from "@/lib/i18n"

export default function HomePage() {
  const t = useTranslation()

  return (
    <div className="min-h-screen bg-background">
      <main className="px-4 py-6 space-y-6 pb-24">
        <PeriodFilter />

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="size-4" />
              {t("home.dashboard")}
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center gap-2">
              <List className="size-4" />
              {t("home.transactions")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6 mt-6">
            <FinancialSummary />

            <div className="grid gap-6 md:grid-cols-2">
              <ExpensesByCategoryChart />
              <IncomeVsExpenseChart />
            </div>

            <MonthlyEvolutionChart />
          </TabsContent>

          <TabsContent value="transactions" className="mt-6">
            <TransactionList />
          </TabsContent>
        </Tabs>
      </main>

      <FloatingActionButton />
    </div>
  )
}
