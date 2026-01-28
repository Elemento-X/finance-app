"use client"

import { useState } from "react"
import { useFinanceStore } from "@/hooks/use-finance-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Plus, Trash2, Target } from "lucide-react"
import { toast } from "sonner"
import type { Goal } from "@/lib/types"
import { useTranslation } from "@/lib/i18n"

export default function GoalsPage() {
  const { goals, addGoal, toggleGoal, deleteGoal } = useFinanceStore()
  const t = useTranslation()
  const [newGoalTitle, setNewGoalTitle] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleAddGoal = () => {
    if (!newGoalTitle.trim()) {
      toast.error(t("goals.enterGoal"))
      return
    }

    const newGoal: Goal = {
      id: `goal-${Date.now()}`,
      title: newGoalTitle.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
    }

    addGoal(newGoal)
    setNewGoalTitle("")
    toast.success(t("goals.addSuccess"))
  }

  const handleDelete = () => {
    if (deletingId) {
      deleteGoal(deletingId)
      toast.success(t("goals.deleteSuccess"))
      setDeletingId(null)
    }
  }

  const activeGoals = goals.filter((g) => !g.completed)
  const completedGoals = goals.filter((g) => g.completed)

  return (
    <div className="min-h-screen bg-background">
      <main className="container px-4 py-6 space-y-6 max-w-3xl mx-auto">
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder={t("goals.placeholder")}
                value={newGoalTitle}
                onChange={(e) => setNewGoalTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAddGoal()
                  }
                }}
                maxLength={200}
              />
              <Button onClick={handleAddGoal} size="icon">
                <Plus className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

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
                <Card key={goal.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Checkbox id={goal.id} checked={goal.completed} onCheckedChange={() => toggleGoal(goal.id)} />
                      <label
                        htmlFor={goal.id}
                        className="flex-1 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {goal.title}
                      </label>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 text-destructive hover:text-destructive"
                        onClick={() => setDeletingId(goal.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

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
                <Card key={goal.id} className="opacity-60">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Checkbox id={goal.id} checked={goal.completed} onCheckedChange={() => toggleGoal(goal.id)} />
                      <label
                        htmlFor={goal.id}
                        className="flex-1 text-sm font-medium leading-none line-through cursor-pointer"
                      >
                        {goal.title}
                      </label>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 text-destructive hover:text-destructive"
                        onClick={() => setDeletingId(goal.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>

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
