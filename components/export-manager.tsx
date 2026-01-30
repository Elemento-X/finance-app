'use client'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { FileSpreadsheet, FileText, Download } from 'lucide-react'
import { toast } from 'sonner'
import { useFinanceStore } from '@/hooks/use-finance-store'
import { useTranslation } from '@/lib/i18n'
import { exportToCSV, exportToPDF } from '@/services/export'

export function ExportManager() {
  const { transactions, categories, profile } = useFinanceStore()
  const t = useTranslation()

  const locale = profile.language === 'pt' ? 'pt-BR' : 'en-US'

  const handleExportCSV = () => {
    if (transactions.length === 0) {
      toast.error(t('export.noData'))
      return
    }

    exportToCSV({
      transactions,
      categories,
      currency: profile.currency,
      locale,
    })

    toast.success(t('export.csvSuccess'))
  }

  const handleExportPDF = () => {
    if (transactions.length === 0) {
      toast.error(t('export.noData'))
      return
    }

    exportToPDF({
      transactions,
      categories,
      currency: profile.currency,
      locale,
    })

    toast.success(t('export.pdfSuccess'))
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Download className="size-5 text-primary" />
          </div>
          <div>
            <CardTitle>{t('export.title')}</CardTitle>
            <CardDescription>{t('export.description')}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="p-4 rounded-lg border border-border space-y-3">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="size-5 text-muted-foreground" />
              <h4 className="font-medium">{t('export.csv')}</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('export.csvDesc')}
            </p>
            <Button
              onClick={handleExportCSV}
              className="w-full"
              variant="outline"
            >
              <FileSpreadsheet className="size-4 mr-2" />
              {t('export.csv')}
            </Button>
          </div>

          <div className="p-4 rounded-lg border border-border space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="size-5 text-muted-foreground" />
              <h4 className="font-medium">{t('export.pdf')}</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('export.pdfDesc')}
            </p>
            <Button
              onClick={handleExportPDF}
              className="w-full"
              variant="outline"
            >
              <FileText className="size-4 mr-2" />
              {t('export.pdf')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
