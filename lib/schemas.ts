import { z } from "zod"

// Transaction Schema
export const TransactionSchema = z.object({
  id: z.string(),
  type: z.enum(["income", "expense", "investment"]),
  amount: z.number().positive(),
  category: z.string(),
  date: z.string(),
  description: z.string().optional(),
  isFuture: z.boolean().optional(),
  isUnexpected: z.boolean().optional(),
  createdAt: z.number().optional(),
})

export type ValidatedTransaction = z.infer<typeof TransactionSchema>

// Category Schema
export const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["mixed", "income", "expense", "investment"]),
  icon: z.string().optional(),
})

export type ValidatedCategory = z.infer<typeof CategorySchema>

// UserProfile Schema
export const UserProfileSchema = z.object({
  name: z.string(),
  currency: z.string(),
  defaultMonth: z.string(),
  language: z.enum(["en", "pt"]).optional(),
  telegramChatId: z.number().nullable().optional(),
})

export type ValidatedUserProfile = z.infer<typeof UserProfileSchema>

// Goal Schema
export const GoalSchema = z.object({
  id: z.string(),
  title: z.string(),
  completed: z.boolean(),
  createdAt: z.string(),
})

export type ValidatedGoal = z.infer<typeof GoalSchema>

// Asset Schema
export const AssetSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  name: z.string(),
  assetClass: z.enum(["stocks", "fiis", "fixed-income", "etfs", "crypto"]),
  quantity: z.number().positive(),
  averagePrice: z.number().positive(),
  totalInvested: z.number(),
  purchaseDate: z.string(),
  createdAt: z.number(),
})

export type ValidatedAsset = z.infer<typeof AssetSchema>

// Validation result type
export interface ValidationResult<T> {
  valid: T[]
  invalidCount: number
}

// Generic validation function
export function validateArray<T>(
  data: unknown[],
  schema: z.ZodType<T>
): ValidationResult<T> {
  const valid: T[] = []
  let invalidCount = 0

  for (const item of data) {
    const result = schema.safeParse(item)
    if (result.success) {
      valid.push(result.data)
    } else {
      invalidCount++
      console.warn("[ControleC] Invalid item found:", result.error.issues)
    }
  }

  return { valid, invalidCount }
}

// Validate single object (for profile)
export function validateObject<T>(
  data: unknown,
  schema: z.ZodType<T>,
  defaultValue: T
): { value: T; isValid: boolean } {
  const result = schema.safeParse(data)
  if (result.success) {
    return { value: result.data, isValid: true }
  }
  console.warn("[ControleC] Invalid object found:", result.error.issues)
  return { value: defaultValue, isValid: false }
}
