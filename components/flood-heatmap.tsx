"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useRef } from "react"

interface Sensor {
  id: string
  device_id: string
  name: string
  latitude: number
  longitude: number
  location_description: string
  status: string
  latest_reading?: {
    distance_mm: number
    battery_level: number
    received_at: string
  }
}

interface FloodHeatmapProps {
  sensors: Sensor[]
}

export function FloodHeatmap({ sensors }: FloodHeatmapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)

  console.log("[v0] FloodHeatmap: Rendering with", sensors.length, "sensors")

  useEffect(() => {
    if (typeof window !== "undefined" && mapRef.current && !mapInstanceRef.current) {
      // Dynamically import Leaflet to avoid SSR issues
      import("leaflet").then((L) => {
        const centerLat = sensors[0]?.latitude || 29.6516
        const centerLng = sensors[0]?.longitude || -82.3248

        // Initialize map
        const map = L.map(mapRef.current!, {
          center: [centerLat, centerLng],
          zoom: 12,
          zoomControl: true,
        })

        mapInstanceRef.current = map

        // Add OpenStreetMap tiles
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map)

        sensors.forEach((sensor) => {
          let status = "normal"
          const distanceMm = sensor.latest_reading?.distance_mm || 5000

          // Lower distance means water is closer to sensor (higher water level)
          if (distanceMm < 1000 || sensor.status === "critical") {
            status = "critical"
          } else if (distanceMm < 2000 || sensor.status === "warning") {
            status = "warning"
          }

          // Determine marker color based on status
          const color = status === "critical" ? "#ef4444" : status === "warning" ? "#f59e0b" : "#22c55e"

          // Create custom icon with proper centering
          const icon = L.divIcon({
            className: "custom-marker",
            html: `
              <div style="position: relative; width: 24px; height: 24px;">
                ${
                  status === "critical"
                    ? `<div style="position: absolute; top: 4px; left: 4px; width: 16px; height: 16px; background: ${color}; border-radius: 50%; opacity: 0.6; animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
                    : ""
                }
                <div style="position: absolute; top: 4px; left: 4px; width: 16px; height: 16px; background: ${color}; border: 2px solid white; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>
              </div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          })

          // Create marker
          const marker = L.marker([sensor.latitude, sensor.longitude], { icon }).addTo(map)

          // Create popup content
          const popupContent = `
            <div style="font-family: system-ui, -apple-system, sans-serif; min-width: 160px;">
              <div style="font-weight: 700; font-size: 14px; margin-bottom: 8px; font-family: monospace;">${sensor.name}</div>
              <div style="font-size: 12px; color: #666; margin-bottom: 4px;">${sensor.location_description}</div>
              ${
                sensor.latest_reading
                  ? `
              <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
                Distance: <span style="font-weight: 600; color: #000;">${sensor.latest_reading.distance_mm}mm</span>
              </div>
              <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
                Battery: <span style="font-weight: 600; color: #000;">${sensor.latest_reading.battery_level.toFixed(0)}%</span>
              </div>
              `
                  : '<div style="font-size: 12px; color: #999; margin-bottom: 8px;">No recent data</div>'
              }
              <div style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; background: ${color}; color: white;">
                ${status.toUpperCase()}
              </div>
              <div style="margin-top: 8px;">
                <a href="/sensors/${sensor.id}" style="color: #2563eb; text-decoration: none; font-size: 12px;">View Details →</a>
              </div>
            </div>
          `

          marker.bindPopup(popupContent)
        })

        console.log("[v0] FloodHeatmap: Added", sensors.length, "markers to map")
      })
    }

    // Cleanup on unmount
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [sensors])

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-foreground">City Flood Map</CardTitle>
            <CardDescription className="text-muted-foreground">
              Real-time sensor locations and distance measurements ({sensors.length} sensors)
            </CardDescription>
          </div>
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-success" />
              <span className="text-muted-foreground">Normal</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-warning" />
              <span className="text-muted-foreground">Warning</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-destructive" />
              <span className="text-muted-foreground">Critical</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div ref={mapRef} className="w-full h-[500px] rounded-lg overflow-hidden border border-border" />
      </CardContent>
    </Card>
  )
}
