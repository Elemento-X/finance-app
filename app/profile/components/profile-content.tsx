'use client'

import { useEffect, useState } from 'react'
import { useFinanceStore } from '@/hooks/use-finance-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Save,
  Trash2,
  User,
  DollarSign,
  Database,
  LogOut,
  MessageCircle,
  Link2Off,
  Bell,
} from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { CURRENCY_OPTIONS, LANGUAGE_OPTIONS } from '@/lib/constants'
import { useTranslation, type Locale } from '@/lib/i18n'
import { BackupManager } from '@/components/backup-manager'
import { MigrationTool } from '@/components/migration-tool'
import { RecurringManager } from '@/components/recurring-manager'
import { ExportManager } from '@/components/export-manager'
import { useAuth } from '@/components/auth-provider'
import { supabase } from '@/lib/supabase'
import { supabaseService } from '@/services/supabase'

export function ProfileContent() {
  const { loadData, profile, updateProfile, transactions } = useFinanceStore()
  const { signOut, user } = useAuth()
  const t = useTranslation()
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('BRL')
  const [language, setLanguage] = useState<Locale>('en')
  const [showClearDialog, setShowClearDialog] = useState(false)
  const [storageSize, setStorageSize] = useState('0.00')
  const [isLinking, setIsLinking] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [summaryEnabled, setSummaryEnabled] = useState(false)
  const [isUpdatingSummary, setIsUpdatingSummary] = useState(false)

  useEffect(() => {
    loadData()
  }, [loadData])

  // Auto-refresh when window gains focus (for Telegram status update)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadData()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [loadData])

  useEffect(() => {
    setName(profile.name)
    setCurrency(profile.currency)
    setLanguage(profile.language || 'en')
    setSummaryEnabled(profile.telegramSummaryEnabled || false)
  }, [profile])

  useEffect(() => {
    if (typeof window !== 'undefined') {
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
      toast.error(t('profile.nameRequired'))
      return
    }

    updateProfile({
      name: name.trim(),
      currency,
      language,
      defaultMonth: profile.defaultMonth,
    })

    toast.success(t('profile.updateSuccess'))
  }

  const handleClearData = () => {
    if (typeof window !== 'undefined') {
      localStorage.clear()
      toast.success(t('profile.deleteSuccess'))
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    }
  }

  const generateLinkCode = (length = 10) => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const values = new Uint32Array(length)
    crypto.getRandomValues(values)
    return Array.from(
      values,
      (value) => alphabet[value % alphabet.length],
    ).join('')
  }

  const handleConnectTelegram = async () => {
    if (!user) {
      toast.error(t('telegram.authRequired'))
      return
    }

    if (profile.telegramChatId) {
      toast.info(t('telegram.alreadyLinked'))
      return
    }

    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME
    if (!botUsername) {
      toast.error(t('telegram.botMissing'))
      return
    }

    setIsLinking(true)
    const code = generateLinkCode()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    const { error } = await supabase
      .from('telegram_link_tokens')
      .insert({ user_id: user.id, code, expires_at: expiresAt })

    if (error) {
      console.error('Failed to create telegram link token:', error)
      toast.error(t('telegram.linkError'))
      setIsLinking(false)
      return
    }

    const link = `https://t.me/${botUsername}?start=${code}`
    window.open(link, '_blank', 'noopener')
    toast.success(t('telegram.linkOpened'))
    setIsLinking(false)
  }

  const handleDisconnectTelegram = async () => {
    setIsDisconnecting(true)
    const result = await supabaseService.updateTelegramChatId(null)
    if (result) {
      updateProfile({ ...profile, telegramChatId: null })
      toast.success(t('telegram.disconnectSuccess'))
    } else {
      toast.error(t('telegram.disconnectError'))
    }
    setIsDisconnecting(false)
  }

  const handleToggleSummary = async (enabled: boolean) => {
    setIsUpdatingSummary(true)
    setSummaryEnabled(enabled)
    const result = await supabaseService.updateTelegramSummaryEnabled(enabled)
    if (result) {
      updateProfile({ ...profile, telegramSummaryEnabled: enabled })
      toast.success(
        enabled ? t('telegram.summaryEnabled') : t('telegram.summaryDisabled'),
      )
    } else {
      setSummaryEnabled(!enabled) // Revert on error
      toast.error(t('telegram.summaryError'))
    }
    setIsUpdatingSummary(false)
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
                <CardTitle>{t('profile.personalInfo')}</CardTitle>
                <CardDescription>
                  {t('profile.personalInfoDesc')}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('profile.name')}</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('profile.namePlaceholder')}
                maxLength={50}
              />
            </div>

            <Button onClick={handleSave} className="w-full sm:w-auto">
              <Save className="size-4 mr-2" />
              {t('profile.saveChanges')}
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
                <CardTitle>{t('profile.preferences')}</CardTitle>
                <CardDescription>
                  {t('profile.preferencesDesc')}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currency">{t('profile.currency')}</Label>
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
              <Label htmlFor="language">{t('profile.language')}</Label>
              <Select
                value={language}
                onValueChange={(v) => setLanguage(v as Locale)}
              >
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
              {t('profile.savePreferences')}
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
                <CardTitle>{t('profile.data')}</CardTitle>
                <CardDescription>{t('profile.dataDesc')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border border-border">
                <p className="text-2xl font-bold">{transactions.length}</p>
                <p className="text-sm text-muted-foreground">
                  {t('home.transactions')}
                </p>
              </div>
              <div className="p-4 rounded-lg border border-border">
                <p className="text-2xl font-bold">{storageSize} KB</p>
                <p className="text-sm text-muted-foreground">
                  {t('profile.storage')}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/5">
              <h4 className="font-medium text-destructive mb-2">
                {t('profile.dangerZone')}
              </h4>
              <p className="text-sm text-muted-foreground mb-4">
                {t('profile.dangerDesc')}
              </p>
              <Button
                variant="destructive"
                onClick={() => setShowClearDialog(true)}
              >
                <Trash2 className="size-4 mr-2" />
                {t('profile.deleteAllData')}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <MessageCircle className="size-5 text-primary" />
              </div>
              <div>
                <CardTitle>{t('profile.telegramTitle')}</CardTitle>
                <CardDescription>{t('profile.telegramDesc')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">
                  {profile.telegramChatId
                    ? t('profile.telegramConnected')
                    : t('profile.telegramDisconnected')}
                </p>
                {!profile.telegramChatId && (
                  <p className="text-sm text-muted-foreground">
                    {t('profile.telegramHint')}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.telegramChatId ? (
                  <Button
                    variant="outline"
                    onClick={handleDisconnectTelegram}
                    disabled={isDisconnecting}
                  >
                    <Link2Off className="size-4 mr-2" />
                    {isDisconnecting
                      ? t('common.loading')
                      : t('profile.telegramDisconnect')}
                  </Button>
                ) : (
                  <Button onClick={handleConnectTelegram} disabled={isLinking}>
                    <MessageCircle className="size-4 mr-2" />
                    {isLinking
                      ? t('common.loading')
                      : t('profile.telegramConnect')}
                  </Button>
                )}
              </div>
            </div>

            {profile.telegramChatId && (
              <div className="flex items-center justify-between gap-4 p-4 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <Bell className="size-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      {t('telegram.summaryTitle')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t('telegram.summaryDesc')}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={summaryEnabled}
                  onCheckedChange={handleToggleSummary}
                  disabled={isUpdatingSummary}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <RecurringManager />

        {/* Only show migration tool if user has no data in Supabase yet */}
        {transactions.length === 0 && <MigrationTool />}

        <BackupManager />

        <ExportManager />

        <div className="flex justify-center">
          <Button variant="outline" onClick={signOut}>
            <LogOut className="size-4 mr-2" />
            {t('auth.signOut')}
          </Button>
        </div>

        <div className="text-center text-sm text-muted-foreground space-y-1">
          <p>{t('profile.version')}</p>
          <p>{t('profile.localStorage')}</p>
        </div>
      </main>

      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('dialog.confirmDeleteAllTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('dialog.confirmDeleteAllDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearData}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('dialog.yesDelete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
