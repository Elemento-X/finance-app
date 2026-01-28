"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import type { Category, TransactionType } from "@/lib/types"
import { useFinanceStore } from "@/hooks/use-finance-store"
import { useTranslation } from "@/lib/i18n"
import { toast } from "sonner"

interface CategoryFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category?: Category
  mode?: "create" | "edit"
}

const EMOJI_SUGGESTIONS = ["🏠", "🍽️", "🚗", "🎮", "📈", "💊", "📦", "💰", "🛒", "✈️", "🎓", "💳", "🔧", "👕", "📱", "🎬"]

export function CategoryForm({ open, onOpenChange, category, mode = "create" }: CategoryFormProps) {
  const { addCategory, updateCategory, categories } = useFinanceStore()
  const t = useTranslation()

  const [name, setName] = useState("")
  const [type, setType] = useState<"mixed" | TransactionType>("mixed")
  const [icon, setIcon] = useState("📦")

  useEffect(() => {
    if (category && mode === "edit") {
      setName(category.name)
      setType(category.type)
      setIcon(category.icon || "📦")
    } else if (!open) {
      setName("")
      setType("mixed")
      setIcon("📦")
    }
  }, [category, mode, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error(t("categories.nameRequired"))
      return
    }

    const isDuplicate = categories.some(
      (cat) => cat.name.toLowerCase() === name.trim().toLowerCase() && cat.id !== category?.id,
    )

    if (isDuplicate) {
      toast.error(t("categories.duplicateName"))
      return
    }

    const categoryData: Category = {
      id: category?.id || `cat-${Date.now()}-${Math.random()}`,
      name: name.trim(),
      type,
      icon,
    }

    if (mode === "edit" && category) {
      updateCategory(category.id, categoryData)
      toast.success(t("categories.updated"))
    } else {
      addCategory(categoryData)
      toast.success(t("categories.created"))
    }

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? t("categories.edit") : t("categories.new")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("profile.name")} *</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("categories.namePlaceholder")}
              maxLength={30}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">{t("categories.typeLabel")}</Label>
            <Select value={type} onValueChange={(value) => setType(value as "mixed" | TransactionType)}>
              <SelectTrigger id="type">
                <SelectValue placeholder={t("transaction.selectType")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mixed">{t("categories.typeMixed")}</SelectItem>
                <SelectItem value="income">{t("type.income")}</SelectItem>
                <SelectItem value="expense">{t("type.expense")}</SelectItem>
                <SelectItem value="investment">{t("type.investment")}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{t("categories.typeDesc")}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="icon">{t("categories.iconLabel")}</Label>
            <div className="flex items-center gap-2">
              <div className="text-4xl">{icon}</div>
              <Input
                id="icon"
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder={t("categories.iconPlaceholder")}
                maxLength={2}
                className="flex-1"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {EMOJI_SUGGESTIONS.map((emoji) => (
                <Button
                  key={emoji}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-lg size-10 p-0 bg-transparent"
                  onClick={() => setIcon(emoji)}
                >
                  {emoji}
                </Button>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit">{mode === "edit" ? t("common.save") : t("common.add")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
