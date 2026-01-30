"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Loader2 } from "lucide-react"
import { useTranslation } from "@/lib/i18n"
import { logger } from "@/lib/logger"

export function AuthCallbackContent() {
  const router = useRouter()
  const t = useTranslation()

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search)
      const code = params.get("code")
      const error = params.get("error")

      if (error) {
        router.replace("/login")
        return
      }

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError) {
          logger.app.error("Auth callback error:", exchangeError)
          router.replace("/login")
          return
        }
      }

      // Verify session was established
      const { data: { session } } = await supabase.auth.getSession()
      router.replace(session ? "/" : "/login")
    }

    handleCallback()
  }, [router])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3">
      <Loader2 className="size-8 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{t("auth.verifying")}</p>
    </div>
  )
}
