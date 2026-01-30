'use client'

import { useMemo } from 'react'
import { TrendingDown, TrendingUp, Minus, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useFinanceStore } from '@/hooks/use-finance-store'
import {
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { formatCurrency } from '@/utils/formatters'
import { useTranslation } from '@/lib/i18n'

function TrendChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-44" />
      </CardHeader>
      <CardContent className="h-[280px] flex flex-col gap-4">
        <Skeleton className="h-6 w-40" />
        <div className="flex-1">
          <Skeleton className="h-full w-full" />
        </div>
        <Skeleton className="h-4 w-64" />
      </CardContent>
    </Card>
  )
}

function calculateTrend(values: number[]) {
  const n = values.length
  if (n < 2) {
    return { slope: 0, forecast: values[values.length - 1] ?? 0 }
  }

  let sumX = 0
  let sumY = 0
  let sumXY = 0
  let sumX2 = 0

  for (let i = 0; i < n; i++) {
    sumX += i
    sumY += values[i]
    sumXY += i * values[i]
    sumX2 += i * i
  }

  const denominator = n * sumX2 - sumX * sumX
  const slope = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator
  const forecast = values[n - 1] + slope

  return { slope, forecast }
}

export function TrendChart() {
  const { getMonthlyEvolution, profile, isHydrated } = useFinanceStore()
  const t = useTranslation()

  const data = useMemo(() => getMonthlyEvolution(), [getMonthlyEvolution])

  const balances = data.map((d) => d.balance)
  const hasData = balances.some((value) => value !== 0)

  const { slope, forecast } = useMemo(() => calculateTrend(balances), [balances])

  const avgAbs = balances.length
    ? balances.reduce((sum, v) => sum + Math.abs(v), 0) / balances.length
    : 0
  const threshold = avgAbs === 0 ? 1 : Math.max(avgAbs * 0.1, 500)

  const trendType = slope > threshold ? 'up' : slope < -threshold ? 'down' : 'flat'

  const trendLabel =
    trendType === 'up'
      ? t('chart.trendUp')
      : trendType === 'down'
        ? t('chart.trendDown')
        : t('chart.trendFlat')

  const trendColor =
    trendType === 'up'
      ? 'text-income'
      : trendType === 'down'
        ? 'text-expense'
        : 'text-muted-foreground'

  const TrendIcon = trendType === 'up' ? TrendingUp : trendType === 'down' ? TrendingDown : Minus

  if (!isHydrated) {
    return <TrendChartSkeleton />
  }

  if (!hasData) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{t('chart.trendTitle')}</CardTitle>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            title={t('chart.trendInfo')}
            aria-label={t('chart.trendInfo')}
          >
            <Info className="size-4" />
          </button>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[280px]">
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
      const item = payload[0].payload
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg space-y-1">
          <p className="font-medium">{item.month}</p>
          <p className="text-sm text-muted-foreground">
            {t('summary.balance')}: {formatCurrency(item.balance, profile.currency)}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{t('chart.trendTitle')}</CardTitle>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground"
          title={t('chart.trendInfo')}
          aria-label={t('chart.trendInfo')}
        >
          <Info className="size-4" />
        </button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div className={`flex items-center gap-2 font-medium ${trendColor}`}>
            <TrendIcon className="size-4" />
            <span>{trendLabel}</span>
          </div>
          <span className="text-muted-foreground">{t('chart.trendSubtitle')}</span>
        </div>

        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data}>
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
            <Line
              type="monotone"
              dataKey="balance"
              name={t('summary.balance')}
              stroke="var(--primary)"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>

        <p className="text-sm text-muted-foreground">
          {t('chart.trendPrediction', {
            amount: formatCurrency(forecast, profile.currency),
          })}
        </p>
      </CardContent>
    </Card>
  )
}
