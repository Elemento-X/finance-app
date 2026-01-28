export function formatCurrency(value: number, currency = "BRL"): string {
  const currencySymbols: Record<string, string> = {
    BRL: "R$",
    USD: "$",
    EUR: "€",
  }

  const symbol = currencySymbols[currency] || "R$"
  return `${symbol} ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function parseCurrencyInput(value: string): number {
  // Remove everything except numbers and comma/dot
  const cleaned = value.replace(/[^\d,.]/g, "")
  // Replace comma with dot for parsing
  const normalized = cleaned.replace(",", ".")
  return Number.parseFloat(normalized) || 0
}

export function formatCurrencyInput(value: string, currency = "BRL"): string {
  const currencySymbols: Record<string, string> = {
    BRL: "R$",
    USD: "$",
    EUR: "€",
  }

  const symbol = currencySymbols[currency] || "R$"

  // Remove non-numeric characters
  const cleaned = value.replace(/[^\d]/g, "")

  if (cleaned === "") return ""

  // Convert to number and format with comma as decimal separator (Brazilian format)
  const number = Number.parseInt(cleaned, 10) / 100

  // Format: 1.234,56 (Brazilian style)
  const formatted = number.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  return `${symbol} ${formatted}`
}

export function formatDate(date: string | Date): string {
  if (typeof date === "string") {
    // Parse the date string as local time (YYYY-MM-DD)
    const [year, month, day] = date.split("-").map(Number)
    const d = new Date(year, month - 1, day)
    return d.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    })
  }

  return date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  })
}
