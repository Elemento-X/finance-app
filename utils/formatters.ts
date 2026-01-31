function getLocaleForCurrency(currency: string): string {
  switch (currency) {
    case 'USD':
      return 'en-US'
    case 'EUR':
      return 'de-DE'
    case 'BRL':
    default:
      return 'pt-BR'
  }
}

export function formatCurrency(value: number, currency = 'BRL'): string {
  const locale = getLocaleForCurrency(currency)
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function parseCurrencyInput(value: string): number {
  // Remove everything except numbers and comma/dot
  const cleaned = value.replace(/[^\d,.]/g, '')
  // Replace comma with dot for parsing
  const normalized = cleaned.replace(',', '.')
  return Number.parseFloat(normalized) || 0
}

export function formatCurrencyInput(value: string, currency = 'BRL'): string {
  const locale = getLocaleForCurrency(currency)

  // Remove non-numeric characters
  const cleaned = value.replace(/[^\d]/g, '')

  if (cleaned === '') return ''

  // Convert to number (2 decimal places)
  const number = Number.parseInt(cleaned, 10) / 100

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(number)
}

export function formatDate(date: string | Date): string {
  if (typeof date === 'string') {
    // Parse the date string as local time (YYYY-MM-DD)
    const [year, month, day] = date.split('-').map(Number)
    const d = new Date(year, month - 1, day)
    return d.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    })
  }

  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  })
}
