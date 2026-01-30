"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, TrendingUp, TrendingDown, RefreshCw, Calculator, ExternalLink } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useTranslation } from "@/lib/i18n"
import { useFinanceStore } from "@/hooks/use-finance-store"
import {
  fetchRadarStocks,
  clearRadarCache,
  getCacheAge,
  formatLargeNumber,
  type StockData,
} from "@/services/brapi"

function RadarStocksSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-8 w-24" />
      </div>

      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Skeleton className="h-10 w-10 rounded" />
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <Skeleton className="h-4 w-48 mb-3" />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {[...Array(12)].map((_, j) => (
                    <div key={j}>
                      <Skeleton className="h-3 w-16 mb-1" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

// Mock data for other asset classes
const OTHER_ASSETS_MOCK = {
  fiis: [
    { symbol: "HGLG11", name: "CSHG Logística", score: 92, dividendYield: 9.2, priceToBook: 1.02, stability: 88, vacancy: 2.1 },
    { symbol: "BTLG11", name: "BTG Pactual Logística", score: 90, dividendYield: 8.8, priceToBook: 0.98, stability: 86, vacancy: 3.5 },
    { symbol: "KNRI11", name: "Kinea Renda Imobiliária", score: 88, dividendYield: 10.5, priceToBook: 0.95, stability: 84, vacancy: 4.2 },
    { symbol: "XPLG11", name: "XP Log", score: 86, dividendYield: 8.5, priceToBook: 1.05, stability: 82, vacancy: 2.8 },
    { symbol: "VISC11", name: "Vinci Shopping Centers", score: 84, dividendYield: 9.8, priceToBook: 0.92, stability: 80, vacancy: 5.1 },
  ],
  "fixed-income": [
    { symbol: "TESOURO SELIC", name: "Tesouro Selic 2029", score: 98, stability: 98, yield: 13.65 },
    { symbol: "CDB 120%", name: "CDB 120% CDI", score: 95, stability: 95, yield: 12.8 },
    { symbol: "TESOURO IPCA+", name: "Tesouro IPCA+ 2029", score: 93, stability: 90, yield: 14.2 },
    { symbol: "LCI", name: "LCI 110% CDI", score: 91, stability: 92, yield: 11.5 },
    { symbol: "LCA", name: "LCA 115% CDI", score: 89, stability: 91, yield: 12.0 },
  ],
  etfs: [
    { symbol: "SPY", name: "SPDR S&P 500 ETF", score: 96, dividendYield: 1.32, stability: 85, expenseRatio: 0.09 },
    { symbol: "VOO", name: "Vanguard S&P 500 ETF", score: 95, dividendYield: 1.35, stability: 85, expenseRatio: 0.03 },
    { symbol: "QQQ", name: "Invesco QQQ Trust", score: 92, dividendYield: 0.52, stability: 78, expenseRatio: 0.2 },
    { symbol: "IWM", name: "iShares Russell 2000 ETF", score: 88, dividendYield: 1.15, stability: 72, expenseRatio: 0.19 },
    { symbol: "VTI", name: "Vanguard Total Stock Market ETF", score: 94, dividendYield: 1.28, stability: 83, expenseRatio: 0.03 },
  ],
  crypto: [
    { symbol: "BTC", name: "Bitcoin", score: 95, stability: 65, marketCap: "1.2T", change24h: 2.5 },
    { symbol: "ETH", name: "Ethereum", score: 92, stability: 62, marketCap: "380B", change24h: 3.2 },
    { symbol: "BNB", name: "Binance Coin", score: 88, stability: 58, marketCap: "95B", change24h: 1.8 },
    { symbol: "SOL", name: "Solana", score: 85, stability: 52, marketCap: "78B", change24h: 5.6 },
    { symbol: "ADA", name: "Cardano", score: 82, stability: 55, marketCap: "42B", change24h: 2.1 },
  ],
}

function GrahamCalculatorModal({
  open,
  onOpenChange,
  symbol,
  peRatio,
  currentPrice,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  symbol: string
  peRatio: number
  currentPrice: number
}) {
  const t = useTranslation()
  const { profile } = useFinanceStore()
  const locale = profile.language === "pt" ? "pt-BR" : "en-US"
  const [pbRatio, setPbRatio] = useState("")

  const pbValue = parseFloat(pbRatio.replace(",", "."))
  const isPBValid = !isNaN(pbValue) && pbValue > 0
  const isPENegative = peRatio <= 0
  const grahamResult = isPBValid && !isPENegative ? peRatio * pbValue : null

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setPbRatio("")
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("radar.grahamTitle")} — {symbol}</DialogTitle>
          <DialogDescription>{t("radar.grahamDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Formula */}
          <p className="text-sm font-medium text-muted-foreground">{t("radar.grahamFormula")}</p>

          {/* P/E field (readonly) */}
          <div>
            <label className="text-sm font-medium block mb-1">{t("radar.grahamPE")}</label>
            <Input
              value={peRatio > 0 ? peRatio.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "N/A"}
              readOnly
              className="bg-muted"
            />
          </div>

          {/* P/B field (manual input) */}
          <div>
            <label className="text-sm font-medium block mb-1">{t("radar.grahamPB")}</label>
            <Input
              type="text"
              inputMode="decimal"
              placeholder={t("radar.grahamPBPlaceholder")}
              value={pbRatio}
              onChange={(e) => setPbRatio(e.target.value)}
            />
          </div>

          {/* Result */}
          {isPENegative && (
            <div className="rounded-md border border-yellow-500/50 bg-yellow-500/10 p-3">
              <p className="text-sm text-yellow-700 dark:text-yellow-400">{t("radar.grahamNegativePE")}</p>
            </div>
          )}

          {!isPENegative && pbRatio !== "" && !isPBValid && (
            <div className="rounded-md border border-yellow-500/50 bg-yellow-500/10 p-3">
              <p className="text-sm text-yellow-700 dark:text-yellow-400">{t("radar.grahamInvalidPB")}</p>
            </div>
          )}

          {grahamResult !== null && (
            <div className={`rounded-md border p-3 ${grahamResult <= 22.5 ? "border-income/50 bg-income/10" : "border-expense/50 bg-expense/10"}`}>
              <p className="text-sm font-medium mb-1">{t("radar.grahamResult")}</p>
              <p className="text-lg font-bold">
                {t("radar.grahamPE").split(" ")[0]} × {t("radar.grahamPB").split(" ")[0]} = {grahamResult.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className={`text-sm mt-1 ${grahamResult <= 22.5 ? "text-income" : "text-expense"}`}>
                {grahamResult <= 22.5 ? t("radar.grahamUndervalued") : t("radar.grahamOvervalued")}
              </p>
            </div>
          )}

          {/* StatusInvest link */}
          <a
            href={`https://statusinvest.com.br/acoes/${symbol.toLowerCase()}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            {t("radar.grahamStatusInvest")}
          </a>

          {/* Explanation */}
          <p className="text-xs text-muted-foreground">{t("radar.grahamExplanation")}</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function BrazilianStocksTab() {
  const t = useTranslation()
  const { profile } = useFinanceStore()
  const locale = profile.language === "pt" ? "pt-BR" : "en-US"

  const [stocks, setStocks] = useState<StockData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cacheAge, setCacheAge] = useState<number | null>(null)

  const formatCurrency = (value: number) => {
    if (value == null || isNaN(value)) return "R$ 0,00"
    return value.toLocaleString(locale, { style: "currency", currency: "BRL" })
  }

  const formatPercent = (value: number) => {
    if (value == null || isNaN(value)) return "0,00%"
    const sign = value >= 0 ? "+" : ""
    return `${sign}${value.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
  }

  const formatNumber = (value: number, decimals: number = 2) => {
    if (value == null || isNaN(value)) return "0"
    return value.toLocaleString(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  }

  const loadStocks = async (forceRefresh: boolean = false) => {
    setIsLoading(true)
    setError(null)

    if (forceRefresh) {
      clearRadarCache()
    }

    try {
      const data = await fetchRadarStocks()
      setStocks(data)
      setCacheAge(getCacheAge())
    } catch (err) {
      setError(t("radar.error"))
      console.error("Failed to fetch stocks:", err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadStocks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Intentionally run only on mount

  const [grahamModal, setGrahamModal] = useState<{ open: boolean; stock: StockData | null }>({
    open: false,
    stock: null,
  })

  if (isLoading) {
    return <RadarStocksSkeleton />
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <AlertCircle className="h-8 w-8 text-expense" />
        <p className="text-expense">{error}</p>
        <Button variant="outline" onClick={() => loadStocks(true)}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {t("radar.refresh")}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Cache indicator and refresh button */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {cacheAge !== null && t("radar.cachedData", { hours: Math.round(cacheAge).toString() })}
        </span>
        <Button variant="ghost" size="sm" onClick={() => loadStocks(true)} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          {t("radar.refresh")}
        </Button>
      </div>

      {/* Stocks list */}
      <div className="space-y-3">
        {stocks.map((stock, index) => (
          <Card key={stock.symbol} className="p-4 hover:bg-accent/50 transition-colors">
            <div className="flex items-start gap-3">
              {/* Ranking number */}
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm shrink-0 ${
                  index < 3 ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}
              >
                {index + 1}
              </div>

              <div className="flex-1 min-w-0">
                {/* Header: Logo + Symbol + Change */}
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {stock.logoUrl && (
                    <Image
                      src={stock.logoUrl}
                      alt={stock.symbol}
                      width={32}
                      height={32}
                      className="rounded"
                      unoptimized
                    />
                  )}
                  <h3 className="font-semibold text-lg">{stock.symbol}</h3>
                  {!stock.error && (
                    <Badge
                      variant="outline"
                      className={stock.changePercent >= 0 ? "text-income border-income" : "text-expense border-expense"}
                    >
                      {stock.changePercent >= 0 ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      {formatPercent(stock.changePercent)}
                    </Badge>
                  )}
                  {stock.error && (
                    <Badge variant="outline" className="text-expense">
                      {t("radar.noData")}
                    </Badge>
                  )}
                </div>

                {/* Company name */}
                <p className="text-sm text-muted-foreground mb-3">{stock.longName}</p>

                {/* All indicators grid */}
                {!stock.error && (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 text-sm">
                      {/* Current Price */}
                      <div>
                        <span className="text-muted-foreground block">{t("radar.currentPrice")}</span>
                        <p className="font-medium">{formatCurrency(stock.currentPrice)}</p>
                      </div>

                      {/* Previous Close */}
                      <div>
                        <span className="text-muted-foreground block">{t("radar.previousClose")}</span>
                        <p className="font-medium">{formatCurrency(stock.previousClose)}</p>
                      </div>

                      {/* Open */}
                      <div>
                        <span className="text-muted-foreground block">{t("radar.open")}</span>
                        <p className="font-medium">{formatCurrency(stock.open)}</p>
                      </div>

                      {/* Change (R$) */}
                      <div>
                        <span className="text-muted-foreground block">{t("radar.change")}</span>
                        <p className={`font-medium ${stock.change >= 0 ? "text-income" : "text-expense"}`}>
                          {stock.change >= 0 ? "+" : ""}{formatCurrency(stock.change)}
                        </p>
                      </div>

                      {/* Day High */}
                      <div>
                        <span className="text-muted-foreground block">{t("radar.dayHigh")}</span>
                        <p className="font-medium">{formatCurrency(stock.dayHigh)}</p>
                      </div>

                      {/* Day Low */}
                      <div>
                        <span className="text-muted-foreground block">{t("radar.dayLow")}</span>
                        <p className="font-medium">{formatCurrency(stock.dayLow)}</p>
                      </div>

                      {/* 52 Week High */}
                      <div>
                        <span className="text-muted-foreground block">{t("radar.weekHigh52")}</span>
                        <p className="font-medium">{formatCurrency(stock.weekHigh52)}</p>
                      </div>

                      {/* 52 Week Low */}
                      <div>
                        <span className="text-muted-foreground block">{t("radar.weekLow52")}</span>
                        <p className="font-medium">{formatCurrency(stock.weekLow52)}</p>
                      </div>

                      {/* Volume */}
                      <div>
                        <span className="text-muted-foreground block">{t("radar.volume")}</span>
                        <p className="font-medium">{formatLargeNumber(stock.volume, locale)}</p>
                      </div>

                      {/* Market Cap */}
                      <div>
                        <span className="text-muted-foreground block">{t("radar.marketCap")}</span>
                        <p className="font-medium">{formatLargeNumber(stock.marketCap, locale)}</p>
                      </div>

                      {/* P/L (P/E Ratio) */}
                      <div>
                        <span className="text-muted-foreground block">{t("radar.peRatio")}</span>
                        <p className="font-medium">
                          {stock.peRatio > 0 ? formatNumber(stock.peRatio) : "N/A"}
                        </p>
                      </div>

                      {/* LPA (EPS) */}
                      <div>
                        <span className="text-muted-foreground block">{t("radar.eps")}</span>
                        <p className="font-medium">
                          {stock.eps !== 0 ? formatCurrency(stock.eps) : "N/A"}
                        </p>
                      </div>
                    </div>

                    {/* Graham Calculator button */}
                    <div className="mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setGrahamModal({ open: true, stock })}
                      >
                        <Calculator className="h-4 w-4 mr-2" />
                        {t("radar.grahamButton")}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Graham Calculator Modal */}
      {grahamModal.stock && (
        <GrahamCalculatorModal
          open={grahamModal.open}
          onOpenChange={(open) => setGrahamModal(prev => ({ ...prev, open, stock: open ? prev.stock : null }))}
          symbol={grahamModal.stock.symbol}
          peRatio={grahamModal.stock.peRatio}
          currentPrice={grahamModal.stock.currentPrice}
        />
      )}
    </div>
  )
}

function OtherAssetsTab({ assetClass, assets }: { assetClass: string; assets: any[] }) {
  const t = useTranslation()

  return (
    <div className="space-y-3">
      {assets.map((asset: any, index: number) => (
        <Card key={asset.symbol} className="p-4 hover:bg-accent/50 transition-colors">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                  index < 3 ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}
              >
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold">{asset.symbol}</h3>
                  <Badge variant="outline" className="text-xs">
                    {t("radar.score")}: {asset.score}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{asset.name}</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  {asset.dividendYield !== undefined && (
                    <div>
                      <span className="text-muted-foreground">{t("radar.dividendYield")}</span>
                      <p className="font-medium text-income">{asset.dividendYield}%</p>
                    </div>
                  )}
                  {asset.priceToBook !== undefined && (
                    <div>
                      <span className="text-muted-foreground">{t("radar.priceToBook")}</span>
                      <p className="font-medium">{asset.priceToBook}</p>
                    </div>
                  )}
                  {asset.stability !== undefined && (
                    <div>
                      <span className="text-muted-foreground">{t("radar.stability")}</span>
                      <p className="font-medium">{asset.stability}/100</p>
                    </div>
                  )}
                  {asset.vacancy !== undefined && (
                    <div>
                      <span className="text-muted-foreground">{t("radar.vacancy")}</span>
                      <p className="font-medium">{asset.vacancy}%</p>
                    </div>
                  )}
                  {asset.yield !== undefined && (
                    <div>
                      <span className="text-muted-foreground">{t("radar.yield")}</span>
                      <p className="font-medium text-income">{asset.yield}%</p>
                    </div>
                  )}
                  {asset.expenseRatio !== undefined && (
                    <div>
                      <span className="text-muted-foreground">{t("radar.expenseRatio")}</span>
                      <p className="font-medium">{asset.expenseRatio}%</p>
                    </div>
                  )}
                  {asset.marketCap !== undefined && (
                    <div>
                      <span className="text-muted-foreground">{t("radar.marketCap")}</span>
                      <p className="font-medium">{asset.marketCap}</p>
                    </div>
                  )}
                  {asset.change24h !== undefined && (
                    <div>
                      <span className="text-muted-foreground">{t("radar.change24h")}</span>
                      <p
                        className={`font-medium flex items-center gap-1 ${
                          asset.change24h >= 0 ? "text-income" : "text-expense"
                        }`}
                      >
                        {asset.change24h >= 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {asset.change24h}%
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

export function AssetRadar() {
  const t = useTranslation()

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{t("radar.disclaimer")}</AlertDescription>
      </Alert>

      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">{t("radar.title")}</h2>
          <p className="text-muted-foreground mt-1">{t("radar.subtitle")}</p>
        </div>

        <Tabs defaultValue="stocks">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="stocks">{t("assetClass.stocks")}</TabsTrigger>
            <TabsTrigger value="fiis">{t("assetClass.fiis")}</TabsTrigger>
            <TabsTrigger value="fixed-income">{t("assetClass.fixedIncome")}</TabsTrigger>
            <TabsTrigger value="etfs">{t("assetClass.etfs")}</TabsTrigger>
            <TabsTrigger value="crypto">{t("assetClass.crypto")}</TabsTrigger>
          </TabsList>

          <TabsContent value="stocks" className="mt-6">
            <BrazilianStocksTab />
          </TabsContent>

          <TabsContent value="fiis" className="mt-6">
            <OtherAssetsTab assetClass="fiis" assets={OTHER_ASSETS_MOCK.fiis} />
          </TabsContent>

          <TabsContent value="fixed-income" className="mt-6">
            <OtherAssetsTab assetClass="fixed-income" assets={OTHER_ASSETS_MOCK["fixed-income"]} />
          </TabsContent>

          <TabsContent value="etfs" className="mt-6">
            <OtherAssetsTab assetClass="etfs" assets={OTHER_ASSETS_MOCK.etfs} />
          </TabsContent>

          <TabsContent value="crypto" className="mt-6">
            <OtherAssetsTab assetClass="crypto" assets={OTHER_ASSETS_MOCK.crypto} />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}
