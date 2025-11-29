"use client"

import { useEffect } from "react"
import { AlertTriangle, CheckCircle, X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface FloodAlert {
  id: string
  sensorName: string
  deviceId: string
  type: "escalation" | "recovery"
  fromLevel: string
  toLevel: string
  timestamp: Date
}

interface FloodAlertToastProps {
  alerts: FloodAlert[]
  onDismiss: (id: string) => void
}

export function FloodAlertToast({ alerts, onDismiss }: FloodAlertToastProps) {
  if (alerts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={cn(
            "flex items-start gap-3 p-4 rounded-lg shadow-lg border animate-in slide-in-from-right-full duration-300",
            alert.type === "escalation"
              ? "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800"
              : "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800",
          )}
        >
          {alert.type === "escalation" ? (
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          ) : (
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <p
              className={cn(
                "font-semibold text-sm",
                alert.type === "escalation" ? "text-red-800 dark:text-red-200" : "text-green-800 dark:text-green-200",
              )}
            >
              {alert.type === "escalation" ? "FLOOD ALERT" : "FLOOD RECOVERY"}
            </p>
            <p
              className={cn(
                "text-sm mt-0.5",
                alert.type === "escalation" ? "text-red-700 dark:text-red-300" : "text-green-700 dark:text-green-300",
              )}
            >
              <span className="font-medium">{alert.sensorName}</span> ({alert.deviceId})
            </p>
            <p
              className={cn(
                "text-xs mt-1",
                alert.type === "escalation" ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400",
              )}
            >
              {alert.fromLevel} → {alert.toLevel}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{alert.timestamp.toLocaleTimeString()}</p>
          </div>
          <button
            onClick={() => onDismiss(alert.id)}
            className={cn(
              "p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 flex-shrink-0",
              alert.type === "escalation" ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400",
            )}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}

// Auto-dismiss after 10 seconds
export function useAlertAutoDismiss(alerts: FloodAlert[], onDismiss: (id: string) => void, timeout = 10000) {
  useEffect(() => {
    const timers = alerts.map((alert) => setTimeout(() => onDismiss(alert.id), timeout))
    return () => timers.forEach(clearTimeout)
  }, [alerts, onDismiss, timeout])
}
