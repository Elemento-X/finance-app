"use client"

import { useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useFinanceStore } from "@/hooks/use-finance-store"
import { useTranslation } from "@/lib/i18n"
import { Home, Target, FolderOpen, TrendingUp, User, Repeat } from "lucide-react"
import { cn } from "@/lib/utils"

export function AppHeader() {
  const { loadData, profile, isHydrated } = useFinanceStore()
  const t = useTranslation()
  const pathname = usePathname()

  useEffect(() => {
    loadData()
  }, [loadData])

  const navItems = [
    { href: "/", label: t("nav.home"), icon: Home },
    { href: "/recurring", label: t("nav.recurring"), icon: Repeat },
    { href: "/goals", label: t("nav.goals"), icon: Target },
    { href: "/categories", label: t("nav.categories"), icon: FolderOpen },
    { href: "/investments", label: t("nav.investments"), icon: TrendingUp },
    { href: "/profile", label: t("nav.profile"), icon: User },
  ]

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Image
              src="/controleclogo.png"
              alt="ControleC"
              width={40}
              height={40}
              className="rounded-lg cursor-pointer"
            />
          </Link>
          {!isHydrated ? (
            <div>
              <Skeleton className="h-6 w-32 mb-1" />
              <Skeleton className="h-4 w-24" />
            </div>
          ) : (
            <div>
              {profile.name && (
                <p className="text-sm text-muted-foreground">
                  {t("home.hello")}, {profile.name}!
                </p>
              )}
            </div>
          )}
        </div>

        <nav className="hidden sm:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(isActive && "bg-secondary")}
                >
                  <Icon className="size-4 mr-1 sm:mr-2" />
                  <span className="hidden md:inline">{item.label}</span>
                </Button>
              </Link>
            )
          })}
        </nav>

        {/* Mobile navigation */}
        <nav className="flex sm:hidden items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  size="icon"
                  className={cn("size-9", isActive && "bg-secondary")}
                >
                  <Icon className="size-4" />
                </Button>
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
