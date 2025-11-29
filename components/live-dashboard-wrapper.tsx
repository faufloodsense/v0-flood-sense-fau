"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { StatsOverview } from "@/components/stats-overview"
import { FloodHeatmap } from "@/components/flood-heatmap"
import { WaterLevelChart } from "@/components/water-level-chart"
import { SensorStatusChart } from "@/components/sensor-status-chart"
import { AlertsFeed } from "@/components/alerts-feed"
import { ActiveSensorsTable } from "@/components/active-sensors-table"
import { WeatherCard } from "@/components/weather-card"
import ExportButton from "@/components/export-button"
import { Badge } from "@/components/ui/badge"
import { Wifi, WifiOff } from "lucide-react"
import { getFloodStatus, isModerateOrHigher, isLowOrBelow } from "@/lib/flood-status"
import { FloodAlertToast, type FloodAlert, useAlertAutoDismiss } from "@/components/flood-alert-toast"

interface Sensor {
  id: string
  device_id: string
  name: string
  latitude: number
  longitude: number
  location_description: string
  status: string
  notes?: string
  latest_reading?: {
    distance_mm: number
    battery_level: number
    received_at: string
    water_depth?: number | null
  }
}

interface LiveDashboardWrapperProps {
  initialSensors: Sensor[]
}

export function LiveDashboardWrapper({ initialSensors }: LiveDashboardWrapperProps) {
  const [sensors, setSensors] = useState<Sensor[]>(initialSensors)
  const [isLive, setIsLive] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const previousStatusRef = useRef<Map<string, ReturnType<typeof getFloodStatus>>>(new Map())
  const [floodAlerts, setFloodAlerts] = useState<FloodAlert[]>([])
  const isFirstLoad = useRef(true)

  const dismissAlert = useCallback((id: string) => {
    setFloodAlerts((prev) => prev.filter((alert) => alert.id !== id))
  }, [])

  useAlertAutoDismiss(floodAlerts, dismissAlert)

  const checkFloodStatusChanges = useCallback((newSensors: Sensor[]) => {
    // Skip on first load to avoid false alerts
    if (isFirstLoad.current) {
      // Initialize previous status map
      newSensors.forEach((sensor) => {
        const status = getFloodStatus(sensor.latest_reading?.water_depth)
        previousStatusRef.current.set(sensor.id, status)
      })
      isFirstLoad.current = false
      return
    }

    const newAlerts: FloodAlert[] = []

    newSensors.forEach((sensor) => {
      const currentStatus = getFloodStatus(sensor.latest_reading?.water_depth)
      const previousStatus = previousStatusRef.current.get(sensor.id)

      if (previousStatus && previousStatus.level !== currentStatus.level) {
        // Check for escalation: from low/below to moderate/above
        if (isLowOrBelow(previousStatus) && isModerateOrHigher(currentStatus)) {
          newAlerts.push({
            id: `${sensor.id}-${Date.now()}`,
            sensorName: sensor.name,
            deviceId: sensor.device_id,
            type: "escalation",
            fromLevel: previousStatus.level,
            toLevel: currentStatus.level,
            timestamp: new Date(),
          })
        }
        // Check for recovery: from moderate/above to low/below
        else if (isModerateOrHigher(previousStatus) && isLowOrBelow(currentStatus)) {
          newAlerts.push({
            id: `${sensor.id}-${Date.now()}`,
            sensorName: sensor.name,
            deviceId: sensor.device_id,
            type: "recovery",
            fromLevel: previousStatus.level,
            toLevel: currentStatus.level,
            timestamp: new Date(),
          })
        }
      }

      // Update previous status
      previousStatusRef.current.set(sensor.id, currentStatus)
    })

    if (newAlerts.length > 0) {
      setFloodAlerts((prev) => [...newAlerts, ...prev].slice(0, 10)) // Keep max 10 alerts
    }
  }, [])

  // Function to fetch fresh sensor data
  const refreshData = useCallback(async () => {
    try {
      const response = await fetch("/api/sensors/live")
      if (response.ok) {
        const data = await response.json()
        checkFloodStatusChanges(data.sensors)
        setSensors(data.sensors)
        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error("Failed to refresh sensor data:", error)
    }
  }, [checkFloodStatusChanges])

  useEffect(() => {
    initialSensors.forEach((sensor) => {
      const status = getFloodStatus(sensor.latest_reading?.water_depth)
      previousStatusRef.current.set(sensor.id, status)
    })
    isFirstLoad.current = false

    const supabase = createClient()

    // Subscribe to real-time changes on sensor_readings table
    const channel = supabase
      .channel("sensor_readings_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sensor_readings",
        },
        () => {
          // New reading inserted - refresh all data
          refreshData()
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sensors",
        },
        () => {
          // Sensor updated (e.g., calibration) - refresh all data
          refreshData()
        },
      )
      .subscribe((status) => {
        setIsLive(status === "SUBSCRIBED")
      })

    // Also poll every 30 seconds as a fallback
    const pollInterval = setInterval(refreshData, 30000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(pollInterval)
    }
  }, [refreshData, initialSensors])

  // Calculate stats
  const readingsM = sensors
    .map((s) => (s.latest_reading?.distance_mm != null ? s.latest_reading.distance_mm / 1000 : null))
    .filter((v): v is number => v != null)

  const avgWaterM = readingsM.length
    ? Number((readingsM.reduce((a, b) => a + b, 0) / readingsM.length).toFixed(2))
    : null

  const FRESH_MINUTES = 15
  const cutoff = Date.now() - FRESH_MINUTES * 60 * 1000
  const onlineCount = sensors.filter((s) => {
    const ts = s.latest_reading?.received_at
    return ts ? new Date(ts).getTime() >= cutoff : false
  }).length
  const networkHealthPct = sensors.length > 0 ? Number(((onlineCount / sensors.length) * 100).toFixed(1)) : null

  const criticalAlertsCount = sensors.filter((s) => s.status === "critical").length

  return (
    <>
      <FloodAlertToast alerts={floodAlerts} onDismiss={dismissAlert} />

      <StatsOverview
        sensorsCount={sensors.length}
        avgWaterM={avgWaterM}
        networkHealthPct={networkHealthPct}
        criticalAlertsCount={criticalAlertsCount}
        sensors={sensors}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">City Flood Map</h2>
          <Badge variant={isLive ? "default" : "secondary"} className="flex items-center gap-1">
            {isLive ? (
              <>
                <Wifi className="h-3 w-3" />
                <span>Live</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3" />
                <span>Connecting...</span>
              </>
            )}
          </Badge>
          <span className="text-xs text-muted-foreground">Last update: {lastUpdate.toLocaleTimeString()}</span>
        </div>
        <ExportButton all />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <FloodHeatmap sensors={sensors} key={lastUpdate.getTime()} />
        </div>
        <div className="space-y-6">
          <WeatherCard />
          <AlertsFeed sensors={sensors} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WaterLevelChart />
        <SensorStatusChart sensors={sensors} />
      </div>

      <ActiveSensorsTable sensors={sensors} />
    </>
  )
}
