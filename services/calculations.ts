import type { Transaction, TransactionType } from '@/lib/types'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
  parseISO,
  format,
  isSameMonth,
} from 'date-fns'

export const calculationsService = {
  filterTransactionsByPeriod(
    transactions: Transaction[],
    period: 'day' | 'week' | 'month' | 'year',
    date: Date,
  ): Transaction[] {
    let start: Date
    let end: Date

    switch (period) {
      case 'day':
        start = startOfDay(date)
        end = endOfDay(date)
        break
      case 'week':
        start = startOfWeek(date, { weekStartsOn: 0 })
        end = endOfWeek(date, { weekStartsOn: 0 })
        break
      case 'month':
        start = startOfMonth(date)
        end = endOfMonth(date)
        break
      case 'year':
        start = new Date(date.getFullYear(), 0, 1)
        end = new Date(date.getFullYear(), 11, 31, 23, 59, 59)
        break
      default:
        return transactions
    }

    return transactions.filter((t) => {
      const transactionDate = parseISO(t.date)
      return transactionDate >= start && transactionDate <= end
    })
  },

  calculateTotalByType(
    transactions: Transaction[],
    type: TransactionType,
  ): number {
    return transactions
      .filter((t) => t.type === type)
      .reduce((sum, t) => sum + t.amount, 0)
  },

  calculateBalance(transactions: Transaction[]): number {
    const income = this.calculateTotalByType(transactions, 'income')
    const expense = this.calculateTotalByType(transactions, 'expense')
    const investment = this.calculateTotalByType(transactions, 'investment')

    return income - expense - investment
  },

  getExpensesByCategory(transactions: Transaction[]): Record<string, number> {
    const expenses = transactions.filter((t) => t.type === 'expense')
    return expenses.reduce(
      (acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount
        return acc
      },
      {} as Record<string, number>,
    )
  },

  /**
   * Calculate total unexpected income (positive surprises like finding money)
   */
  calculateUnexpectedIncome(transactions: Transaction[]): number {
    return transactions
      .filter((t) => t.type === 'income' && t.isUnexpected)
      .reduce((sum, t) => sum + t.amount, 0)
  },

  /**
   * Calculate total unexpected expenses (negative surprises like car repairs)
   */
  calculateUnexpectedExpenses(transactions: Transaction[]): number {
    return transactions
      .filter((t) => t.type === 'expense' && t.isUnexpected)
      .reduce((sum, t) => sum + t.amount, 0)
  },

  getMonthlyEvolution(
    transactions: Transaction[],
    months = 12,
  ): Array<{
    month: string
    income: number
    expense: number
    investment: number
    balance: number
  }> {
    const now = new Date()
    const result = []

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthTransactions = transactions.filter((t) =>
        isSameMonth(parseISO(t.date), date),
      )

      const income = this.calculateTotalByType(monthTransactions, 'income')
      const expense = this.calculateTotalByType(monthTransactions, 'expense')
      const investment = this.calculateTotalByType(
        monthTransactions,
        'investment',
      )

      result.push({
        month: format(date, 'MMM/yy'),
        income,
        expense,
        investment,
        balance: income - expense - investment,
      })
    }

    return result
  },
}
