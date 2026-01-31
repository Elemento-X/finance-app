'use client'

import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useInvestmentsStore } from '@/hooks/use-investments-store'
import { TrendingUp, TrendingDown, DollarSign, Target } from 'lucide-react'
import { useFinanceStore } from '@/hooks/use-finance-store'
import { useTranslation } from '@/lib/i18n'
import { formatCurrency } from '@/utils/formatters'

function PortfolioOverviewSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-8 w-32 mt-2" />
        </Card>
      ))}
    </div>
  )
}

interface PortfolioOverviewProps {
  isLoading?: boolean
}

export function PortfolioOverview({ isLoading }: PortfolioOverviewProps) {
  const { portfolioSummary } = useInvestmentsStore()
  const { profile } = useFinanceStore()
  const t = useTranslation()

  if (isLoading) {
    return <PortfolioOverviewSkeleton />
  }

  if (!portfolioSummary) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">
          {t('portfolio.noAssets')}
        </p>
      </Card>
    )
  }

  const isProfit = portfolioSummary.totalGain >= 0

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <DollarSign className="h-4 w-4" />
          <span className="text-sm font-medium">
            {t('portfolio.totalInvested')}
          </span>
        </div>
        <p className="text-2xl font-bold">
          {formatCurrency(portfolioSummary.totalInvested, profile.currency)}
        </p>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <Target className="h-4 w-4" />
          <span className="text-sm font-medium">
            {t('portfolio.currentValue')}
          </span>
        </div>
        <p className="text-2xl font-bold">
          {formatCurrency(portfolioSummary.currentValue, profile.currency)}
        </p>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          {isProfit ? (
            <TrendingUp className="h-4 w-4 text-income" />
          ) : (
            <TrendingDown className="h-4 w-4 text-expense" />
          )}
          <span className="text-sm font-medium">
            {t('portfolio.capitalGain')}
          </span>
        </div>
        <p
          className={`text-2xl font-bold ${isProfit ? 'text-income' : 'text-expense'}`}
        >
          {formatCurrency(portfolioSummary.totalGain, profile.currency)}
        </p>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <TrendingUp className="h-4 w-4" />
          <span className="text-sm font-medium">{t('portfolio.return')}</span>
        </div>
        <p
          className={`text-2xl font-bold ${isProfit ? 'text-income' : 'text-expense'}`}
        >
          {portfolioSummary.returnPercentage.toFixed(2)}%
        </p>
      </Card>
    </div>
  )
}
