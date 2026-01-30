"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Trash2, Pencil, Calendar, Trophy } from "lucide-react"
import type { Goal } from "@/lib/types"
import { useTranslation } from "@/lib/i18n"
import { formatCurrency } from "@/utils/formatters"
import { cn } from "@/lib/utils"

interface GoalCardProps {
  goal: Goal
  isCompleted?: boolean
  currency: string
  onEdit: (goal: Goal) => void
  onDelete: (goalId: string) => void
  onToggle: (goalId: string) => void
}

function getProgress(goal: Goal): number {
  if (!goal.targetAmount || goal.targetAmount === 0) return 0
  const current = goal.currentAmount || 0
  return Math.min(100, Math.round((current / goal.targetAmount) * 100))
}

function getDaysInfo(goal: Goal): { days: number; status: "left" | "overdue" | "today" | null } {
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

export function GoalCard({ goal, isCompleted = false, currency, onEdit, onDelete, onToggle }: GoalCardProps) {
  const t = useTranslation()
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
              onCheckedChange={() => onToggle(goal.id)}
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
                onClick={() => onEdit(goal)}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-8 text-destructive hover:text-destructive"
                onClick={() => onDelete(goal.id)}
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
                  {formatCurrency(goal.currentAmount || 0, currency)} / {formatCurrency(goal.targetAmount!, currency)}
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
