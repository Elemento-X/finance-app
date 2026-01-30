'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useFinanceStore } from '@/hooks/use-finance-store'
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'
import { formatCurrency } from '@/utils/formatters'
import { useTranslation } from '@/lib/i18n'

// Fixed heights for skeleton bars to avoid hydration mismatch
const SKELETON_BAR_HEIGHTS = ['60%', '80%', '45%', '70%', '55%', '75%']

function MonthlyEvolutionChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent className="h-[300px] flex flex-col justify-end gap-4 pt-4">
        {/* Chart area simulation */}
        <div className="flex-1 flex items-end gap-1">
          {SKELETON_BAR_HEIGHTS.map((height, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <Skeleton className="w-full rounded-t" style={{ height }} />
            </div>
          ))}
        </div>
        {/* X axis labels */}
        <div className="flex justify-between px-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-3 w-12" />
          ))}
        </div>
        {/* Legend */}
        <div className="flex justify-center gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-4 w-20" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function MonthlyEvolutionChart() {
  const { getMonthlyEvolution, profile, isHydrated } = useFinanceStore()
  const t = useTranslation()

  if (!isHydrated) {
    return <MonthlyEvolutionChartSkeleton />
  }

  const data = getMonthlyEvolution()

  if (
    data.length === 0 ||
    data.every((d) => d.income === 0 && d.expense === 0 && d.investment === 0)
  ) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('chart.monthlyEvolution')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <p className="text-sm text-muted-foreground">{t('chart.noData')}</p>
        </CardContent>
      </Card>
    )
  }

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
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg space-y-1">
          <p className="font-medium">{payload[0].payload.month}</p>
          {payload.map(
            (entry: { name: string; value: number; color: string }) => (
              <p
                key={entry.name}
                className="text-sm"
                style={{ color: entry.color }}
              >
                {entry.name}: {formatCurrency(entry.value, profile.currency)}
              </p>
            ),
          )}
        </div>
      )
    }
    return null
  }

  const incomeColor = '#10b981' // green
  const expenseColor = '#ef4444' // red
  const investmentColor = '#3b82f6' // blue

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {t('chart.monthlyEvolution')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={incomeColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={incomeColor} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={expenseColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={expenseColor} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorInvestment" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={investmentColor}
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor={investmentColor}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="month"
              stroke="var(--muted-foreground)"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="var(--muted-foreground)"
              style={{ fontSize: '12px' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Area
              type="monotone"
              dataKey="income"
              name={t('summary.income')}
              stroke={incomeColor}
              fillOpacity={1}
              fill="url(#colorIncome)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="expense"
              name={t('summary.expenses')}
              stroke={expenseColor}
              fillOpacity={1}
              fill="url(#colorExpense)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="investment"
              name={t('summary.investments')}
              stroke={investmentColor}
              fillOpacity={1}
              fill="url(#colorInvestment)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
