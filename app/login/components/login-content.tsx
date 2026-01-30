'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/lib/i18n'
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
import { Mail, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

export function LoginContent() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const t = useTranslation()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setLoading(false)

    if (error) {
      toast.error(error.message)
    } else {
      setSent(true)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t('auth.appName')}</CardTitle>
          <CardDescription>{t('auth.appDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="text-center space-y-4">
              <CheckCircle2 className="size-12 text-green-500 mx-auto" />
              <div>
                <p className="font-medium">{t('auth.checkEmail')}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('auth.checkEmailDesc', { email })}
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setSent(false)}
              >
                {t('auth.tryAgain')}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('auth.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                <Mail className="size-4 mr-2" />
                {loading ? t('auth.sending') : t('auth.sendMagicLink')}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
