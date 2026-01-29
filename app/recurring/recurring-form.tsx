"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { RecurringTransaction, RecurringFrequency, TransactionType, Category } from "@/lib/types"
import { useTranslation } from "@/lib/i18n"

interface RecurringFormProps {
  categories: Category[]
  initialData?: RecurringTransaction | null
  onSubmit: (data: Omit<RecurringTransaction, "id" | "createdAt" | "lastGeneratedDate">) => void
  onCancel: () => void
}

export function RecurringForm({ categories, initialData, onSubmit, onCancel }: RecurringFormProps) {
  const t = useTranslation()

  const [type, setType] = useState<TransactionType>(initialData?.type ?? "expense")
  const [amount, setAmount] = useState(initialData?.amount?.toString() ?? "")
  const [category, setCategory] = useState(initialData?.category ?? "")
  const [description, setDescription] = useState(initialData?.description ?? "")
  const [frequency, setFrequency] = useState<RecurringFrequency>(initialData?.frequency ?? "monthly")
  const [dayOfWeek, setDayOfWeek] = useState(initialData?.dayOfWeek?.toString() ?? "1")
  const [dayOfMonth, setDayOfMonth] = useState(initialData?.dayOfMonth?.toString() ?? "1")
  const [monthOfYear, setMonthOfYear] = useState(initialData?.monthOfYear?.toString() ?? "1")
  const [startDate, setStartDate] = useState(initialData?.startDate ?? new Date().toISOString().split("T")[0])
  const [endDate, setEndDate] = useState(initialData?.endDate ?? "")
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true)

  // Filter categories based on transaction type
  const filteredCategories = categories.filter(
    (c) => c.type === "mixed" || c.type === type
  )

  // Reset category if current one doesn't match new type
  useEffect(() => {
    const currentCategoryValid = filteredCategories.some((c) => c.name === category)
    if (!currentCategoryValid && filteredCategories.length > 0) {
      setCategory(filteredCategories[0].name)
    }
  }, [type, filteredCategories, category])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return
    }

    if (!category) {
      return
    }

    const data: Omit<RecurringTransaction, "id" | "createdAt" | "lastGeneratedDate"> = {
      type,
      amount: parsedAmount,
      category,
      description: description || undefined,
      frequency,
      dayOfWeek: frequency === "weekly" ? parseInt(dayOfWeek) : undefined,
      dayOfMonth: frequency === "monthly" || frequency === "yearly" ? parseInt(dayOfMonth) : undefined,
      monthOfYear: frequency === "yearly" ? parseInt(monthOfYear) : undefined,
      startDate,
      endDate: endDate || undefined,
      isActive,
    }

    onSubmit(data)
  }

  const days = [
    { value: "0", label: t("recurring.sunday") },
    { value: "1", label: t("recurring.monday") },
    { value: "2", label: t("recurring.tuesday") },
    { value: "3", label: t("recurring.wednesday") },
    { value: "4", label: t("recurring.thursday") },
    { value: "5", label: t("recurring.friday") },
    { value: "6", label: t("recurring.saturday") },
  ]

  const months = [
    { value: "1", label: "Janeiro" },
    { value: "2", label: "Fevereiro" },
    { value: "3", label: "Março" },
    { value: "4", label: "Abril" },
    { value: "5", label: "Maio" },
    { value: "6", label: "Junho" },
    { value: "7", label: "Julho" },
    { value: "8", label: "Agosto" },
    { value: "9", label: "Setembro" },
    { value: "10", label: "Outubro" },
    { value: "11", label: "Novembro" },
    { value: "12", label: "Dezembro" },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Type */}
      <div className="space-y-2">
        <Label>{t("transaction.type")}</Label>
        <Select value={type} onValueChange={(v) => setType(v as TransactionType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="income">{t("type.income")}</SelectItem>
            <SelectItem value="expense">{t("type.expense")}</SelectItem>
            <SelectItem value="investment">{t("type.investment")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Amount */}
      <div className="space-y-2">
        <Label>{t("transaction.amount")}</Label>
        <Input
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          required
        />
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label>{t("transaction.category")}</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger>
            <SelectValue placeholder={t("transaction.selectCategory")} />
          </SelectTrigger>
          <SelectContent>
            {filteredCategories.map((c) => (
              <SelectItem key={c.id} value={c.name}>
                {c.icon && `${c.icon} `}{c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label>{t("transaction.description")}</Label>
        <Input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("transaction.descriptionPlaceholder")}
          maxLength={200}
        />
      </div>

      {/* Frequency */}
      <div className="space-y-2">
        <Label>{t("recurring.frequency")}</Label>
        <Select value={frequency} onValueChange={(v) => setFrequency(v as RecurringFrequency)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="weekly">{t("recurring.frequencyWeekly")}</SelectItem>
            <SelectItem value="monthly">{t("recurring.frequencyMonthly")}</SelectItem>
            <SelectItem value="yearly">{t("recurring.frequencyYearly")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Day of Week (for weekly) */}
      {frequency === "weekly" && (
        <div className="space-y-2">
          <Label>{t("recurring.dayOfWeek")}</Label>
          <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {days.map((day) => (
                <SelectItem key={day.value} value={day.value}>
                  {day.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Day of Month (for monthly/yearly) */}
      {(frequency === "monthly" || frequency === "yearly") && (
        <div className="space-y-2">
          <Label>{t("recurring.dayOfMonth")}</Label>
          <Select value={dayOfMonth} onValueChange={setDayOfMonth}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                <SelectItem key={day} value={day.toString()}>
                  {day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Month of Year (for yearly) */}
      {frequency === "yearly" && (
        <div className="space-y-2">
          <Label>{t("recurring.monthOfYear")}</Label>
          <Select value={monthOfYear} onValueChange={setMonthOfYear}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Start Date */}
      <div className="space-y-2">
        <Label>{t("recurring.startDate")}</Label>
        <Input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          required
        />
      </div>

      {/* End Date (optional) */}
      <div className="space-y-2">
        <Label>{t("recurring.endDate")}</Label>
        <Input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          placeholder={t("recurring.noEndDate")}
        />
        <p className="text-xs text-muted-foreground">{t("recurring.noEndDate")}</p>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button type="submit">
          {initialData ? t("common.update") : t("common.save")}
        </Button>
      </div>
    </form>
  )
}
