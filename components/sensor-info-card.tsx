import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Battery, Clock, Activity, Droplets, AlertTriangle } from "lucide-react"
import { CalibrationButton } from "@/components/calibration-button"

interface SensorInfoCardProps {
  sensor: {
    id: string
    device_id: string
    name: string
    location: string
    latitude: number
    longitude: number
    status: "active" | "inactive" | "maintenance"
    battery: number
    lastUpdate: string
    notes?: string
    waterDepth?: number | null
  }
}

function getFloodStatus(waterDepth: number | null | undefined): {
  level: string
  color: string
  bgColor: string
  borderColor: string
} {
  if (waterDepth === null || waterDepth === undefined) {
    return { level: "No Data", color: "text-muted-foreground", bgColor: "bg-muted/50", borderColor: "border-muted" }
  }
  if (waterDepth < 10) {
    return { level: "No Flooding", color: "text-success", bgColor: "bg-success/10", borderColor: "border-success/20" }
  }
  if (waterDepth < 50) {
    return {
      level: "Low Flooding",
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      borderColor: "border-yellow-500/20",
    }
  }
  if (waterDepth < 150) {
    return {
      level: "Moderate Flooding",
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      borderColor: "border-orange-500/20",
    }
  }
  if (waterDepth < 300) {
    return {
      level: "Major Flooding",
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/20",
    }
  }
  return {
    level: "Extreme Flooding",
    color: "text-red-700",
    bgColor: "bg-red-700/10",
    borderColor: "border-red-700/20",
  }
}

export function SensorInfoCard({ sensor }: SensorInfoCardProps) {
  const floodStatus = getFloodStatus(sensor.waterDepth)

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-foreground">Sensor Information</CardTitle>
          <div className="flex items-center gap-3">
            <CalibrationButton sensorId={sensor.id} deviceId={sensor.device_id} />
            <Badge
              variant={sensor.status === "active" ? "outline" : "secondary"}
              className={sensor.status === "active" ? "bg-success/10 text-success border-success/20" : ""}
            >
              {sensor.status.toUpperCase()}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Droplets className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Water Level</p>
                <p className="text-lg font-semibold text-foreground">
                  {sensor.waterDepth !== null && sensor.waterDepth !== undefined
                    ? `${sensor.waterDepth.toFixed(1)} mm`
                    : "No data"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <AlertTriangle className={`h-5 w-5 mt-0.5 ${floodStatus.color}`} />
              <div>
                <p className="text-sm font-medium text-foreground">Flood Status</p>
                <Badge
                  variant="outline"
                  className={`mt-1 ${floodStatus.bgColor} ${floodStatus.color} ${floodStatus.borderColor}`}
                >
                  {floodStatus.level}
                </Badge>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Location</p>
                <p className="text-sm text-muted-foreground">{sensor.location}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {sensor.latitude.toFixed(4)}°N, {sensor.longitude.toFixed(4)}°W
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Activity className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Device ID</p>
                <p className="text-sm font-mono text-muted-foreground">{sensor.device_id}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Battery className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Battery Level</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        sensor.battery > 80 ? "bg-success" : sensor.battery > 50 ? "bg-warning" : "bg-destructive"
                      }`}
                      style={{ width: `${sensor.battery}%` }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground">{sensor.battery}%</span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Last Update</p>
                <p className="text-sm text-muted-foreground">{sensor.lastUpdate}</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
