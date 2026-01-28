"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useInvestmentsStore } from "@/hooks/use-investments-store"
import { useFinanceStore } from "@/hooks/use-finance-store"
import type { AssetClass } from "@/lib/investment-types"
import { useTranslation } from "@/lib/i18n"
import { formatCurrencyInput } from "@/utils/formatters"

interface AssetFormProps {
  assetClass: AssetClass
  assetId?: string
  onClose: () => void
  onSuccess: () => void
}

// Map asset class to translation key
const ASSET_CLASS_TRANSLATION_KEYS: Record<AssetClass, string> = {
  stocks: "assetClass.stocks",
  fiis: "assetClass.fiis",
  "fixed-income": "assetClass.fixedIncome",
  etfs: "assetClass.etfs",
  crypto: "assetClass.crypto",
}

export function AssetForm({ assetClass, assetId, onClose, onSuccess }: AssetFormProps) {
  const { assets, addAsset, updateAsset } = useInvestmentsStore()
  const { profile } = useFinanceStore()
  const t = useTranslation()
  const existingAsset = assetId ? assets.find((a) => a.id === assetId) : null

  const [formData, setFormData] = useState({
    symbol: existingAsset?.symbol || "",
    name: existingAsset?.name || "",
    quantity: existingAsset?.quantity.toString() || "",
    averagePrice: existingAsset ? formatCurrencyInput((existingAsset.averagePrice * 100).toString(), profile.currency) : "",
    purchaseDate: existingAsset?.purchaseDate || new Date().toISOString().split("T")[0],
  })

  const handleAveragePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrencyInput(e.target.value, profile.currency)
    setFormData({ ...formData, averagePrice: formatted })
  }

  const parseAveragePrice = (value: string): number => {
    // Remove currency symbol and spaces, then parse
    const numericValue = value.replace(/[^\d,]/g, "")
    return Number.parseFloat(numericValue.replace(/\./g, "").replace(",", ".")) || 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const quantity = Number.parseFloat(formData.quantity)
    const averagePrice = parseAveragePrice(formData.averagePrice)
    const totalInvested = quantity * averagePrice

    if (assetId) {
      updateAsset(assetId, {
        symbol: formData.symbol.toUpperCase(),
        name: formData.name,
        quantity,
        averagePrice,
        totalInvested,
        purchaseDate: formData.purchaseDate,
      })
    } else {
      addAsset({
        symbol: formData.symbol.toUpperCase(),
        name: formData.name,
        assetClass,
        quantity,
        averagePrice,
        totalInvested,
        purchaseDate: formData.purchaseDate,
      })
    }

    onSuccess()
  }

  const isValid =
    formData.symbol.trim() &&
    formData.name.trim() &&
    Number.parseFloat(formData.quantity) > 0 &&
    parseAveragePrice(formData.averagePrice) > 0

  const assetClassLabel = t(ASSET_CLASS_TRANSLATION_KEYS[assetClass] as keyof typeof import("@/lib/i18n").translations.en)

  const currencySymbol = profile.currency === "BRL" ? "R$" : profile.currency === "EUR" ? "€" : "$"

  const totalInvested = Number.parseFloat(formData.quantity || "0") * parseAveragePrice(formData.averagePrice)

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {assetId ? t("asset.edit") : t("asset.add")} {assetClassLabel}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="symbol">{t("asset.symbol")}</Label>
            <Input
              id="symbol"
              value={formData.symbol}
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
              placeholder={t("asset.symbolPlaceholder")}
              required
            />
          </div>

          <div>
            <Label htmlFor="name">{t("asset.name")}</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t("asset.namePlaceholder")}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quantity">{t("asset.quantity")}</Label>
              <Input
                id="quantity"
                type="number"
                step="any"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="0"
                required
              />
            </div>

            <div>
              <Label htmlFor="averagePrice">{t("asset.averagePrice")}</Label>
              <Input
                id="averagePrice"
                type="text"
                value={formData.averagePrice}
                onChange={handleAveragePriceChange}
                placeholder={`${currencySymbol} 0,00`}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="purchaseDate">{t("asset.purchaseDate")}</Label>
            <Input
              id="purchaseDate"
              type="date"
              value={formData.purchaseDate}
              onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
              className="dark:[color-scheme:dark]"
              required
            />
          </div>

          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm text-muted-foreground">{t("asset.totalInvested")}</p>
            <p className="text-lg font-semibold">
              {currencySymbol} {totalInvested.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={!isValid}>
              {assetId ? t("asset.updateAsset") : t("asset.addAsset")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
