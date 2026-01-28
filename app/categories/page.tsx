"use client"

import { useState } from "react"
import { useFinanceStore } from "@/hooks/use-finance-store"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import { CategoryForm } from "@/app/categories/components/category-form"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import type { Category } from "@/lib/types"
import { useTranslation } from "@/lib/i18n"

export default function CategoriesPage() {
  const { categories, deleteCategory, transactions } = useFinanceStore()
  const t = useTranslation()
  const [editingCategory, setEditingCategory] = useState<Category | undefined>()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const handleDelete = () => {
    if (deletingId) {
      const isUsed = transactions.some((t) => t.category === deletingId)

      if (isUsed) {
        toast.error(t("categories.cannotDelete"))
        setDeletingId(null)
        return
      }

      deleteCategory(deletingId)
      toast.success(t("categories.deleteSuccess"))
      setDeletingId(null)
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "income":
        return t("type.income")
      case "expense":
        return t("type.expense")
      case "investment":
        return t("type.investment")
      case "mixed":
        return t("type.mixed")
      default:
        return type
    }
  }

  const getCategoryUsageCount = (categoryId: string) => {
    return transactions.filter((t) => t.category === categoryId).length
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container px-4 py-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {categories.length} {t("categories.registered")}
          </p>
          <Button
            onClick={() => {
              setEditingCategory(undefined)
              setFormOpen(true)
            }}
          >
            <Plus className="size-4 mr-2" />
            {t("categories.new")}
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => {
            const usageCount = getCategoryUsageCount(category.id)
            return (
              <Card key={category.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{category.icon}</span>
                        <div>
                          <p className="font-medium">{category.name}</p>
                          <Badge variant="outline" className="text-xs mt-1">
                            {getTypeLabel(category.type)}
                          </Badge>
                        </div>
                      </div>

                      {usageCount > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {t("categories.usedIn")} {usageCount}{" "}
                          {usageCount === 1 ? t("categories.transaction") : t("categories.transactions")}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        onClick={() => {
                          setEditingCategory(category)
                          setFormOpen(true)
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 text-destructive hover:text-destructive"
                        onClick={() => setDeletingId(category.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {categories.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">{t("categories.empty")}</p>
              <p className="text-sm text-muted-foreground">{t("categories.emptyDesc")}</p>
            </CardContent>
          </Card>
        )}
      </main>

      <CategoryForm
        open={formOpen}
        onOpenChange={setFormOpen}
        category={editingCategory}
        mode={editingCategory ? "edit" : "create"}
      />

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dialog.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("dialog.confirmDeleteDesc", { item: t("categories.title").toLowerCase() })}
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
