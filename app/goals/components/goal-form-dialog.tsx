"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import type { Goal } from "@/lib/types"
import { useTranslation } from "@/lib/i18n"
import { formatCurrencyInput } from "@/utils/formatters"

interface GoalFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingGoal: Goal | null
  currency: string
  onSubmit: (goal: Goal) => void
}

export function GoalFormDialog({ open, onOpenChange, editingGoal, currency, onSubmit }: GoalFormDialogProps) {
  const t = useTranslation()
  const [title, setTitle] = useState("")
  const [targetAmount, setTargetAmount] = useState("")
  const [currentAmount, setCurrentAmount] = useState("")
  const [deadline, setDeadline] = useState("")

  const resetForm = () => {
    setTitle("")
    setTargetAmount("")
    setCurrentAmount("")
    setDeadline("")
  }

  useEffect(() => {
    if (open && editingGoal) {
      setTitle(editingGoal.title)
      setTargetAmount(editingGoal.targetAmount ? formatCurrencyInput((editingGoal.targetAmount * 100).toString(), currency) : "")
      setCurrentAmount(editingGoal.currentAmount ? formatCurrencyInput((editingGoal.currentAmount * 100).toString(), currency) : "")
      setDeadline(editingGoal.deadline || "")
    } else if (open && !editingGoal) {
      resetForm()
    }
  }, [open, editingGoal, currency])

  const parseAmount = (value: string): number | undefined => {
    if (!value.trim()) return undefined
    const numericValue = value.replace(/[^\d,]/g, "")
    const parsed = Number.parseFloat(numericValue.replace(/\./g, "").replace(",", "."))
    return parsed > 0 ? parsed : undefined
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      toast.error(t("goals.enterGoal"))
      return
    }

    const goalData: Goal = {
      id: editingGoal?.id || `goal-${Date.now()}`,
      title: title.trim(),
      targetAmount: parseAmount(targetAmount),
      currentAmount: parseAmount(currentAmount),
      deadline: deadline || undefined,
      completed: editingGoal?.completed || false,
      createdAt: editingGoal?.createdAt || new Date().toISOString(),
    }

    onSubmit(goalData)
    onOpenChange(false)
    resetForm()
  }

  const handleClose = () => {
    resetForm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); else onOpenChange(isOpen) }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{editingGoal ? t("goals.edit") : t("goals.new")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">{t("goals.title")} *</Label>
            <Input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("goals.placeholder")}
              maxLength={200}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="targetAmount">
                {t("goals.targetAmount")} <span className="text-muted-foreground text-xs">({t("goals.optional")})</span>
              </Label>
              <Input
                id="targetAmount"
                type="text"
                value={targetAmount}
                onChange={(e) => setTargetAmount(formatCurrencyInput(e.target.value, currency))}
                placeholder={t("goals.targetAmountPlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentAmount">
                {t("goals.currentAmount")} <span className="text-muted-foreground text-xs">({t("goals.optional")})</span>
              </Label>
              <Input
                id="currentAmount"
                type="text"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(formatCurrencyInput(e.target.value, currency))}
                placeholder={t("goals.currentAmountPlaceholder")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deadline">
              {t("goals.deadline")} <span className="text-muted-foreground text-xs">({t("goals.optional")})</span>
            </Label>
            <Input
              id="deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="dark:[color-scheme:dark]"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit">
              {editingGoal ? t("common.save") : t("common.add")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
