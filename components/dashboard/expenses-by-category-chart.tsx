'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useFinanceStore } from '@/hooks/use-finance-store'
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'
import { formatCurrency } from '@/utils/formatters'
import { useTranslation } from '@/lib/i18n'

const COLORS = [
  '#8b5cf6',
  '#06b6d4',
  '#f59e0b',
  '#ec4899',
  '#10b981',
  '#6366f1',
  '#ef4444',
]

function ExpensesByCategoryChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center h-[300px] gap-4">
        <Skeleton className="h-40 w-40 rounded-full" />
        <div className="flex gap-2 flex-wrap justify-center">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-4 w-20" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function ExpensesByCategoryChart() {
  const {
    getExpensesByCategory,
    categories,
    profile,
    isHydrated,
    transactions,
    filterPeriod,
  } = useFinanceStore()
  const t = useTranslation()

  // Memoize expensive calculations
  const { data } = useMemo(() => {
    const expensesByCategory = getExpensesByCategory()
    const totalAmount = Object.values(expensesByCategory).reduce(
      (sum, value) => sum + value,
      0,
    )

    const chartData = Object.entries(expensesByCategory)
      .map(([categoryId, value]) => {
        const category = categories.find((c) => c.id === categoryId)
        const percentage = totalAmount > 0 ? (value / totalAmount) * 100 : 0
        return {
          name: category ? category.name : categoryId,
          value,
          percentage,
          icon: category?.icon,
        }
      })
      .sort((a, b) => b.value - a.value)

    return { data: chartData, total: totalAmount }
  }, [transactions, filterPeriod, categories, getExpensesByCategory])

  if (!isHydrated) {
    return <ExpensesByCategoryChartSkeleton />
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('chart.expensesByCategory')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <p className="text-sm text-muted-foreground">
            {t('chart.noExpenses')}
          </p>
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
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">
            {payload[0].payload.icon} {payload[0].name}
          </p>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(payload[0].value, profile.currency)}
          </p>
          <p className="text-sm font-semibold text-primary">
            {payload[0].payload.percentage.toFixed(1)}%
          </p>
        </div>
      )
    }
    return null
  }

  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percentage,
  }: {
    cx: number
    cy: number
    midAngle: number
    innerRadius: number
    outerRadius: number
    percentage: number
  }) => {
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    if (percentage < 5) return null // Don't show label for small slices

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-xs font-bold"
      >
        {`${percentage.toFixed(0)}%`}
      </text>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {t('chart.expensesByCategory')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value, entry: any) =>
                `${entry.payload.icon} ${value} (${entry.payload.percentage.toFixed(1)}%)`
              }
              wrapperStyle={{ fontSize: '12px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
