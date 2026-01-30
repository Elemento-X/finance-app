'use client'

import { useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCw, Plus } from 'lucide-react'
import { useInvestmentsStore } from '@/hooks/use-investments-store'
import { PortfolioOverview } from './portfolio-overview'
import { AssetsList } from './assets-list'
import { AssetForm } from './asset-form'
import { AssetRadar } from './asset-radar'
import { ARCAAllocationView } from './arca-allocation-view'
import { AlertsList } from './alerts-list'
import { MacroBar } from '@/components/macro-bar'
import type { AssetClass } from '@/lib/investment-types'
import { useTranslation } from '@/lib/i18n'

export function InvestmentsContent() {
  const [activeAssetClass, setActiveAssetClass] = useState<AssetClass>('stocks')
  const [showAssetForm, setShowAssetForm] = useState(false)
  const { loadAssets, refreshMarketData, isLoading, lastUpdate } =
    useInvestmentsStore()
  const t = useTranslation()

  useEffect(() => {
    loadAssets()
  }, [loadAssets])

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(
      () => {
        refreshMarketData()
      },
      5 * 60 * 1000,
    )

    return () => clearInterval(interval)
  }, [refreshMarketData])

  const handleRefresh = () => {
    refreshMarketData()
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        <MacroBar />

        <div className="flex items-center justify-between">
          <div>
            {lastUpdate && (
              <p className="text-sm text-muted-foreground mt-1">
                {t('investments.lastUpdate')}:{' '}
                {new Date(lastUpdate).toLocaleTimeString()}
              </p>
            )}
          </div>
          <Button
            onClick={handleRefresh}
            disabled={isLoading}
            size="sm"
            variant="outline"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
            />
            {t('investments.refresh')}
          </Button>
        </div>

        <AlertsList />

        <Tabs defaultValue="portfolio" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="portfolio">
              {t('investments.portfolio')}
            </TabsTrigger>
            <TabsTrigger value="radar">{t('investments.radar')}</TabsTrigger>
            <TabsTrigger value="arca">{t('investments.arca')}</TabsTrigger>
          </TabsList>

          <TabsContent value="portfolio" className="space-y-6">
            <PortfolioOverview isLoading={isLoading} />

            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">
                  {t('investments.assetsByClass')}
                </h2>
                <Button onClick={() => setShowAssetForm(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  {t('investments.addAsset')}
                </Button>
              </div>

              <Tabs
                value={activeAssetClass}
                onValueChange={(v) => setActiveAssetClass(v as AssetClass)}
              >
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="stocks">
                    {t('assetClass.stocks')}
                  </TabsTrigger>
                  <TabsTrigger value="fiis">{t('assetClass.fiis')}</TabsTrigger>
                  <TabsTrigger value="fixed-income">
                    {t('assetClass.fixedIncome')}
                  </TabsTrigger>
                  <TabsTrigger value="etfs">{t('assetClass.etfs')}</TabsTrigger>
                  <TabsTrigger value="crypto">
                    {t('assetClass.crypto')}
                  </TabsTrigger>
                </TabsList>

                <div className="mt-6">
                  <AssetsList
                    assetClass={activeAssetClass}
                    isLoading={isLoading}
                  />
                </div>
              </Tabs>
            </Card>
          </TabsContent>

          <TabsContent value="radar">
            <AssetRadar />
          </TabsContent>

          <TabsContent value="arca">
            <ARCAAllocationView isLoading={isLoading} />
          </TabsContent>
        </Tabs>

        {showAssetForm && (
          <AssetForm
            assetClass={activeAssetClass}
            onClose={() => setShowAssetForm(false)}
            onSuccess={() => {
              setShowAssetForm(false)
              refreshMarketData()
            }}
          />
        )}
      </main>
    </div>
  )
}
