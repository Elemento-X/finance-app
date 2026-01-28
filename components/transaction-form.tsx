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
import type { Transaction, TransactionType } from "@/lib/types"
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
  const { addTransaction, updateTransaction, categories, profile } = useFinanceStore()
  const t = useTranslation()

  const [type, setType] = useState<TransactionType>("income")
  const [amount, setAmount] = useState("")
  const [category, setCategory] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [description, setDescription] = useState("")
  const [isFuture, setIsFuture] = useState(false)
  const [isUnexpected, setIsUnexpected] = useState(false)

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
      toast.success(t("transaction.created"))
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
