'use client'

import { useState } from 'react'
import { useFinanceStore } from '@/hooks/use-finance-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Target } from 'lucide-react'
import { toast } from 'sonner'
import type { Goal } from '@/lib/types'
import { useTranslation } from '@/lib/i18n'
import { GoalCard } from './goal-card'
import { GoalFormDialog } from './goal-form-dialog'
import { DeleteGoalDialog } from './delete-goal-dialog'

export function GoalsContent() {
  const { goals, addGoal, updateGoal, toggleGoal, deleteGoal, profile } =
    useFinanceStore()
  const t = useTranslation()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)

  const openNewForm = () => {
    setEditingGoal(null)
    setIsFormOpen(true)
  }

  const openEditForm = (goal: Goal) => {
    setEditingGoal(goal)
    setIsFormOpen(true)
  }

  const handleSubmit = (goalData: Goal) => {
    if (editingGoal) {
      updateGoal(editingGoal.id, goalData)
      toast.success(t('goals.updateSuccess'))
    } else {
      addGoal(goalData)
      toast.success(t('goals.addSuccess'))
    }
    setEditingGoal(null)
  }

  const handleDelete = () => {
    if (deletingId) {
      deleteGoal(deletingId)
      toast.success(t('goals.deleteSuccess'))
      setDeletingId(null)
    }
  }

  const activeGoals = goals.filter((g) => !g.completed)
  const completedGoals = goals.filter((g) => g.completed)

  return (
    <div className="min-h-screen bg-background">
      <main className="container px-4 py-6 space-y-6 max-w-3xl mx-auto">
        {/* Add button */}
        <Card>
          <CardContent className="p-4">
            <Button onClick={openNewForm} className="w-full">
              <Plus className="size-4 mr-2" />
              {t('goals.new')}
            </Button>
          </CardContent>
        </Card>

        {/* Active goals */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Target className="size-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">
              {t('goals.active')} ({activeGoals.length})
            </h2>
          </div>

          {activeGoals.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Target className="size-12 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">{t('goals.empty')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('goals.emptyDesc')}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {activeGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  currency={profile.currency}
                  onEdit={openEditForm}
                  onDelete={setDeletingId}
                  onToggle={toggleGoal}
                />
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
                {t('goals.completed')} ({completedGoals.length})
              </h2>
            </div>

            <div className="space-y-2">
              {completedGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  isCompleted
                  currency={profile.currency}
                  onEdit={openEditForm}
                  onDelete={setDeletingId}
                  onToggle={toggleGoal}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      <GoalFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        editingGoal={editingGoal}
        currency={profile.currency}
        onSubmit={handleSubmit}
      />

      <DeleteGoalDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
        onConfirm={handleDelete}
      />
    </div>
  )
}
