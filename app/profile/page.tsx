"use client"

import { useEffect, useState } from "react"
import { useFinanceStore } from "@/hooks/use-finance-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { Save, Trash2, User, DollarSign, Database, LogOut } from "lucide-react"
import { toast } from "sonner"
import { CURRENCY_OPTIONS, LANGUAGE_OPTIONS } from "@/lib/constants"
import { useTranslation, type Locale } from "@/lib/i18n"
import { BackupManager } from "@/components/backup-manager"
import { MigrationTool } from "@/components/migration-tool"
import { useAuth } from "@/components/auth-provider"

export default function ProfilePage() {
  const { loadData, profile, updateProfile, transactions } = useFinanceStore()
  const { signOut } = useAuth()
  const t = useTranslation()
  const [name, setName] = useState("")
  const [currency, setCurrency] = useState("BRL")
  const [language, setLanguage] = useState<Locale>("en")
  const [showClearDialog, setShowClearDialog] = useState(false)
  const [storageSize, setStorageSize] = useState("0.00")

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    setName(profile.name)
    setCurrency(profile.currency)
    setLanguage(profile.language || "en")
  }, [profile])

  useEffect(() => {
    if (typeof window !== "undefined") {
      let total = 0
      for (const key in localStorage) {
        if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
          total += localStorage[key].length + key.length
        }
      }
      setStorageSize((total / 1024).toFixed(2))
    }
  }, [transactions])

  const handleSave = () => {
    if (!name.trim()) {
      toast.error(t("profile.nameRequired"))
      return
    }

    updateProfile({
      name: name.trim(),
      currency,
      language,
      defaultMonth: profile.defaultMonth,
    })

    toast.success(t("profile.updateSuccess"))
  }

  const handleClearData = () => {
    if (typeof window !== "undefined") {
      localStorage.clear()
      toast.success(t("profile.deleteSuccess"))
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container px-4 py-6 space-y-6 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <User className="size-5 text-primary" />
              </div>
              <div>
                <CardTitle>{t("profile.personalInfo")}</CardTitle>
                <CardDescription>{t("profile.personalInfoDesc")}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("profile.name")}</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("profile.namePlaceholder")}
                maxLength={50}
              />
            </div>

            <Button onClick={handleSave} className="w-full sm:w-auto">
              <Save className="size-4 mr-2" />
              {t("profile.saveChanges")}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="size-5 text-primary" />
              </div>
              <div>
                <CardTitle>{t("profile.preferences")}</CardTitle>
                <CardDescription>{t("profile.preferencesDesc")}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currency">{t("profile.currency")}</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">{t("profile.language")}</Label>
              <Select value={language} onValueChange={(v) => setLanguage(v as Locale)}>
                <SelectTrigger id="language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleSave} className="w-full sm:w-auto">
              <Save className="size-4 mr-2" />
              {t("profile.savePreferences")}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Database className="size-5 text-primary" />
              </div>
              <div>
                <CardTitle>{t("profile.data")}</CardTitle>
                <CardDescription>{t("profile.dataDesc")}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border border-border">
                <p className="text-2xl font-bold">{transactions.length}</p>
                <p className="text-sm text-muted-foreground">{t("home.transactions")}</p>
              </div>
              <div className="p-4 rounded-lg border border-border">
                <p className="text-2xl font-bold">{storageSize} KB</p>
                <p className="text-sm text-muted-foreground">{t("profile.storage")}</p>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/5">
              <h4 className="font-medium text-destructive mb-2">{t("profile.dangerZone")}</h4>
              <p className="text-sm text-muted-foreground mb-4">{t("profile.dangerDesc")}</p>
              <Button variant="destructive" onClick={() => setShowClearDialog(true)}>
                <Trash2 className="size-4 mr-2" />
                {t("profile.deleteAllData")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <MigrationTool />

        <BackupManager />

        <div className="flex justify-center">
          <Button variant="outline" onClick={signOut}>
            <LogOut className="size-4 mr-2" />
            {t("auth.signOut")}
          </Button>
        </div>

        <div className="text-center text-sm text-muted-foreground space-y-1">
          <p>{t("profile.version")}</p>
          <p>{t("profile.localStorage")}</p>
        </div>
      </main>

      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dialog.confirmDeleteAllTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("dialog.confirmDeleteAllDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearData}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("dialog.yesDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
