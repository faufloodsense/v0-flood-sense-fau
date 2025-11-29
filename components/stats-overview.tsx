"use client"

import { Card } from "@/components/ui/card"
import { Activity, AlertTriangle, Droplets, Wifi, MapPin, Battery, FileText, ChevronRight, Waves } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { getFloodStatus, isModerateOrHigher } from "@/lib/flood-status"

type Sensor = {
  id: string
  device_id: string
  name: string
  latitude: number
  longitude: number
  location_description: string
  notes: string | null
  status: string
  latest_reading?: {
    distance_mm: number
    battery_level: number
    received_at: string
    water_depth?: number | null
  }
}

type FloodingAlert = {
  type: "flooding"
  sensor: Sensor
  floodStatus: ReturnType<typeof getFloodStatus>
}

type BatteryAlert = {
  type: "battery"
  sensor: Sensor
  batteryLevel: number
}

type Alert = FloodingAlert | BatteryAlert

type StatsOverviewProps = {
  sensorsCount: number
  avgWaterM: number | null
  networkHealthPct: number | null
  criticalAlertsCount: number
  sensors?: Sensor[]
}

export function StatsOverview({
  sensorsCount,
  avgWaterM,
  networkHealthPct,
  criticalAlertsCount,
  sensors = [],
}: StatsOverviewProps) {
  const alerts: Alert[] = []

  sensors.forEach((sensor) => {
    // Check for flooding alerts (moderate or higher)
    const floodStatus = getFloodStatus(sensor.latest_reading?.water_depth)
    if (isModerateOrHigher(floodStatus)) {
      alerts.push({
        type: "flooding",
        sensor,
        floodStatus,
      })
    }

    // Check for low battery alerts (below 20%)
    const batteryLevel = sensor.latest_reading?.battery_level ?? 100
    if (batteryLevel < 20) {
      alerts.push({
        type: "battery",
        sensor,
        batteryLevel,
      })
    }
  })

  // Sort alerts by severity (extreme flooding first, then by battery level)
  alerts.sort((a, b) => {
    if (a.type === "flooding" && b.type === "flooding") {
      const levelOrder = { extreme: 0, major: 1, moderate: 2, low: 3, none: 4 }
      return levelOrder[a.floodStatus.level] - levelOrder[b.floodStatus.level]
    }
    if (a.type === "flooding") return -1
    if (b.type === "flooding") return 1
    return (a as BatteryAlert).batteryLevel - (b as BatteryAlert).batteryLevel
  })

  const healthTrend =
    networkHealthPct == null
      ? "warning"
      : networkHealthPct >= 95
        ? "up"
        : networkHealthPct >= 80
          ? "warning"
          : "critical"

  const critTrend = alerts.length > 0 ? "critical" : "up"

  const stats = [
    {
      label: "Active Sensors",
      value: sensorsCount.toString(),
      change: `${sensorsCount} currently online`,
      icon: Wifi,
      trend: "up",
      clickable: true,
      dialogType: "sensors",
    },
    {
      label: "Critical Alerts",
      value: String(alerts.length),
      change: alerts.length > 0 ? "Immediate attention required" : "No critical alerts",
      icon: AlertTriangle,
      trend: critTrend,
      clickable: true,
      dialogType: "alerts",
    },
    {
      label: "Avg Water Level",
      value: avgWaterM != null ? `${avgWaterM.toFixed(2)}m` : "—",
      change: avgWaterM != null ? "Live average (latest readings)" : "No recent readings",
      icon: Droplets,
      trend: avgWaterM != null ? "warning" : "up",
      clickable: false,
      dialogType: null,
    },
    {
      label: "Network Health",
      value: networkHealthPct != null ? `${networkHealthPct.toFixed(1)}%` : "—",
      change:
        networkHealthPct != null
          ? networkHealthPct >= 95
            ? "All systems operational"
            : networkHealthPct >= 80
              ? "Degraded performance"
              : "Impaired"
          : "No recent heartbeats",
      icon: Activity,
      trend: healthTrend,
      clickable: false,
      dialogType: null,
    },
  ] as const

  const getBatteryColor = (level: number) => {
    if (level > 80) return "text-success"
    if (level > 50) return "text-warning"
    return "text-destructive"
  }

  const getFloodBadgeStyle = (level: string) => {
    switch (level) {
      case "extreme":
        return "bg-[#7f1d1d] text-white border-[#7f1d1d]"
      case "major":
        return "bg-destructive text-destructive-foreground border-destructive"
      case "moderate":
        return "bg-orange-500 text-white border-orange-500"
      default:
        return "bg-warning text-warning-foreground border-warning"
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon as any
        const cardContent = (
          <Card
            key={stat.label}
            className={`p-6 bg-card border-border ${stat.clickable ? "cursor-pointer hover:bg-secondary/50 transition-colors" : ""}`}
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                <p
                  className={`text-xs ${
                    stat.trend === "critical"
                      ? "text-destructive"
                      : stat.trend === "warning"
                        ? "text-warning"
                        : "text-success"
                  }`}
                >
                  {stat.change}
                </p>
              </div>
              <div
                className={`p-3 rounded-lg ${
                  stat.trend === "critical"
                    ? "bg-destructive/10"
                    : stat.trend === "warning"
                      ? "bg-warning/10"
                      : "bg-success/10"
                }`}
              >
                <Icon
                  className={`h-6 w-6 ${
                    stat.trend === "critical"
                      ? "text-destructive"
                      : stat.trend === "warning"
                        ? "text-warning"
                        : "text-success"
                  }`}
                />
              </div>
            </div>
          </Card>
        )

        // Active Sensors Dialog
        if (stat.clickable && stat.dialogType === "sensors") {
          return (
            <Dialog key={stat.label}>
              <DialogTrigger asChild>{cardContent}</DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] z-[9999]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Wifi className="h-5 w-5" />
                    Active Sensors
                  </DialogTitle>
                  <DialogDescription>Click on a sensor to view detailed readings</DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                  <div className="space-y-4">
                    {sensors.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">No sensors registered yet.</p>
                    ) : (
                      sensors.map((sensor) => (
                        <Link href={`/sensors/${sensor.id}`} key={sensor.id}>
                          <Card className="p-4 bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer group">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-foreground">{sensor.name || sensor.device_id}</h3>
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant="outline"
                                    className={
                                      sensor.status === "active"
                                        ? "bg-success/10 text-success border-success/20"
                                        : "bg-muted text-muted-foreground"
                                    }
                                  >
                                    {sensor.status}
                                  </Badge>
                                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                                </div>
                              </div>

                              <div className="grid gap-2 text-sm">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Battery
                                    className={`h-4 w-4 ${getBatteryColor(sensor.latest_reading?.battery_level ?? 0)}`}
                                  />
                                  <span>Battery:</span>
                                  <span
                                    className={`font-medium ${getBatteryColor(sensor.latest_reading?.battery_level ?? 0)}`}
                                  >
                                    {sensor.latest_reading?.battery_level?.toFixed(1) ?? "—"}%
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <MapPin className="h-4 w-4" />
                                  <span>Location:</span>
                                  <span className="font-medium text-foreground">
                                    {sensor.latitude?.toFixed(4)}, {sensor.longitude?.toFixed(4)}
                                  </span>
                                </div>

                                <div className="flex items-start gap-2 text-muted-foreground">
                                  <MapPin className="h-4 w-4 mt-0.5" />
                                  <span>Description:</span>
                                  <span className="font-medium text-foreground">
                                    {sensor.location_description || "—"}
                                  </span>
                                </div>

                                {sensor.notes && (
                                  <div className="flex items-start gap-2 text-muted-foreground">
                                    <FileText className="h-4 w-4 mt-0.5" />
                                    <span>Notes:</span>
                                    <span className="font-medium text-foreground">{sensor.notes}</span>
                                  </div>
                                )}

                                {sensor.latest_reading?.received_at && (
                                  <div className="text-xs text-muted-foreground pt-1 border-t border-border mt-2">
                                    Last reading: {new Date(sensor.latest_reading.received_at).toLocaleString()}
                                  </div>
                                )}
                              </div>
                            </div>
                          </Card>
                        </Link>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          )
        }

        if (stat.clickable && stat.dialogType === "alerts") {
          return (
            <Dialog key={stat.label}>
              <DialogTrigger asChild>{cardContent}</DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] z-[9999]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Critical Alerts
                  </DialogTitle>
                  <DialogDescription>Flooding alerts and low battery warnings</DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                  <div className="space-y-4">
                    {alerts.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-success/10 mb-4">
                          <Activity className="h-6 w-6 text-success" />
                        </div>
                        <p className="text-muted-foreground">No critical alerts at this time.</p>
                        <p className="text-sm text-muted-foreground mt-1">All sensors are operating normally.</p>
                      </div>
                    ) : (
                      alerts.map((alert, index) => (
                        <Link href={`/sensors/${alert.sensor.id}`} key={`${alert.sensor.id}-${alert.type}-${index}`}>
                          <Card
                            className={`p-4 transition-colors cursor-pointer group ${
                              alert.type === "flooding"
                                ? "bg-destructive/10 hover:bg-destructive/20 border-destructive/30"
                                : "bg-warning/10 hover:bg-warning/20 border-warning/30"
                            }`}
                          >
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {alert.type === "flooding" ? (
                                    <Waves className="h-5 w-5 text-destructive" />
                                  ) : (
                                    <Battery className="h-5 w-5 text-warning" />
                                  )}
                                  <h3 className="font-semibold text-foreground">
                                    {alert.sensor.name || alert.sensor.device_id}
                                  </h3>
                                </div>
                                <div className="flex items-center gap-2">
                                  {alert.type === "flooding" ? (
                                    <Badge className={getFloodBadgeStyle(alert.floodStatus.level)}>
                                      {alert.floodStatus.label}
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                                      Low Battery
                                    </Badge>
                                  )}
                                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                                </div>
                              </div>

                              <div className="grid gap-2 text-sm">
                                {alert.type === "flooding" ? (
                                  <>
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <Droplets className="h-4 w-4" />
                                      <span>Water Depth:</span>
                                      <span className="font-medium text-destructive">
                                        {alert.sensor.latest_reading?.water_depth?.toFixed(0) ?? "—"} mm
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <AlertTriangle className="h-4 w-4 text-destructive" />
                                      <span className="text-destructive font-medium">
                                        {alert.floodStatus.level === "extreme" &&
                                          "Extreme flooding detected - Evacuate area immediately"}
                                        {alert.floodStatus.level === "major" && "Major flooding detected - Avoid area"}
                                        {alert.floodStatus.level === "moderate" &&
                                          "Moderate flooding detected - Use caution"}
                                      </span>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <Battery className="h-4 w-4 text-warning" />
                                      <span>Battery Level:</span>
                                      <span className="font-medium text-warning">{alert.batteryLevel.toFixed(1)}%</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <AlertTriangle className="h-4 w-4 text-warning" />
                                      <span className="text-warning font-medium">
                                        Battery replacement recommended soon
                                      </span>
                                    </div>
                                  </>
                                )}

                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <MapPin className="h-4 w-4" />
                                  <span>Location:</span>
                                  <span className="font-medium text-foreground">
                                    {alert.sensor.location_description ||
                                      `${alert.sensor.latitude?.toFixed(4)}, ${alert.sensor.longitude?.toFixed(4)}`}
                                  </span>
                                </div>

                                {alert.sensor.latest_reading?.received_at && (
                                  <div className="text-xs text-muted-foreground pt-1 border-t border-border/50 mt-2">
                                    Last reading: {new Date(alert.sensor.latest_reading.received_at).toLocaleString()}
                                  </div>
                                )}
                              </div>
                            </div>
                          </Card>
                        </Link>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          )
        }

        return cardContent
      })}
    </div>
  )
}
