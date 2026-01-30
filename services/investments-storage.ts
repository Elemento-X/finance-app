// Investments Storage Service - Manages localStorage operations for investment assets
import type { Asset } from '@/lib/investment-types'
import { safeGetItem, safeSetItem } from './migrations'
import { AssetSchema, validateArray } from '@/lib/schemas'
import { getTranslation } from '@/lib/i18n'
import { toast } from 'sonner'

const ASSETS_KEY = 'finance_app_assets'

// Track if we've already shown validation warnings in this session
let assetsValidationWarningShown = false

export const investmentsStorageService = {
  getAssets(): Asset[] {
    const raw = safeGetItem<unknown[]>(ASSETS_KEY, [])
    if (!Array.isArray(raw)) return []

    const { valid, invalidCount } = validateArray(raw, AssetSchema)

    if (invalidCount > 0 && !assetsValidationWarningShown) {
      assetsValidationWarningShown = true
      const typeTranslation = getTranslation('validation.assets')

      toast.warning(getTranslation('validation.corruptedData'), {
        description: getTranslation('validation.corruptedDataDesc', {
          count: invalidCount.toString(),
          type: typeTranslation,
        }),
        duration: 6000,
      })

      // Save only valid assets back to storage
      this.saveAssets(valid as Asset[])
    }

    return valid as Asset[]
  },

  saveAssets(assets: Asset[]): void {
    safeSetItem(ASSETS_KEY, assets)
  },

  addAsset(asset: Asset): void {
    const assets = this.getAssets()
    assets.push(asset)
    this.saveAssets(assets)
  },

  updateAsset(id: string, updates: Partial<Asset>): void {
    const assets = this.getAssets()
    const index = assets.findIndex((a) => a.id === id)
    if (index !== -1) {
      assets[index] = { ...assets[index], ...updates }
      this.saveAssets(assets)
    }
  },

  deleteAsset(id: string): void {
    const assets = this.getAssets()
    const filtered = assets.filter((a) => a.id !== id)
    this.saveAssets(filtered)
  },

  clearAssets(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(ASSETS_KEY)
  },
}
