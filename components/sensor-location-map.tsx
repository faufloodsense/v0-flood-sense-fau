"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin } from "lucide-react"

interface SensorLocationMapProps {
  latitude: number
  longitude: number
  sensorId: string
}

export function SensorLocationMap({ latitude, longitude, sensorId }: SensorLocationMapProps) {
  return (
    <Card className="bg-card border-border h-full">
      <CardHeader>
        <CardTitle className="text-foreground">Location</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative w-full h-[200px] bg-secondary rounded-lg overflow-hidden border border-border flex items-center justify-center">
          {/* Placeholder map - replace with actual map integration */}
          <div className="text-center space-y-2">
            <MapPin className="h-12 w-12 text-primary mx-auto" />
            <div>
              <p className="text-sm font-medium text-foreground">{sensorId}</p>
              <p className="text-xs text-muted-foreground">
                {latitude.toFixed(4)}°N, {longitude.toFixed(4)}°W
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
