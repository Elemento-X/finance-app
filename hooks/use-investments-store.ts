import { create } from "zustand"
import { toast } from "sonner"
import type { Asset, AssetWithMarket, PortfolioSummary, Alert } from "@/lib/investment-types"
import { investmentsStorageService } from "@/services/investments-storage"
import { marketDataService, type MarketDataResult } from "@/services/market-data"
import { investmentsCalculationsService } from "@/services/investments-calculations"
import { getTranslation } from "@/lib/i18n"
import { syncService } from "@/services/sync"

interface InvestmentsStore {
  assets: Asset[]
  assetsWithMarket: AssetWithMarket[]
  portfolioSummary: PortfolioSummary | null
  alerts: Alert[]
  isLoading: boolean
  lastUpdate: number | null
  failedAssets: string[] // Track assets that failed to fetch

  // Actions
  loadAssets: () => void
  addAsset: (asset: Omit<Asset, "id" | "createdAt">) => void
  updateAsset: (id: string, updates: Partial<Asset>) => void
  deleteAsset: (id: string) => void
  refreshMarketData: () => Promise<void>
  clearAllData: () => void
}

export const useInvestmentsStore = create<InvestmentsStore>((set, get) => ({
  assets: [],
  assetsWithMarket: [],
  portfolioSummary: null,
  alerts: [],
  isLoading: false,
  lastUpdate: null,
  failedAssets: [],

  loadAssets: () => {
    const assets = investmentsStorageService.getAssets()
    set({ assets })
    // Auto-refresh market data on load
    get().refreshMarketData()
  },

  addAsset: (assetData) => {
    const newAsset: Asset = {
      ...assetData,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    }
    investmentsStorageService.addAsset(newAsset)
    syncService.queueAsset('create', newAsset)
    set(state => ({ assets: [...state.assets, newAsset] }))
    get().refreshMarketData()
  },

  updateAsset: (id, updates) => {
    const { assets } = get()
    const existingAsset = assets.find(a => a.id === id)
    if (!existingAsset) return

    const updatedAsset = { ...existingAsset, ...updates }
    investmentsStorageService.updateAsset(id, updates)
    syncService.queueAsset('update', { id, ...updates })
    set(state => ({
      assets: state.assets.map(a => a.id === id ? updatedAsset : a)
    }))
    get().refreshMarketData()
  },

  deleteAsset: (id) => {
    const { assets } = get()
    const asset = assets.find(a => a.id === id)
    investmentsStorageService.deleteAsset(id)
    if (asset) {
      syncService.queueAsset('delete', asset)
    }
    set(state => ({ assets: state.assets.filter(a => a.id !== id) }))
    get().refreshMarketData()
  },

  refreshMarketData: async () => {
    const { assets } = get()
    if (assets.length === 0) {
      set({
        assetsWithMarket: [],
        portfolioSummary: null,
        alerts: [],
        lastUpdate: Date.now(),
        failedAssets: [],
      })
      return
    }

    set({ isLoading: true })

    try {
      const failedSymbols: string[] = []
      const notFoundSymbols: string[] = []

      // Fetch market data for all assets
      const assetsWithMarketPromises = assets.map(async (asset) => {
        const result: MarketDataResult = await marketDataService.fetchMarketData(asset.symbol, asset.assetClass)

        // Track errors by type
        if (result.error) {
          if (result.error.type === 'not_found') {
            notFoundSymbols.push(asset.symbol)
          } else if (result.error.type === 'network' || result.error.type === 'invalid_response') {
            failedSymbols.push(asset.symbol)
          }
          // fixed_income is not an error - just no data available
        }

        const currentPrice = result.data?.currentPrice || asset.averagePrice
        const currentValue = asset.quantity * currentPrice
        const capitalGain = currentValue - asset.totalInvested
        const returnPercentage = asset.totalInvested > 0
          ? (capitalGain / asset.totalInvested) * 100
          : 0

        return {
          ...asset,
          marketData: result.data ?? undefined,
          currentValue,
          capitalGain,
          returnPercentage,
        }
      })

      const assetsWithMarket = await Promise.all(assetsWithMarketPromises)
      const portfolioSummary = investmentsCalculationsService.calculatePortfolioSummary(assetsWithMarket)
      const alerts = investmentsCalculationsService.generateAlerts(assetsWithMarket, portfolioSummary)

      // Show error notifications
      if (notFoundSymbols.length > 0) {
        toast.error(getTranslation("marketData.noDataAvailable"), {
          description: getTranslation("marketData.noDataAvailableDesc", {
            symbol: notFoundSymbols.join(", ")
          }),
          duration: 5000,
        })
      }

      if (failedSymbols.length > 0) {
        toast.warning(getTranslation("marketData.partialError"), {
          description: getTranslation("marketData.partialErrorDesc", {
            count: failedSymbols.length.toString()
          }),
          duration: 4000,
        })
      }

      set({
        assetsWithMarket,
        portfolioSummary,
        alerts,
        isLoading: false,
        lastUpdate: Date.now(),
        failedAssets: [...failedSymbols, ...notFoundSymbols],
      })
    } catch (error) {
      console.error("[Investments] Failed to refresh market data:", error)

      toast.error(getTranslation("marketData.fetchError"), {
        description: getTranslation("marketData.fetchErrorDesc", {
          symbols: "all assets"
        }),
        duration: 5000,
      })

      set({
        isLoading: false,
        failedAssets: assets.map(a => a.symbol)
      })
    }
  },

  clearAllData: () => {
    investmentsStorageService.clearAssets()
    marketDataService.clearCache()
    set({
      assets: [],
      assetsWithMarket: [],
      portfolioSummary: null,
      alerts: [],
      lastUpdate: null,
      failedAssets: [],
    })
  },
}))
