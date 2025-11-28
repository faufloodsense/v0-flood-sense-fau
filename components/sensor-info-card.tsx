import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Battery, Clock, Activity } from "lucide-react"
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
  }
}

export function SensorInfoCard({ sensor }: SensorInfoCardProps) {
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
