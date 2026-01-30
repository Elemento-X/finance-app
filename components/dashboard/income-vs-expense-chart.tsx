'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useFinanceStore } from '@/hooks/use-finance-store'
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { formatCurrency } from '@/utils/formatters'
import { useTranslation } from '@/lib/i18n'

function IncomeVsExpenseChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent className="h-[300px] flex items-end justify-around gap-4 pt-8">
        <div className="flex flex-col items-center gap-2">
          <Skeleton className="h-32 w-16 rounded-t-lg" />
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <Skeleton className="h-24 w-16 rounded-t-lg" />
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <Skeleton className="h-20 w-16 rounded-t-lg" />
          <Skeleton className="h-3 w-20" />
        </div>
      </CardContent>
    </Card>
  )
}

export function IncomeVsExpenseChart() {
  const {
    getTotalIncome,
    getTotalExpense,
    getTotalInvestment,
    profile,
    isHydrated,
  } = useFinanceStore()
  const t = useTranslation()

  if (!isHydrated) {
    return <IncomeVsExpenseChartSkeleton />
  }

  const income = getTotalIncome()
  const expense = getTotalExpense()
  const investment = getTotalInvestment()

  const data = [
    {
      name: t('summary.income'),
      valor: income,
      fill: 'var(--income)',
    },
    {
      name: t('summary.expenses'),
      valor: expense,
      fill: 'var(--expense)',
    },
    {
      name: t('summary.investments'),
      valor: investment,
      fill: 'var(--investment)',
    },
  ]

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload?: any[]
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{payload[0].payload.name}</p>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(payload[0].value, profile.currency)}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {t('chart.incomeVsExpenses')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="name"
              stroke="var(--muted-foreground)"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="var(--muted-foreground)"
              style={{ fontSize: '12px' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="valor" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
