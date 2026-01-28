// Investments Calculations Service - Portfolio calculations and ARCA allocation
import {
  type ARCAAllocation,
  type ARCACategory,
  ARCA_TARGET,
  ASSET_CLASS_TO_ARCA,
  type Alert,
  type AssetClass,
  type AssetWithMarket,
  type PortfolioSummary,
} from '@/lib/investment-types'
import { getTranslation } from '@/lib/i18n'

// Map ARCA category to translation key
const ARCA_CATEGORY_KEYS: Record<ARCACategory, string> = {
  'fixed-income': 'arcaCategory.fixedIncome',
  'variable-income': 'arcaCategory.variableIncome',
  'etfs': 'arcaCategory.etfs',
  'crypto': 'arcaCategory.crypto',
}

export const investmentsCalculationsService = {
  calculatePortfolioSummary(assets: AssetWithMarket[]): PortfolioSummary {
    const totalInvested = assets.reduce((sum, asset) => sum + asset.totalInvested, 0)
    const currentValue = assets.reduce((sum, asset) => sum + asset.currentValue, 0)
    const totalGain = currentValue - totalInvested
    const returnPercentage = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0

    const byAssetClass: PortfolioSummary['byAssetClass'] = {
      stocks: { invested: 0, currentValue: 0, gain: 0, percentage: 0 },
      fiis: { invested: 0, currentValue: 0, gain: 0, percentage: 0 },
      'fixed-income': { invested: 0, currentValue: 0, gain: 0, percentage: 0 },
      etfs: { invested: 0, currentValue: 0, gain: 0, percentage: 0 },
      crypto: { invested: 0, currentValue: 0, gain: 0, percentage: 0 },
    }

    assets.forEach((asset) => {
      const classData = byAssetClass[asset.assetClass]
      classData.invested += asset.totalInvested
      classData.currentValue += asset.currentValue
      classData.gain += asset.capitalGain
    })

    Object.keys(byAssetClass).forEach((key) => {
      const classKey = key as AssetClass
      byAssetClass[classKey].percentage =
        currentValue > 0 ? (byAssetClass[classKey].currentValue / currentValue) * 100 : 0
    })

    return {
      totalInvested,
      currentValue,
      totalGain,
      returnPercentage,
      byAssetClass,
    }
  },

  calculateARCAAllocation(summary: PortfolioSummary): ARCAAllocation {
    const current: Record<ARCACategory, number> = {
      'fixed-income': 0,
      'variable-income': 0,
      etfs: 0,
      crypto: 0,
    }

    Object.entries(summary.byAssetClass).forEach(([assetClass, data]) => {
      const arcaCategory = ASSET_CLASS_TO_ARCA[assetClass as AssetClass]
      current[arcaCategory] += data.currentValue
    })

    const total = summary.currentValue
    Object.keys(current).forEach((key) => {
      const categoryKey = key as ARCACategory
      current[categoryKey] = total > 0 ? (current[categoryKey] / total) * 100 : 0
    })

    const difference: Record<ARCACategory, number> = {
      'fixed-income': current['fixed-income'] - ARCA_TARGET['fixed-income'],
      'variable-income': current['variable-income'] - ARCA_TARGET['variable-income'],
      etfs: current['etfs'] - ARCA_TARGET['etfs'],
      crypto: current['crypto'] - ARCA_TARGET['crypto'],
    }

    const status: Record<ARCACategory, 'ideal' | 'below' | 'above'> = {
      'fixed-income': this.getStatus(difference['fixed-income']),
      'variable-income': this.getStatus(difference['variable-income']),
      etfs: this.getStatus(difference['etfs']),
      crypto: this.getStatus(difference['crypto']),
    }

    return {
      target: ARCA_TARGET,
      current,
      difference,
      status,
    }
  },

  getStatus(diff: number): 'ideal' | 'below' | 'above' {
    const tolerance = 5
    if (Math.abs(diff) <= tolerance) return 'ideal'
    return diff < 0 ? 'below' : 'above'
  },

  generateAlerts(assets: AssetWithMarket[], summary: PortfolioSummary): Alert[] {
    const alerts: Alert[] = []
    const arcaAllocation = this.calculateARCAAllocation(summary)

    // ARCA allocation alerts
    Object.entries(arcaAllocation.status).forEach(([category, status]) => {
      if (status !== 'ideal') {
        const diff = arcaAllocation.difference[category as ARCACategory]
        const categoryKey = ARCA_CATEGORY_KEYS[category as ARCACategory]
        const categoryName = getTranslation(categoryKey as keyof typeof import('@/lib/i18n').translations.en)

        const messageKey = status === 'below' ? 'alerts.arcaBelow' : 'alerts.arcaAbove'
        const message = getTranslation(messageKey as keyof typeof import('@/lib/i18n').translations.en, {
          category: categoryName,
          percent: Math.abs(diff).toFixed(1),
        })

        alerts.push({
          id: `arca-${category}-${Date.now()}`,
          type: 'allocation',
          severity: Math.abs(diff) > 10 ? 'warning' : 'info',
          message,
          timestamp: Date.now(),
        })
      }
    })

    // Volatility alerts
    assets.forEach((asset) => {
      if (asset.marketData && Math.abs(asset.marketData.dailyChange) > 10) {
        const message = getTranslation('alerts.highVolatility', {
          symbol: asset.symbol,
          change: asset.marketData.dailyChange.toFixed(2),
        })

        alerts.push({
          id: `volatility-${asset.id}-${Date.now()}`,
          type: 'volatility',
          severity: 'warning',
          message,
          assetClass: asset.assetClass,
          timestamp: Date.now(),
        })
      }
    })

    // Concentration alerts
    assets.forEach((asset) => {
      const percentage =
        summary.currentValue > 0 ? (asset.currentValue / summary.currentValue) * 100 : 0
      if (percentage > 20) {
        const message = getTranslation('alerts.concentration', {
          symbol: asset.symbol,
          percent: percentage.toFixed(1),
        })

        alerts.push({
          id: `concentration-${asset.id}-${Date.now()}`,
          type: 'concentration',
          severity: 'info',
          message,
          assetClass: asset.assetClass,
          timestamp: Date.now(),
        })
      }
    })

    return alerts
  },
}
