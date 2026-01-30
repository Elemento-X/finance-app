export type AssetClass = 'stocks' | 'fiis' | 'fixed-income' | 'etfs' | 'crypto'

export type ARCACategory =
  | 'fixed-income'
  | 'variable-income'
  | 'etfs'
  | 'crypto'

export interface Asset {
  id: string
  symbol: string // Ticker symbol
  name: string
  assetClass: AssetClass
  quantity: number
  averagePrice: number // User's average purchase price
  totalInvested: number // Total amount invested
  purchaseDate: string
  createdAt: number
}

export interface MarketData {
  symbol: string
  currentPrice: number
  dailyChange: number // Percentage
  currency: string
  lastUpdate: number
  // Additional metrics
  dividendYield?: number
  priceToBook?: number // P/VP
  vacancy?: number // For FIIs
  marketCap?: number
}

export interface AssetWithMarket extends Asset {
  marketData?: MarketData
  currentValue: number // quantity * currentPrice
  capitalGain: number // currentValue - totalInvested
  returnPercentage: number // (capitalGain / totalInvested) * 100
}

export interface PortfolioSummary {
  totalInvested: number
  currentValue: number
  totalGain: number
  returnPercentage: number
  byAssetClass: Record<
    AssetClass,
    {
      invested: number
      currentValue: number
      gain: number
      percentage: number // Of total portfolio
    }
  >
}

export interface ARCAAllocation {
  target: Record<ARCACategory, number> // Target percentage
  current: Record<ARCACategory, number> // Current percentage
  difference: Record<ARCACategory, number> // Difference
  status: Record<ARCACategory, 'ideal' | 'below' | 'above'>
}

export interface TopAsset {
  symbol: string
  name: string
  assetClass: AssetClass
  score: number
  metrics: {
    dividendYield?: number
    priceToBook?: number
    stability?: number
  }
  arcaCategory: ARCACategory
}

export interface Alert {
  id: string
  type: 'allocation' | 'volatility' | 'concentration'
  severity: 'info' | 'warning' | 'error'
  message: string
  assetClass?: AssetClass
  timestamp: number
}

// ARCA Strategy - Thiago Nigro
export const ARCA_TARGET: Record<ARCACategory, number> = {
  'fixed-income': 25,
  'variable-income': 25,
  etfs: 25,
  crypto: 25,
}

export const ASSET_CLASS_TO_ARCA: Record<AssetClass, ARCACategory> = {
  stocks: 'variable-income',
  fiis: 'variable-income',
  'fixed-income': 'fixed-income',
  etfs: 'etfs',
  crypto: 'crypto',
}

// NOTE: ASSET_CLASS_LABELS and ARCA_LABELS were removed in favor of i18n translations
// Use t("assetClass.stocks"), t("arcaCategory.fixedIncome"), etc. from lib/i18n.ts
