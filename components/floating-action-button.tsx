"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { TransactionForm } from "./transaction-form"

export function FloatingActionButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        size="icon"
        className="fixed bottom-6 right-6 size-12 rounded-full shadow-lg hover:shadow-xl transition-shadow z-50"
        onClick={() => setOpen(true)}
      >
        <Plus className="size-5" />
      </Button>

      <TransactionForm open={open} onOpenChange={setOpen} />
    </>
  )
}
