'use client'

import type React from 'react'

import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { useInvestmentsStore } from '@/hooks/use-investments-store'
import { useFinanceStore } from '@/hooks/use-finance-store'
import { investmentsCalculationsService } from '@/services/investments-calculations'
import { type ARCACategory } from '@/lib/investment-types'
import { TrendingDown, TrendingUp, CheckCircle2, Info } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { useTranslation } from '@/lib/i18n'

function ARCAAllocationSkeleton() {
  return (
    <div className="space-y-6">
      {/* Alert skeleton */}
      <div className="flex items-center gap-2 p-4 border rounded-lg">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 flex-1" />
      </div>

      {/* Charts grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <Card key={i} className="p-6">
            <Skeleton className="h-6 w-40 mb-4" />
            <div className="h-64 flex items-center justify-center">
              <Skeleton className="h-40 w-40 rounded-full" />
            </div>
          </Card>
        ))}
      </div>

      {/* Detailed allocation */}
      <Card className="p-6">
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="space-y-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-3 w-full" />
              <div className="flex justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Recommendations */}
      <Card className="p-6">
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-2 p-4 border rounded-lg"
            >
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

const ARCA_COLORS: Record<ARCACategory, string> = {
  'fixed-income': '#22c55e',
  'variable-income': '#ef4444',
  etfs: '#3b82f6',
  crypto: '#f59e0b',
}

// Map ARCA category to translation key
const ARCA_CATEGORY_KEYS: Record<ARCACategory, string> = {
  'fixed-income': 'arcaCategory.fixedIncome',
  'variable-income': 'arcaCategory.variableIncome',
  etfs: 'arcaCategory.etfs',
  crypto: 'arcaCategory.crypto',
}

interface ARCAAllocationViewProps {
  isLoading?: boolean
}

export function ARCAAllocationView({ isLoading }: ARCAAllocationViewProps) {
  const { portfolioSummary } = useInvestmentsStore()
  const { profile } = useFinanceStore()
  const t = useTranslation()
  const locale = profile.language === 'pt' ? 'pt-BR' : 'en-US'

  const formatCurrency = (value: number) => {
    return value.toLocaleString(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  const getArcaLabel = (category: ARCACategory) => {
    return t(
      ARCA_CATEGORY_KEYS[
        category
      ] as keyof typeof import('@/lib/i18n').translations.en,
    )
  }

  if (isLoading) {
    return <ARCAAllocationSkeleton />
  }

  if (!portfolioSummary) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">
          {t('arca.noInvestments')}
        </p>
      </Card>
    )
  }

  const arcaAllocation =
    investmentsCalculationsService.calculateARCAAllocation(portfolioSummary)

  const chartData = Object.entries(arcaAllocation.current).map(
    ([category, percentage]) => ({
      name: getArcaLabel(category as ARCACategory),
      value: percentage,
      fill: ARCA_COLORS[category as ARCACategory],
    }),
  )

  const targetChartData = Object.entries(arcaAllocation.target).map(
    ([category, percentage]) => ({
      name: getArcaLabel(category as ARCACategory),
      value: percentage,
      fill: ARCA_COLORS[category as ARCACategory],
    }),
  )

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>{t('arca.strategy')}</AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Current Allocation */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {t('arca.currentAllocation')}
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => `${value.toFixed(2)}%`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Target Allocation */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">{t('arca.arcaTarget')}</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={targetChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {targetChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Detailed Allocation Status */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">
          {t('arca.allocationDetails')}
        </h3>
        <div className="space-y-6">
          {Object.entries(arcaAllocation.current).map(
            ([category, currentPercentage]) => {
              const categoryKey = category as ARCACategory
              const target = arcaAllocation.target[categoryKey]
              const difference = arcaAllocation.difference[categoryKey]
              const status = arcaAllocation.status[categoryKey]

              const StatusIcon =
                status === 'ideal'
                  ? CheckCircle2
                  : difference < 0
                    ? TrendingDown
                    : TrendingUp

              const statusColor =
                status === 'ideal'
                  ? 'text-income'
                  : status === 'below'
                    ? 'text-warning'
                    : 'text-expense'

              const statusText =
                status === 'ideal'
                  ? t('arca.onTarget')
                  : status === 'below'
                    ? t('arca.below', {
                        percent: Math.abs(difference).toFixed(1),
                      })
                    : t('arca.above', {
                        percent: Math.abs(difference).toFixed(1),
                      })

              return (
                <div key={category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">
                        {getArcaLabel(categoryKey)}
                      </h4>
                      <Badge
                        variant={status === 'ideal' ? 'default' : 'outline'}
                        className={statusColor}
                      >
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusText}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {currentPercentage.toFixed(1)}% / {target}%
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Progress
                      value={(currentPercentage / target) * 100}
                      className="h-3"
                      style={
                        {
                          '--progress-background': ARCA_COLORS[categoryKey],
                        } as React.CSSProperties
                      }
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        {t('arca.current')}: {currentPercentage.toFixed(2)}%
                      </span>
                      <span>
                        {t('arca.target')}: {target}%
                      </span>
                    </div>
                  </div>
                </div>
              )
            },
          )}
        </div>
      </Card>

      {/* Recommendations */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">
          {t('arca.recommendations')}
        </h3>
        <div className="space-y-3">
          {Object.entries(arcaAllocation.status).map(([category, status]) => {
            if (status === 'ideal') return null

            const categoryKey = category as ARCACategory
            const difference = arcaAllocation.difference[categoryKey]
            const currentValue =
              portfolioSummary.currentValue *
              (arcaAllocation.current[categoryKey] / 100)
            const targetValue = portfolioSummary.currentValue * 0.25
            const adjustment = targetValue - currentValue
            const categoryName = getArcaLabel(categoryKey)

            return (
              <Alert key={category}>
                {status === 'below' ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <AlertDescription>
                  <span className="font-medium">{categoryName}</span>{' '}
                  {status === 'below' ? t('arca.isBelow') : t('arca.isAbove')}{' '}
                  {Math.abs(difference).toFixed(1)}%.{' '}
                  {status === 'below'
                    ? `${t('arca.considerInvesting')} ${profile.currency} ${formatCurrency(Math.abs(adjustment))} ${t('arca.more')}.`
                    : `${t('arca.considerReducing')} ${profile.currency} ${formatCurrency(Math.abs(adjustment))}.`}
                </AlertDescription>
              </Alert>
            )
          })}

          {Object.values(arcaAllocation.status).every((s) => s === 'ideal') && (
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-income" />
              <AlertDescription className="text-income">
                {t('arca.perfectBalance')}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </Card>
    </div>
  )
}
