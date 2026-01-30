"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"
import { toast } from "sonner"
import { supabaseService } from "@/services/supabase"
import { useTranslation } from "@/lib/i18n"
import type { BudgetAlert, Category } from "@/lib/types"
import { Trash2 } from "lucide-react"

interface BudgetAlertModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: Category | null
  existingAlert: BudgetAlert | null
  onSave: () => void
}

export function BudgetAlertModal({
  open,
  onOpenChange,
  category,
  existingAlert,
  onSave,
}: BudgetAlertModalProps) {
  const t = useTranslation()
  const [monthlyLimit, setMonthlyLimit] = useState("")
  const [alertThreshold, setAlertThreshold] = useState(80)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (existingAlert) {
      setMonthlyLimit(existingAlert.monthlyLimit.toString())
      setAlertThreshold(existingAlert.alertThreshold)
    } else {
      setMonthlyLimit("")
      setAlertThreshold(80)
    }
  }, [existingAlert, open])

  const handleSave = async () => {
    if (!category) return

    const limit = parseFloat(monthlyLimit)
    if (isNaN(limit) || limit <= 0) {
      toast.error(t("transaction.amountPositive"))
      return
    }

    setIsSaving(true)

    const alert: BudgetAlert = {
      id: existingAlert?.id || `budget_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      category: category.id,
      monthlyLimit: limit,
      alertThreshold,
      isActive: true,
      createdAt: existingAlert?.createdAt || new Date().toISOString(),
    }

    const success = existingAlert
      ? await supabaseService.updateBudgetAlert(alert.id, alert)
      : await supabaseService.addBudgetAlert(alert)

    if (success) {
      toast.success(existingAlert ? t("budget.updated") : t("budget.created"))
      onSave()
      onOpenChange(false)
    } else {
      toast.error(t("budget.error"))
    }

    setIsSaving(false)
  }

  const handleDelete = async () => {
    if (!existingAlert) return

    setIsSaving(true)
    const success = await supabaseService.deleteBudgetAlert(existingAlert.id)

    if (success) {
      toast.success(t("budget.deleted"))
      onSave()
      onOpenChange(false)
    } else {
      toast.error(t("budget.error"))
    }

    setIsSaving(false)
  }

  if (!category) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {existingAlert ? t("budget.editLimit") : t("budget.setLimit")}
          </DialogTitle>
          <DialogDescription>
            {category.icon} {category.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="monthlyLimit">{t("budget.monthlyLimit")}</Label>
            <Input
              id="monthlyLimit"
              type="number"
              min="0"
              step="0.01"
              value={monthlyLimit}
              onChange={(e) => setMonthlyLimit(e.target.value)}
              placeholder="1000.00"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>{t("budget.threshold")}</Label>
              <span className="text-sm font-medium">{alertThreshold}%</span>
            </div>
            <Slider
              value={[alertThreshold]}
              onValueChange={(value) => setAlertThreshold(value[0])}
              min={50}
              max={100}
              step={5}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              {t("budget.alertAt")} {alertThreshold}% {t("budget.ofLimit")}
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {existingAlert && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isSaving}
              className="w-full sm:w-auto"
            >
              <Trash2 className="size-4 mr-2" />
              {t("common.delete")}
            </Button>
          )}
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              className="flex-1 sm:flex-none"
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !monthlyLimit}
              className="flex-1 sm:flex-none"
            >
              {isSaving ? t("common.loading") : t("common.save")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
