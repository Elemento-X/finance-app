"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import type { Transaction, TransactionType, RecurringTransaction, RecurringFrequency } from "@/lib/types"
import { useFinanceStore } from "@/hooks/use-finance-store"
import { formatCurrencyInput } from "@/utils/formatters"
import { useTranslation } from "@/lib/i18n"
import { toast } from "sonner"

interface TransactionFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction?: Transaction
  mode?: "create" | "edit"
}

export function TransactionForm({ open, onOpenChange, transaction, mode = "create" }: TransactionFormProps) {
  const { addTransaction, updateTransaction, addRecurringTransaction, categories, profile } = useFinanceStore()
  const t = useTranslation()

  const [type, setType] = useState<TransactionType>("income")
  const [amount, setAmount] = useState("")
  const [category, setCategory] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [description, setDescription] = useState("")
  const [isFuture, setIsFuture] = useState(false)
  const [isUnexpected, setIsUnexpected] = useState(false)
  const [isRecurring, setIsRecurring] = useState(false)
  const [frequency, setFrequency] = useState<RecurringFrequency>("monthly")
  const [dayOfWeek, setDayOfWeek] = useState(1)
  const [dayOfMonth, setDayOfMonth] = useState(1)
  const [monthOfYear, setMonthOfYear] = useState(1)

  useEffect(() => {
    if (transaction && mode === "edit") {
      setType(transaction.type)
      setAmount(transaction.amount.toFixed(2).replace(".", ","))
      setCategory(transaction.category)
      setDate(transaction.date)
      setDescription(transaction.description || "")
      setIsFuture(transaction.isFuture || false)
      setIsUnexpected(transaction.isUnexpected || false)
    } else if (!open) {
      setType("income")
      setAmount("")
      setCategory("")
      setDate(new Date().toISOString().split("T")[0])
      setDescription("")
      setIsFuture(false)
      setIsUnexpected(false)
      setIsRecurring(false)
      setFrequency("monthly")
      setDayOfWeek(1)
      setDayOfMonth(1)
      setMonthOfYear(1)
    }
  }, [transaction, mode, open])

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrencyInput(e.target.value, profile.currency)
    setAmount(formatted)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!type || !amount || !category || !date) {
      toast.error(t("transaction.fillRequired"))
      return
    }

    const numericValue = amount.replace(/[^\d,]/g, "")
    const parsedAmount = Number.parseFloat(numericValue.replace(/\./g, "").replace(",", "."))

    if (parsedAmount <= 0) {
      toast.error(t("transaction.amountPositive"))
      return
    }

    const transactionData: Transaction = {
      id: transaction?.id || `${Date.now()}-${Math.random()}`,
      type,
      amount: parsedAmount,
      category,
      date,
      description: description || undefined,
      isFuture,
      isUnexpected,
      createdAt: transaction?.createdAt || Date.now(),
    }

    if (mode === "edit" && transaction) {
      updateTransaction(transaction.id, transactionData)
      toast.success(t("transaction.updated"))
    } else {
      addTransaction(transactionData)

      // Create recurring transaction if checkbox is checked
      if (isRecurring) {
        const categoryName = categories.find(c => c.id === category)?.name || category
        const recurringData: RecurringTransaction = {
          id: `recurring-${Date.now()}`,
          type,
          amount: parsedAmount,
          category: categoryName,
          description: description || undefined,
          frequency,
          dayOfWeek: frequency === "weekly" ? dayOfWeek : undefined,
          dayOfMonth: frequency === "monthly" || frequency === "yearly" ? dayOfMonth : undefined,
          monthOfYear: frequency === "yearly" ? monthOfYear : undefined,
          startDate: date,
          isActive: true,
          createdAt: new Date().toISOString(),
        }
        addRecurringTransaction(recurringData)
        toast.success(t("recurring.addSuccess"))
      } else {
        toast.success(t("transaction.created"))
      }
    }

    onOpenChange(false)
  }

  const typeOptions = [
    { value: "income", label: t("type.income"), color: "text-income" },
    { value: "expense", label: t("type.expense"), color: "text-expense" },
    { value: "investment", label: t("type.investment"), color: "text-investment" },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? t("transaction.edit") : t("transaction.new")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">{t("transaction.type")} *</Label>
            <Select value={type} onValueChange={(value) => setType(value as TransactionType)}>
              <SelectTrigger id="type">
                <SelectValue placeholder={t("transaction.selectType")} />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <span className={option.color}>{option.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">{t("transaction.amount")} *</Label>
            <Input
              id="amount"
              type="text"
              value={amount}
              onChange={handleAmountChange}
              placeholder={formatCurrencyInput("0", profile.currency)}
              className="text-lg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">{t("transaction.category")} *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category">
                <SelectValue placeholder={t("transaction.selectCategory")} />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">{t("transaction.date")} *</Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="dark:[color-scheme:dark]" />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="isFuture" checked={isFuture} onCheckedChange={(checked) => setIsFuture(checked as boolean)} />
            <Label htmlFor="isFuture" className="text-sm font-normal cursor-pointer">
              {t("transaction.future")}
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isUnexpected"
              checked={isUnexpected}
              onCheckedChange={(checked) => setIsUnexpected(checked as boolean)}
            />
            <Label htmlFor="isUnexpected" className="text-sm font-normal cursor-pointer">
              {t("transaction.unexpected")}
            </Label>
          </div>

          {/* Recurring transaction option - only show in create mode */}
          {mode === "create" && (
            <>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isRecurring"
                  checked={isRecurring}
                  onCheckedChange={(checked) => setIsRecurring(checked as boolean)}
                />
                <Label htmlFor="isRecurring" className="text-sm font-normal cursor-pointer">
                  {t("recurring.repeatAutomatically")}
                </Label>
              </div>

              {isRecurring && (
                <div className="space-y-3 pl-6 border-l-2 border-primary/20">
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

                  {frequency === "weekly" && (
                    <div className="space-y-2">
                      <Label>{t("recurring.dayOfWeek")}</Label>
                      <Select value={dayOfWeek.toString()} onValueChange={(v) => setDayOfWeek(parseInt(v))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">{t("recurring.sunday")}</SelectItem>
                          <SelectItem value="1">{t("recurring.monday")}</SelectItem>
                          <SelectItem value="2">{t("recurring.tuesday")}</SelectItem>
                          <SelectItem value="3">{t("recurring.wednesday")}</SelectItem>
                          <SelectItem value="4">{t("recurring.thursday")}</SelectItem>
                          <SelectItem value="5">{t("recurring.friday")}</SelectItem>
                          <SelectItem value="6">{t("recurring.saturday")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {(frequency === "monthly" || frequency === "yearly") && (
                    <div className="space-y-2">
                      <Label>{t("recurring.dayOfMonth")}</Label>
                      <Select value={dayOfMonth.toString()} onValueChange={(v) => setDayOfMonth(parseInt(v))}>
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

                  {frequency === "yearly" && (
                    <div className="space-y-2">
                      <Label>{t("recurring.monthOfYear")}</Label>
                      <Select value={monthOfYear.toString()} onValueChange={(v) => setMonthOfYear(parseInt(v))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[
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
                          ].map((month) => (
                            <SelectItem key={month.value} value={month.value}>
                              {month.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">{t("transaction.description")}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("transaction.descriptionPlaceholder")}
              rows={3}
            />
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
