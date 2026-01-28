import { describe, it, expect, vi, beforeEach } from "vitest"
import { runMigrations, getCurrentVersion, getDataVersion, safeGetItem, safeSetItem } from "../migrations"

describe("migrations", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe("safeGetItem", () => {
    it("should return default value when key does not exist", () => {
      vi.mocked(localStorage.getItem).mockReturnValue(null)

      const result = safeGetItem("nonexistent", { default: true })
      expect(result).toEqual({ default: true })
    })

    it("should parse and return stored JSON", () => {
      const storedData = { name: "test", value: 123 }
      vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(storedData))

      const result = safeGetItem("testKey", {})
      expect(result).toEqual(storedData)
    })

    it("should return default value on parse error", () => {
      vi.mocked(localStorage.getItem).mockReturnValue("invalid json {{{")

      const result = safeGetItem("testKey", { fallback: true })
      expect(result).toEqual({ fallback: true })
    })

    it("should return default value for array", () => {
      vi.mocked(localStorage.getItem).mockReturnValue(null)

      const result = safeGetItem<string[]>("testKey", [])
      expect(result).toEqual([])
    })
  })

  describe("safeSetItem", () => {
    it("should stringify and store value", () => {
      const data = { name: "test", items: [1, 2, 3] }

      safeSetItem("testKey", data)

      expect(localStorage.setItem).toHaveBeenCalledWith("testKey", JSON.stringify(data))
    })

    it("should handle arrays", () => {
      const data = ["a", "b", "c"]

      safeSetItem("arrayKey", data)

      expect(localStorage.setItem).toHaveBeenCalledWith("arrayKey", JSON.stringify(data))
    })
  })

  describe("getCurrentVersion", () => {
    it("should return current schema version", () => {
      const version = getCurrentVersion()
      expect(version).toBe(2) // Current version is 2
    })
  })

  describe("getDataVersion", () => {
    it("should return 0 when no version stored", () => {
      vi.mocked(localStorage.getItem).mockReturnValue(null)

      const version = getDataVersion()
      expect(version).toBe(0)
    })

    it("should return stored version", () => {
      vi.mocked(localStorage.getItem).mockReturnValue("2")

      const version = getDataVersion()
      expect(version).toBe(2)
    })
  })

  describe("runMigrations", () => {
    it("should not run migrations if already at current version", () => {
      vi.mocked(localStorage.getItem).mockImplementation((key) => {
        if (key === "finance_data_version") return "2"
        return null
      })

      runMigrations()

      // setItem should not be called for version update
      expect(localStorage.setItem).not.toHaveBeenCalledWith(
        "finance_data_version",
        expect.any(String)
      )
    })

    it("should run migration v2 to convert unexpected transactions", () => {
      const oldTransactions = [
        { id: "1", type: "unexpected", amount: 100, category: "misc", date: "2024-01-01" },
        { id: "2", type: "income", amount: 5000, category: "salary", date: "2024-01-01" },
      ]

      vi.mocked(localStorage.getItem).mockImplementation((key) => {
        if (key === "finance_data_version") return "1"
        if (key === "finance_transactions") return JSON.stringify(oldTransactions)
        if (key === "finance_categories") return null
        return null
      })

      runMigrations()

      // Check that transactions were migrated
      expect(localStorage.setItem).toHaveBeenCalledWith(
        "finance_transactions",
        expect.stringContaining('"isUnexpected":true')
      )

      // Check version was updated
      expect(localStorage.setItem).toHaveBeenCalledWith("finance_data_version", "2")
    })

    it("should convert unexpected type to expense with isUnexpected flag", () => {
      const oldTransactions = [
        { id: "1", type: "unexpected", amount: 100, category: "misc", date: "2024-01-01" },
      ]

      let savedTransactions: string | null = null

      vi.mocked(localStorage.getItem).mockImplementation((key) => {
        if (key === "finance_data_version") return "1"
        if (key === "finance_transactions") return JSON.stringify(oldTransactions)
        if (key === "finance_categories") return null
        return null
      })

      vi.mocked(localStorage.setItem).mockImplementation((key, value) => {
        if (key === "finance_transactions") {
          savedTransactions = value
        }
      })

      runMigrations()

      expect(savedTransactions).not.toBeNull()
      const parsed = JSON.parse(savedTransactions!)
      expect(parsed[0].type).toBe("expense")
      expect(parsed[0].isUnexpected).toBe(true)
    })

    it("should preserve existing isUnexpected values and add default false", () => {
      // Include an "unexpected" type to trigger the migration save
      const oldTransactions = [
        { id: "1", type: "income", amount: 100, category: "misc", date: "2024-01-01", isUnexpected: true },
        { id: "2", type: "expense", amount: 50, category: "misc", date: "2024-01-01" },
        { id: "3", type: "unexpected", amount: 200, category: "misc", date: "2024-01-01" },
      ]

      let savedTransactions: string | null = null

      vi.mocked(localStorage.getItem).mockImplementation((key) => {
        if (key === "finance_data_version") return "1"
        if (key === "finance_transactions") return JSON.stringify(oldTransactions)
        if (key === "finance_categories") return null
        return null
      })

      vi.mocked(localStorage.setItem).mockImplementation((key, value) => {
        if (key === "finance_transactions") {
          savedTransactions = value
        }
      })

      runMigrations()

      expect(savedTransactions).not.toBeNull()
      const parsed = JSON.parse(savedTransactions!)
      expect(parsed[0].isUnexpected).toBe(true) // Preserved
      expect(parsed[1].isUnexpected).toBe(false) // Added default
      expect(parsed[2].type).toBe("expense") // Converted from unexpected
      expect(parsed[2].isUnexpected).toBe(true) // Flag set
    })

    it("should migrate categories with unexpected type to expense", () => {
      const oldCategories = [
        { id: "1", name: "Emergencies", type: "unexpected", icon: "!" },
        { id: "2", name: "Food", type: "expense", icon: "F" },
      ]

      let savedCategories: string | null = null

      vi.mocked(localStorage.getItem).mockImplementation((key) => {
        if (key === "finance_data_version") return "1"
        if (key === "finance_transactions") return null
        if (key === "finance_categories") return JSON.stringify(oldCategories)
        return null
      })

      vi.mocked(localStorage.setItem).mockImplementation((key, value) => {
        if (key === "finance_categories") {
          savedCategories = value
        }
      })

      runMigrations()

      expect(savedCategories).not.toBeNull()
      const parsed = JSON.parse(savedCategories!)
      expect(parsed[0].type).toBe("expense")
      expect(parsed[1].type).toBe("expense")
    })
  })
})
