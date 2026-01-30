import type { Transaction, Category } from '@/lib/types'
import { jsPDF } from 'jspdf'

interface ExportOptions {
  transactions: Transaction[]
  categories: Category[]
  currency: string
  locale: string
  period?: string
}

// Format currency for display
function formatCurrency(
  amount: number,
  currency: string,
  locale: string,
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount)
}

// Format date for display
function formatDate(dateStr: string, locale: string): string {
  return new Date(dateStr).toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// Get category name by ID
function getCategoryName(categoryId: string, categories: Category[]): string {
  const category = categories.find((c) => c.id === categoryId)
  return category ? category.name : categoryId
}

// Get type label
function getTypeLabel(type: string, locale: string): string {
  const labels: Record<string, Record<string, string>> = {
    income: { 'pt-BR': 'Receita', 'en-US': 'Income' },
    expense: { 'pt-BR': 'Despesa', 'en-US': 'Expense' },
    investment: { 'pt-BR': 'Investimento', 'en-US': 'Investment' },
  }
  return labels[type]?.[locale] || type
}

/**
 * Export transactions to CSV file
 */
export function exportToCSV(options: ExportOptions): void {
  const { transactions, categories, currency, locale } = options

  // CSV headers
  const headers = [
    locale === 'pt-BR' ? 'Data' : 'Date',
    locale === 'pt-BR' ? 'Tipo' : 'Type',
    locale === 'pt-BR' ? 'Categoria' : 'Category',
    locale === 'pt-BR' ? 'Valor' : 'Amount',
    locale === 'pt-BR' ? 'Descrição' : 'Description',
  ]

  // Sort transactions by date (newest first)
  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )

  // CSV rows
  const rows = sortedTransactions.map((t) => [
    formatDate(t.date, locale),
    getTypeLabel(t.type, locale),
    getCategoryName(t.category, categories),
    formatCurrency(t.amount, currency, locale),
    t.description || '',
  ])

  // Build CSV content
  const csvContent = [
    headers.join(';'),
    ...rows.map((row) =>
      row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(';'),
    ),
  ].join('\n')

  // Add BOM for Excel UTF-8 compatibility
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })

  // Download file
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  const filename = `controlec_transactions_${new Date().toISOString().split('T')[0]}.csv`

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Export monthly summary to PDF file
 */
export function exportToPDF(options: ExportOptions): void {
  const { transactions, categories, currency, locale, period } = options

  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  let yPosition = 20

  // Helper to add text centered
  const addCenteredText = (text: string, y: number, fontSize: number = 12) => {
    doc.setFontSize(fontSize)
    const textWidth = doc.getTextWidth(text)
    doc.text(text, (pageWidth - textWidth) / 2, y)
  }

  // Helper to add line
  const addLine = (y: number) => {
    doc.setDrawColor(200, 200, 200)
    doc.line(20, y, pageWidth - 20, y)
  }

  // Title
  doc.setFont('helvetica', 'bold')
  addCenteredText('ControleC', yPosition, 20)
  yPosition += 10

  doc.setFont('helvetica', 'normal')
  addCenteredText(
    locale === 'pt-BR' ? 'Relatório Financeiro' : 'Financial Report',
    yPosition,
    14,
  )
  yPosition += 8

  if (period) {
    addCenteredText(period, yPosition, 10)
    yPosition += 5
  }

  addCenteredText(
    `${locale === 'pt-BR' ? 'Gerado em' : 'Generated on'}: ${formatDate(new Date().toISOString(), locale)}`,
    yPosition,
    10,
  )
  yPosition += 15

  addLine(yPosition)
  yPosition += 10

  // Calculate totals
  const totals = transactions.reduce(
    (acc, t) => {
      if (t.type === 'income') acc.income += t.amount
      else if (t.type === 'expense') acc.expense += t.amount
      else if (t.type === 'investment') acc.investment += t.amount
      return acc
    },
    { income: 0, expense: 0, investment: 0 },
  )

  const balance = totals.income - totals.expense - totals.investment

  // Summary section
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(locale === 'pt-BR' ? 'Resumo' : 'Summary', 20, yPosition)
  yPosition += 10

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)

  const summaryItems = [
    {
      label: locale === 'pt-BR' ? 'Receitas' : 'Income',
      value: totals.income,
      color: [16, 185, 129],
    },
    {
      label: locale === 'pt-BR' ? 'Despesas' : 'Expenses',
      value: totals.expense,
      color: [239, 68, 68],
    },
    {
      label: locale === 'pt-BR' ? 'Investimentos' : 'Investments',
      value: totals.investment,
      color: [59, 130, 246],
    },
    {
      label: locale === 'pt-BR' ? 'Saldo' : 'Balance',
      value: balance,
      color: balance >= 0 ? [16, 185, 129] : [239, 68, 68],
    },
  ]

  summaryItems.forEach((item) => {
    doc.setTextColor(0, 0, 0)
    doc.text(`${item.label}:`, 20, yPosition)
    doc.setTextColor(item.color[0], item.color[1], item.color[2])
    doc.text(formatCurrency(item.value, currency, locale), 80, yPosition)
    yPosition += 7
  })

  doc.setTextColor(0, 0, 0)
  yPosition += 5
  addLine(yPosition)
  yPosition += 10

  // Expenses by category
  const expensesByCategory: Record<string, number> = {}
  transactions
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      const catName = getCategoryName(t.category, categories)
      expensesByCategory[catName] =
        (expensesByCategory[catName] || 0) + t.amount
    })

  const sortedCategories = Object.entries(expensesByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10) // Top 10

  if (sortedCategories.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text(
      locale === 'pt-BR' ? 'Despesas por Categoria' : 'Expenses by Category',
      20,
      yPosition,
    )
    yPosition += 10

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)

    sortedCategories.forEach(([category, amount]) => {
      const percentage =
        totals.expense > 0 ? ((amount / totals.expense) * 100).toFixed(1) : '0'
      doc.text(`${category}`, 20, yPosition)
      doc.text(
        `${formatCurrency(amount, currency, locale)} (${percentage}%)`,
        100,
        yPosition,
      )
      yPosition += 6

      // Check if we need a new page
      if (yPosition > 270) {
        doc.addPage()
        yPosition = 20
      }
    })

    yPosition += 5
    addLine(yPosition)
    yPosition += 10
  }

  // Recent transactions (last 20)
  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 20)

  if (recentTransactions.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text(
      locale === 'pt-BR' ? 'Últimas Transações' : 'Recent Transactions',
      20,
      yPosition,
    )
    yPosition += 10

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)

    // Table header
    doc.setFont('helvetica', 'bold')
    doc.text(locale === 'pt-BR' ? 'Data' : 'Date', 20, yPosition)
    doc.text(locale === 'pt-BR' ? 'Tipo' : 'Type', 50, yPosition)
    doc.text(locale === 'pt-BR' ? 'Categoria' : 'Category', 80, yPosition)
    doc.text(locale === 'pt-BR' ? 'Valor' : 'Amount', 130, yPosition)
    yPosition += 5
    addLine(yPosition)
    yPosition += 5

    doc.setFont('helvetica', 'normal')

    recentTransactions.forEach((t) => {
      // Check if we need a new page
      if (yPosition > 270) {
        doc.addPage()
        yPosition = 20
      }

      doc.text(formatDate(t.date, locale), 20, yPosition)
      doc.text(getTypeLabel(t.type, locale).substring(0, 10), 50, yPosition)
      doc.text(
        getCategoryName(t.category, categories).substring(0, 20),
        80,
        yPosition,
      )

      // Color based on type
      if (t.type === 'income') {
        doc.setTextColor(16, 185, 129)
      } else if (t.type === 'expense') {
        doc.setTextColor(239, 68, 68)
      } else {
        doc.setTextColor(59, 130, 246)
      }
      doc.text(formatCurrency(t.amount, currency, locale), 130, yPosition)
      doc.setTextColor(0, 0, 0)

      yPosition += 5
    })
  }

  // Footer
  yPosition = doc.internal.pageSize.getHeight() - 10
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  addCenteredText('ControleC - https://controlec.vercel.app', yPosition, 8)

  // Download file
  const filename = `controlec_report_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(filename)
}
