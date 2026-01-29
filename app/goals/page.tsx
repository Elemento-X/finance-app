"use client"

import { useState } from "react"
import { useFinanceStore } from "@/hooks/use-finance-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
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
import { Plus, Trash2, Target, Pencil, Calendar, Trophy } from "lucide-react"
import { toast } from "sonner"
import type { Goal } from "@/lib/types"
import { useTranslation } from "@/lib/i18n"
import { formatCurrency, formatCurrencyInput } from "@/utils/formatters"
import { cn } from "@/lib/utils"

export default function GoalsPage() {
  const { goals, addGoal, updateGoal, toggleGoal, deleteGoal, profile } = useFinanceStore()
  const t = useTranslation()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)

  // Form state
  const [title, setTitle] = useState("")
  const [targetAmount, setTargetAmount] = useState("")
  const [currentAmount, setCurrentAmount] = useState("")
  const [deadline, setDeadline] = useState("")

  const resetForm = () => {
    setTitle("")
    setTargetAmount("")
    setCurrentAmount("")
    setDeadline("")
    setEditingGoal(null)
  }

  const openNewForm = () => {
    resetForm()
    setIsFormOpen(true)
  }

  const openEditForm = (goal: Goal) => {
    setEditingGoal(goal)
    setTitle(goal.title)
    setTargetAmount(goal.targetAmount ? formatCurrencyInput((goal.targetAmount * 100).toString(), profile.currency) : "")
    setCurrentAmount(goal.currentAmount ? formatCurrencyInput((goal.currentAmount * 100).toString(), profile.currency) : "")
    setDeadline(goal.deadline || "")
    setIsFormOpen(true)
  }

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

    if (editingGoal) {
      updateGoal(editingGoal.id, goalData)
      toast.success(t("goals.updateSuccess"))
    } else {
      addGoal(goalData)
      toast.success(t("goals.addSuccess"))
    }

    setIsFormOpen(false)
    resetForm()
  }

  const handleDelete = () => {
    if (deletingId) {
      deleteGoal(deletingId)
      toast.success(t("goals.deleteSuccess"))
      setDeletingId(null)
    }
  }

  const getProgress = (goal: Goal): number => {
    if (!goal.targetAmount || goal.targetAmount === 0) return 0
    const current = goal.currentAmount || 0
    return Math.min(100, Math.round((current / goal.targetAmount) * 100))
  }

  const getDaysInfo = (goal: Goal): { days: number; status: "left" | "overdue" | "today" | null } => {
    if (!goal.deadline) return { days: 0, status: null }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const deadlineDate = new Date(goal.deadline)
    deadlineDate.setHours(0, 0, 0, 0)

    const diffTime = deadlineDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return { days: 0, status: "today" }
    if (diffDays > 0) return { days: diffDays, status: "left" }
    return { days: Math.abs(diffDays), status: "overdue" }
  }

  const activeGoals = goals.filter((g) => !g.completed)
  const completedGoals = goals.filter((g) => g.completed)

  const GoalCard = ({ goal, isCompleted = false }: { goal: Goal; isCompleted?: boolean }) => {
    const progress = getProgress(goal)
    const daysInfo = getDaysInfo(goal)
    const hasFinancialTracking = goal.targetAmount !== undefined

    return (
      <Card className={cn(isCompleted && "opacity-60")}>
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Header row */}
            <div className="flex items-start gap-3">
              <Checkbox
                id={goal.id}
                checked={goal.completed}
                onCheckedChange={() => toggleGoal(goal.id)}
                className="mt-1"
              />
              <div className="flex-1 min-w-0">
                <label
                  htmlFor={goal.id}
                  className={cn(
                    "font-medium leading-tight cursor-pointer block",
                    isCompleted && "line-through"
                  )}
                >
                  {goal.title}
                </label>

                {/* Deadline badge */}
                {goal.deadline && (
                  <div className="flex items-center gap-1 mt-1">
                    <Calendar className="size-3 text-muted-foreground" />
                    <span
                      className={cn(
                        "text-xs",
                        daysInfo.status === "overdue" && "text-expense font-medium",
                        daysInfo.status === "today" && "text-unexpected font-medium",
                        daysInfo.status === "left" && daysInfo.days <= 7 && "text-unexpected",
                        daysInfo.status === "left" && daysInfo.days > 7 && "text-muted-foreground"
                      )}
                    >
                      {daysInfo.status === "today" && t("goals.today")}
                      {daysInfo.status === "left" && `${daysInfo.days} ${t("goals.daysLeft")}`}
                      {daysInfo.status === "overdue" && `${daysInfo.days} ${t("goals.daysOverdue")}`}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-1 shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  onClick={() => openEditForm(goal)}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 text-destructive hover:text-destructive"
                  onClick={() => setDeletingId(goal.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>

            {/* Progress section */}
            {hasFinancialTracking && (
              <div className="pl-7 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t("goals.progress")}</span>
                  <span className="font-medium">
                    {formatCurrency(goal.currentAmount || 0, profile.currency)} / {formatCurrency(goal.targetAmount!, profile.currency)}
                  </span>
                </div>
                <div className="relative">
                  <Progress value={progress} className="h-2" />
                  {progress >= 100 && (
                    <div className="absolute -right-1 -top-1">
                      <Trophy className="size-4 text-income" />
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{progress}%</span>
                  {progress >= 100 && (
                    <span className="text-income font-medium">{t("goals.reached")}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container px-4 py-6 space-y-6 max-w-3xl mx-auto">
        {/* Add button */}
        <Card>
          <CardContent className="p-4">
            <Button onClick={openNewForm} className="w-full">
              <Plus className="size-4 mr-2" />
              {t("goals.new")}
            </Button>
          </CardContent>
        </Card>

        {/* Active goals */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Target className="size-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">
              {t("goals.active")} ({activeGoals.length})
            </h2>
          </div>

          {activeGoals.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Target className="size-12 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">{t("goals.empty")}</p>
                <p className="text-sm text-muted-foreground">{t("goals.emptyDesc")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {activeGoals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} />
              ))}
            </div>
          )}
        </div>

        {/* Completed goals */}
        {completedGoals.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="size-5 rounded-full bg-green-500/20 flex items-center justify-center">
                <div className="size-2 rounded-full bg-green-500" />
              </div>
              <h2 className="text-lg font-semibold">
                {t("goals.completed")} ({completedGoals.length})
              </h2>
            </div>

            <div className="space-y-2">
              {completedGoals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} isCompleted />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Create/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsFormOpen(open) }}>
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
                  onChange={(e) => setTargetAmount(formatCurrencyInput(e.target.value, profile.currency))}
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
                  onChange={(e) => setCurrentAmount(formatCurrencyInput(e.target.value, profile.currency))}
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
              <Button type="button" variant="outline" onClick={() => { resetForm(); setIsFormOpen(false) }}>
                {t("common.cancel")}
              </Button>
              <Button type="submit">
                {editingGoal ? t("common.save") : t("common.add")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dialog.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("dialog.confirmDeleteDesc", { item: t("goals.title").toLowerCase() })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
