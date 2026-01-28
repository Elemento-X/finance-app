"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Download, Upload, FileJson, AlertCircle, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import {
  downloadBackup,
  readFileAsText,
  parseBackupFile,
  generateBackupPreview,
  importBackup,
  type BackupData,
  type BackupPreview,
} from "@/services/backup"
import { useTranslation } from "@/lib/i18n"
import { formatCurrency } from "@/utils/formatters"
import { useFinanceStore } from "@/hooks/use-finance-store"

export function BackupManager() {
  const t = useTranslation()
  const { profile, loadData } = useFinanceStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importMode, setImportMode] = useState<"replace" | "merge">("replace")
  const [pendingBackup, setPendingBackup] = useState<BackupData | null>(null)
  const [preview, setPreview] = useState<BackupPreview | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleExport = () => {
    try {
      downloadBackup()
      toast.success(t("backup.exportSuccess"))
    } catch (error) {
      toast.error(t("backup.exportError"))
    }
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }

    if (!file.name.endsWith(".json")) {
      toast.error(t("backup.invalidFileType"))
      return
    }

    setIsProcessing(true)

    try {
      const content = await readFileAsText(file)
      const backup = parseBackupFile(content)

      if (!backup) {
        toast.error(t("backup.invalidBackupFile"))
        setIsProcessing(false)
        return
      }

      const backupPreview = generateBackupPreview(backup)
      setPendingBackup(backup)
      setPreview(backupPreview)
      setShowImportDialog(true)
    } catch (error) {
      toast.error(t("backup.readError"))
    } finally {
      setIsProcessing(false)
    }
  }

  const handleImportConfirm = () => {
    if (!pendingBackup) return

    const result = importBackup(pendingBackup, importMode)

    if (result.success) {
      toast.success(result.message)
      loadData() // Reload data in store
    } else {
      toast.error(result.message)
    }

    setShowImportDialog(false)
    setPendingBackup(null)
    setPreview(null)
  }

  const handleImportCancel = () => {
    setShowImportDialog(false)
    setPendingBackup(null)
    setPreview(null)
  }

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString(profile.language === "pt" ? "pt-BR" : "en-US", {
      dateStyle: "long",
      timeStyle: "short",
    })
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileJson className="size-5 text-primary" />
            </div>
            <div>
              <CardTitle>{t("backup.title")}</CardTitle>
              <CardDescription>{t("backup.description")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="p-4 rounded-lg border border-border space-y-3">
              <div className="flex items-center gap-2">
                <Download className="size-5 text-muted-foreground" />
                <h4 className="font-medium">{t("backup.export")}</h4>
              </div>
              <p className="text-sm text-muted-foreground">{t("backup.exportDesc")}</p>
              <Button onClick={handleExport} className="w-full" variant="outline">
                <Download className="size-4 mr-2" />
                {t("backup.downloadBackup")}
              </Button>
            </div>

            <div className="p-4 rounded-lg border border-border space-y-3">
              <div className="flex items-center gap-2">
                <Upload className="size-5 text-muted-foreground" />
                <h4 className="font-medium">{t("backup.import")}</h4>
              </div>
              <p className="text-sm text-muted-foreground">{t("backup.importDesc")}</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
                variant="outline"
                disabled={isProcessing}
              >
                <Upload className="size-4 mr-2" />
                {isProcessing ? t("backup.processing") : t("backup.selectFile")}
              </Button>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-muted/50 flex items-start gap-2">
            <AlertCircle className="size-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">{t("backup.tip")}</p>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("backup.confirmImport")}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                {preview && (
                  <div className="space-y-3 text-left">
                    <div className="p-3 rounded-lg bg-muted space-y-2">
                      <p className="text-sm">
                        <span className="text-muted-foreground">{t("backup.exportedAt")}:</span>{" "}
                        <span className="font-medium">{formatDate(preview.exportedAt)}</span>
                      </p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">{t("backup.version")}:</span>{" "}
                        <span className="font-medium">v{preview.version}</span>
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 rounded border text-center">
                        <p className="text-lg font-bold">{preview.counts.transactions}</p>
                        <p className="text-xs text-muted-foreground">{t("backup.transactions")}</p>
                      </div>
                      <div className="p-2 rounded border text-center">
                        <p className="text-lg font-bold">{preview.counts.categories}</p>
                        <p className="text-xs text-muted-foreground">{t("backup.categories")}</p>
                      </div>
                      <div className="p-2 rounded border text-center">
                        <p className="text-lg font-bold">{preview.counts.goals}</p>
                        <p className="text-xs text-muted-foreground">{t("backup.goals")}</p>
                      </div>
                      <div className="p-2 rounded border text-center">
                        <p className="text-lg font-bold">{preview.counts.assets}</p>
                        <p className="text-xs text-muted-foreground">{t("backup.assets")}</p>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                        <CheckCircle2 className="size-4" />
                        {t("backup.validFile")}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium">{t("backup.importMode")}:</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={importMode === "replace" ? "default" : "outline"}
                          onClick={() => setImportMode("replace")}
                          className="flex-1"
                        >
                          {t("backup.replaceAll")}
                        </Button>
                        <Button
                          size="sm"
                          variant={importMode === "merge" ? "default" : "outline"}
                          onClick={() => setImportMode("merge")}
                          className="flex-1"
                        >
                          {t("backup.mergeData")}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {importMode === "replace"
                          ? t("backup.replaceModeDesc")
                          : t("backup.mergeModeDesc")}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleImportCancel}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleImportConfirm}>
              {t("backup.confirmRestore")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
