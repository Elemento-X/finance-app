import type { Category } from "./types"

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "moradia", name: "Moradia", type: "mixed", icon: "🏠" },
  { id: "alimentacao", name: "Alimentação", type: "mixed", icon: "🍽️" },
  { id: "transporte", name: "Transporte", type: "mixed", icon: "🚗" },
  { id: "lazer", name: "Lazer", type: "mixed", icon: "🎮" },
  { id: "investimentos", name: "Investimentos", type: "investment", icon: "📈" },
  { id: "saude", name: "Saúde", type: "mixed", icon: "💊" },
  { id: "outros", name: "Outros", type: "mixed", icon: "📦" },
]

export const CURRENCY_OPTIONS = [
  { value: "BRL", label: "R$ (Real)" },
  { value: "USD", label: "$ (Dólar)" },
  { value: "EUR", label: "€ (Euro)" },
]

export const TRANSACTION_COLORS = {
  income: "rgb(34, 197, 94)", // green-500
  expense: "rgb(239, 68, 68)", // red-500
  investment: "rgb(59, 130, 246)", // blue-500
  unexpected: "rgb(249, 115, 22)", // orange-500
}

export const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "pt", label: "Português" },
]
