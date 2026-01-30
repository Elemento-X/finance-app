"use client"

import { useEffect, useState } from "react"
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react"
import { fetchMacroData, type MacroData } from "@/services/bcb"
import { Skeleton } from "@/components/ui/skeleton"
import { useTranslation } from "@/lib/i18n"
import { cn } from "@/lib/utils"

export function MacroBar() {
  const [data, setData] = useState<MacroData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const t = useTranslation()

  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      try {
        const macroData = await fetchMacroData()
        setData(macroData)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center gap-6 px-4 py-2 bg-muted/50 rounded-lg">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-40" />
      </div>
    )
  }

  if (!data || (!data.selic && !data.ipca)) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-4 sm:gap-6 px-4 py-2 bg-muted/50 rounded-lg text-sm">
      {data.selic && (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{t("macro.selic")}:</span>
          <span className="font-semibold text-primary">
            {data.selic.value.toFixed(2)}% {t("macro.perYear")}
          </span>
        </div>
      )}

      {data.ipca && (
        <>
          <div className="hidden sm:block h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{t("macro.ipca12m")}:</span>
            <span
              className={cn(
                "font-semibold flex items-center gap-1",
                data.ipca.accumulated12m > 4.5 ? "text-expense" : "text-income"
              )}
            >
              {data.ipca.accumulated12m > 0 ? (
                <TrendingUp className="size-3" />
              ) : (
                <TrendingDown className="size-3" />
              )}
              {data.ipca.accumulated12m.toFixed(2)}%
            </span>
          </div>
        </>
      )}

      {data.ipca && (
        <>
          <div className="hidden md:block h-4 w-px bg-border" />
          <div className="hidden md:flex items-center gap-2">
            <span className="text-muted-foreground">{t("macro.ipcaMonth")}:</span>
            <span
              className={cn(
                "font-semibold",
                data.ipca.monthly > 0.5 ? "text-expense" : "text-muted-foreground"
              )}
            >
              {data.ipca.monthly.toFixed(2)}%
            </span>
          </div>
        </>
      )}

      {data.selic && data.ipca && (
        <>
          <div className="hidden lg:block h-4 w-px bg-border" />
          <div className="hidden lg:flex items-center gap-2">
            <span className="text-muted-foreground">{t("macro.realRate")}:</span>
            <span className="font-semibold text-income">
              {(data.selic.value - data.ipca.accumulated12m).toFixed(2)}%
            </span>
          </div>
        </>
      )}
    </div>
  )
}
