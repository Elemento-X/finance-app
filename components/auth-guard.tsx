"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { AppHeader } from "@/components/app-header"

const PUBLIC_ROUTES = ["/login", "/auth/"]

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route))

  useEffect(() => {
    if (!loading && !user && !isPublicRoute) {
      router.replace("/login")
    }
    if (!loading && user && pathname === "/login") {
      router.replace("/")
    }
  }, [loading, user, isPublicRoute, pathname, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isPublicRoute) {
    return <>{children}</>
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="w-full max-w-7xl mx-auto">
      <AppHeader />
      {children}
    </div>
  )
}
