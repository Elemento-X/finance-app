"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2, TrendingUp, TrendingDown } from "lucide-react"
import { useInvestmentsStore } from "@/hooks/use-investments-store"
import { useFinanceStore } from "@/hooks/use-finance-store"
import type { AssetClass } from "@/lib/investment-types"
import { AssetForm } from "./asset-form"
import { useTranslation } from "@/lib/i18n"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

function AssetsListSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-4 w-48 mb-3" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(8)].map((_, j) => (
                  <div key={j}>
                    <Skeleton className="h-3 w-16 mb-1" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

interface AssetsListProps {
  assetClass: AssetClass
  isLoading?: boolean
}

// Map asset class to translation key
const ASSET_CLASS_KEYS: Record<AssetClass, string> = {
  stocks: "assetClass.stocks",
  fiis: "assetClass.fiis",
  "fixed-income": "assetClass.fixedIncome",
  etfs: "assetClass.etfs",
  crypto: "assetClass.crypto",
}

export function AssetsList({ assetClass, isLoading }: AssetsListProps) {
  const { assetsWithMarket, deleteAsset, refreshMarketData } = useInvestmentsStore()
  const { profile } = useFinanceStore()
  const t = useTranslation()
  const [editingAsset, setEditingAsset] = useState<string | null>(null)
  const [deletingAsset, setDeletingAsset] = useState<string | null>(null)

  const locale = profile.language === "pt" ? "pt-BR" : "en-US"
  const filteredAssets = assetsWithMarket.filter((a) => a.assetClass === assetClass)

  const formatCurrency = (value: number) => {
    return value.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  if (isLoading) {
    return <AssetsListSkeleton />
  }

  if (filteredAssets.length === 0) {
    const assetClassName = t(ASSET_CLASS_KEYS[assetClass] as keyof typeof import("@/lib/i18n").translations.en)
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t("assets.noAssets", { class: assetClassName })}
      </div>
    )
  }

  const handleDelete = () => {
    if (deletingAsset) {
      deleteAsset(deletingAsset)
      setDeletingAsset(null)
      refreshMarketData()
    }
  }

  return (
    <>
      <div className="space-y-3">
        {filteredAssets.map((asset) => {
          const isProfit = asset.capitalGain >= 0
          const hasMarketData = !!asset.marketData

          return (
            <Card key={asset.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg">{asset.symbol}</h3>
                    {hasMarketData && (
                      <span
                        className={`text-sm flex items-center gap-1 ${
                          asset.marketData!.dailyChange >= 0 ? "text-income" : "text-expense"
                        }`}
                      >
                        {asset.marketData!.dailyChange >= 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {asset.marketData!.dailyChange.toFixed(2)}%
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{asset.name}</p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">{t("assets.quantity")}</span>
                      <p className="font-medium">{asset.quantity}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t("assets.avgPrice")}</span>
                      <p className="font-medium">
                        {profile.currency} {formatCurrency(asset.averagePrice)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t("assets.currentPrice")}</span>
                      <p className="font-medium">
                        {profile.currency}{" "}
                        {hasMarketData ? formatCurrency(asset.marketData!.currentPrice) : formatCurrency(asset.averagePrice)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t("assets.invested")}</span>
                      <p className="font-medium">
                        {profile.currency} {formatCurrency(asset.totalInvested)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t("assets.currentValue")}</span>
                      <p className="font-medium">
                        {profile.currency} {formatCurrency(asset.currentValue)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t("assets.gainLoss")}</span>
                      <p className={`font-medium ${isProfit ? "text-income" : "text-expense"}`}>
                        {profile.currency} {formatCurrency(asset.capitalGain)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t("assets.return")}</span>
                      <p className={`font-medium ${isProfit ? "text-income" : "text-expense"}`}>
                        {asset.returnPercentage.toFixed(2)}%
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t("assets.purchaseDate")}</span>
                      <p className="font-medium">{new Date(asset.purchaseDate).toLocaleDateString(locale)}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setEditingAsset(asset.id)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeletingAsset(asset.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {editingAsset && (
        <AssetForm
          assetId={editingAsset}
          assetClass={assetClass}
          onClose={() => setEditingAsset(null)}
          onSuccess={() => {
            setEditingAsset(null)
            refreshMarketData()
          }}
        />
      )}

      <AlertDialog open={!!deletingAsset} onOpenChange={() => setDeletingAsset(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("assets.deleteAsset")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("assets.confirmDelete")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{t("common.delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
