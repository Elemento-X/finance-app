import { describe, it, expect } from "vitest"
import { calculationsService } from "../calculations"
import type { Transaction } from "@/lib/types"

const createTransaction = (
  overrides: Partial<Transaction> & { type: Transaction["type"]; amount: number }
): Transaction => ({
  id: `test-${Date.now()}-${Math.random()}`,
  category: "test-category",
  date: new Date().toISOString().split("T")[0],
  ...overrides,
})

describe("calculationsService", () => {
  describe("calculateTotalByType", () => {
    it("should calculate total for income transactions", () => {
      const transactions: Transaction[] = [
        createTransaction({ type: "income", amount: 1000 }),
        createTransaction({ type: "income", amount: 500 }),
        createTransaction({ type: "expense", amount: 200 }),
      ]

      const total = calculationsService.calculateTotalByType(transactions, "income")
      expect(total).toBe(1500)
    })

    it("should calculate total for expense transactions", () => {
      const transactions: Transaction[] = [
        createTransaction({ type: "expense", amount: 300 }),
        createTransaction({ type: "expense", amount: 150 }),
        createTransaction({ type: "income", amount: 1000 }),
      ]

      const total = calculationsService.calculateTotalByType(transactions, "expense")
      expect(total).toBe(450)
    })

    it("should calculate total for investment transactions", () => {
      const transactions: Transaction[] = [
        createTransaction({ type: "investment", amount: 500 }),
        createTransaction({ type: "investment", amount: 1000 }),
        createTransaction({ type: "income", amount: 2000 }),
      ]

      const total = calculationsService.calculateTotalByType(transactions, "investment")
      expect(total).toBe(1500)
    })

    it("should return 0 for empty array", () => {
      const total = calculationsService.calculateTotalByType([], "income")
      expect(total).toBe(0)
    })

    it("should return 0 when no transactions of given type exist", () => {
      const transactions: Transaction[] = [
        createTransaction({ type: "income", amount: 1000 }),
      ]

      const total = calculationsService.calculateTotalByType(transactions, "expense")
      expect(total).toBe(0)
    })
  })

  describe("calculateBalance", () => {
    it("should calculate balance correctly (income - expenses - investments)", () => {
      const transactions: Transaction[] = [
        createTransaction({ type: "income", amount: 5000 }),
        createTransaction({ type: "expense", amount: 1000 }),
        createTransaction({ type: "expense", amount: 500 }),
        createTransaction({ type: "investment", amount: 1000 }),
      ]

      const balance = calculationsService.calculateBalance(transactions)
      expect(balance).toBe(2500) // 5000 - 1000 - 500 - 1000
    })

    it("should return 0 for empty transactions", () => {
      const balance = calculationsService.calculateBalance([])
      expect(balance).toBe(0)
    })

    it("should handle negative balance", () => {
      const transactions: Transaction[] = [
        createTransaction({ type: "income", amount: 1000 }),
        createTransaction({ type: "expense", amount: 2000 }),
      ]

      const balance = calculationsService.calculateBalance(transactions)
      expect(balance).toBe(-1000)
    })

    it("should handle only income", () => {
      const transactions: Transaction[] = [
        createTransaction({ type: "income", amount: 3000 }),
        createTransaction({ type: "income", amount: 2000 }),
      ]

      const balance = calculationsService.calculateBalance(transactions)
      expect(balance).toBe(5000)
    })
  })

  describe("getExpensesByCategory", () => {
    it("should group expenses by category", () => {
      const transactions: Transaction[] = [
        createTransaction({ type: "expense", amount: 100, category: "food" }),
        createTransaction({ type: "expense", amount: 200, category: "food" }),
        createTransaction({ type: "expense", amount: 300, category: "transport" }),
        createTransaction({ type: "income", amount: 1000, category: "salary" }),
      ]

      const byCategory = calculationsService.getExpensesByCategory(transactions)

      expect(byCategory).toEqual({
        food: 300,
        transport: 300,
      })
    })

    it("should return empty object for no expenses", () => {
      const transactions: Transaction[] = [
        createTransaction({ type: "income", amount: 1000, category: "salary" }),
      ]

      const byCategory = calculationsService.getExpensesByCategory(transactions)
      expect(byCategory).toEqual({})
    })

    it("should handle empty transactions", () => {
      const byCategory = calculationsService.getExpensesByCategory([])
      expect(byCategory).toEqual({})
    })
  })

  describe("calculateUnexpectedIncome", () => {
    it("should calculate total unexpected income", () => {
      const transactions: Transaction[] = [
        createTransaction({ type: "income", amount: 100, isUnexpected: true }),
        createTransaction({ type: "income", amount: 50, isUnexpected: true }),
        createTransaction({ type: "income", amount: 5000, isUnexpected: false }),
        createTransaction({ type: "expense", amount: 200, isUnexpected: true }),
      ]

      const total = calculationsService.calculateUnexpectedIncome(transactions)
      expect(total).toBe(150)
    })

    it("should return 0 when no unexpected income", () => {
      const transactions: Transaction[] = [
        createTransaction({ type: "income", amount: 5000 }),
        createTransaction({ type: "expense", amount: 200, isUnexpected: true }),
      ]

      const total = calculationsService.calculateUnexpectedIncome(transactions)
      expect(total).toBe(0)
    })
  })

  describe("calculateUnexpectedExpenses", () => {
    it("should calculate total unexpected expenses", () => {
      const transactions: Transaction[] = [
        createTransaction({ type: "expense", amount: 500, isUnexpected: true }),
        createTransaction({ type: "expense", amount: 300, isUnexpected: true }),
        createTransaction({ type: "expense", amount: 100, isUnexpected: false }),
        createTransaction({ type: "income", amount: 50, isUnexpected: true }),
      ]

      const total = calculationsService.calculateUnexpectedExpenses(transactions)
      expect(total).toBe(800)
    })

    it("should return 0 when no unexpected expenses", () => {
      const transactions: Transaction[] = [
        createTransaction({ type: "expense", amount: 500 }),
        createTransaction({ type: "income", amount: 50, isUnexpected: true }),
      ]

      const total = calculationsService.calculateUnexpectedExpenses(transactions)
      expect(total).toBe(0)
    })
  })

  describe("filterTransactionsByPeriod", () => {
    it("should filter transactions by month", () => {
      const today = new Date()
      const thisMonth = today.toISOString().split("T")[0]
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 15)
        .toISOString()
        .split("T")[0]

      const transactions: Transaction[] = [
        createTransaction({ type: "income", amount: 1000, date: thisMonth }),
        createTransaction({ type: "expense", amount: 500, date: thisMonth }),
        createTransaction({ type: "income", amount: 2000, date: lastMonth }),
      ]

      const filtered = calculationsService.filterTransactionsByPeriod(
        transactions,
        "month",
        today
      )

      expect(filtered).toHaveLength(2)
      expect(filtered.every((t) => t.date === thisMonth)).toBe(true)
    })

    it("should filter transactions by year", () => {
      const today = new Date()
      const thisYear = today.toISOString().split("T")[0]
      const lastYear = new Date(today.getFullYear() - 1, 6, 15)
        .toISOString()
        .split("T")[0]

      const transactions: Transaction[] = [
        createTransaction({ type: "income", amount: 1000, date: thisYear }),
        createTransaction({ type: "expense", amount: 500, date: thisYear }),
        createTransaction({ type: "income", amount: 2000, date: lastYear }),
      ]

      const filtered = calculationsService.filterTransactionsByPeriod(
        transactions,
        "year",
        today
      )

      expect(filtered).toHaveLength(2)
    })

    it("should return empty array for no matching transactions", () => {
      const today = new Date()
      const lastYear = new Date(today.getFullYear() - 1, 6, 15)
        .toISOString()
        .split("T")[0]

      const transactions: Transaction[] = [
        createTransaction({ type: "income", amount: 2000, date: lastYear }),
      ]

      const filtered = calculationsService.filterTransactionsByPeriod(
        transactions,
        "month",
        today
      )

      expect(filtered).toHaveLength(0)
    })
  })

  describe("getMonthlyEvolution", () => {
    it("should return array with correct structure", () => {
      const transactions: Transaction[] = [
        createTransaction({
          type: "income",
          amount: 5000,
          date: new Date().toISOString().split("T")[0],
        }),
        createTransaction({
          type: "expense",
          amount: 1000,
          date: new Date().toISOString().split("T")[0],
        }),
      ]

      const evolution = calculationsService.getMonthlyEvolution(transactions, 6)

      expect(evolution).toHaveLength(6)
      expect(evolution[0]).toHaveProperty("month")
      expect(evolution[0]).toHaveProperty("income")
      expect(evolution[0]).toHaveProperty("expense")
      expect(evolution[0]).toHaveProperty("investment")
      expect(evolution[0]).toHaveProperty("balance")
    })

    it("should calculate balance correctly for each month", () => {
      const today = new Date()
      const thisMonth = today.toISOString().split("T")[0]

      const transactions: Transaction[] = [
        createTransaction({ type: "income", amount: 5000, date: thisMonth }),
        createTransaction({ type: "expense", amount: 2000, date: thisMonth }),
        createTransaction({ type: "investment", amount: 1000, date: thisMonth }),
      ]

      const evolution = calculationsService.getMonthlyEvolution(transactions, 1)

      expect(evolution[0].income).toBe(5000)
      expect(evolution[0].expense).toBe(2000)
      expect(evolution[0].investment).toBe(1000)
      expect(evolution[0].balance).toBe(2000) // 5000 - 2000 - 1000
    })
  })
})
