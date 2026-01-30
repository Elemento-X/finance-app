'use client'

import { useInvestmentsStore } from '@/hooks/use-investments-store'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, Info, XCircle } from 'lucide-react'

export function AlertsList() {
  const { alerts } = useInvestmentsStore()

  if (alerts.length === 0) return null

  return (
    <div className="space-y-2 mb-6">
      {alerts.map((alert) => {
        const Icon =
          alert.severity === 'error'
            ? XCircle
            : alert.severity === 'warning'
              ? AlertTriangle
              : Info

        return (
          <Alert
            key={alert.id}
            variant={
              alert.severity === 'error' || alert.severity === 'warning'
                ? 'destructive'
                : 'default'
            }
          >
            <Icon className="h-4 w-4" />
            <AlertDescription>{alert.message}</AlertDescription>
          </Alert>
        )
      })}
    </div>
  )
}
