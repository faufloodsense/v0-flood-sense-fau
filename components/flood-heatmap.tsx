"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useRef, useCallback } from "react"
import { getFloodStatus } from "@/lib/flood-status"

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
    water_depth?: number | null
  }
}

interface FloodHeatmapProps {
  sensors: Sensor[]
}

export function FloodHeatmap({ sensors }: FloodHeatmapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersLayerRef = useRef<any>(null)
  const leafletRef = useRef<any>(null)

  const updateMarkers = useCallback(() => {
    if (!mapInstanceRef.current || !leafletRef.current) return

    const L = leafletRef.current
    const map = mapInstanceRef.current

    // Clear existing markers
    if (markersLayerRef.current) {
      markersLayerRef.current.clearLayers()
    } else {
      markersLayerRef.current = L.layerGroup().addTo(map)
    }

    const validSensors = sensors.filter(
      (s) => s.latitude != null && s.longitude != null && !isNaN(s.latitude) && !isNaN(s.longitude),
    )

    validSensors.forEach((sensor) => {
      const waterDepth = sensor.latest_reading?.water_depth
      const floodStatus = getFloodStatus(waterDepth)
      const color = floodStatus.mapColor

      const isCritical = waterDepth !== null && waterDepth !== undefined && waterDepth >= 150

      const icon = L.divIcon({
        className: "custom-marker",
        html: `
          <div style="position: relative; width: 24px; height: 24px;">
            ${
              isCritical
                ? `<div style="position: absolute; top: 4px; left: 4px; width: 16px; height: 16px; background: ${color}; border-radius: 50%; opacity: 0.6; animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
                : ""
            }
            <div style="position: absolute; top: 4px; left: 4px; width: 16px; height: 16px; background: ${color}; border: 2px solid white; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      })

      const marker = L.marker([sensor.latitude, sensor.longitude], { icon })

      const popupContent = `
        <div style="font-family: system-ui, -apple-system, sans-serif; min-width: 180px;">
          <div style="font-weight: 700; font-size: 14px; margin-bottom: 8px; font-family: monospace;">${sensor.name}</div>
          <div style="font-size: 12px; color: #666; margin-bottom: 8px;">${sensor.location_description}</div>
          ${
            sensor.latest_reading
              ? `
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
            Water Level: <span style="font-weight: 600; color: #000;">${waterDepth !== null && waterDepth !== undefined ? `${waterDepth.toFixed(1)} mm` : "N/A"}</span>
          </div>
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
            Distance: <span style="font-weight: 600; color: #000;">${sensor.latest_reading.distance_mm != null ? `${sensor.latest_reading.distance_mm}mm` : "N/A"}</span>
          </div>
          <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
            Battery: <span style="font-weight: 600; color: #000;">${sensor.latest_reading.battery_level != null ? `${sensor.latest_reading.battery_level.toFixed(0)}%` : "N/A"}</span>
          </div>
          `
              : '<div style="font-size: 12px; color: #999; margin-bottom: 8px;">No recent data</div>'
          }
          <div style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; background: ${color}; color: white;">
            ${floodStatus.level.toUpperCase()}
          </div>
          <div style="margin-top: 8px;">
            <a href="/sensors/${sensor.id}" style="color: #2563eb; text-decoration: none; font-size: 12px;">View Details →</a>
          </div>
        </div>
      `

      marker.bindPopup(popupContent)
      markersLayerRef.current.addLayer(marker)
    })
  }, [sensors])

  useEffect(() => {
    if (typeof window === "undefined" || !mapRef.current || mapInstanceRef.current) return

    import("leaflet").then((L) => {
      // Check if container is still available
      if (!mapRef.current) return

      leafletRef.current = L

      const validSensors = sensors.filter(
        (s) => s.latitude != null && s.longitude != null && !isNaN(s.latitude) && !isNaN(s.longitude),
      )

      const centerLat = validSensors[0]?.latitude || 29.6516
      const centerLng = validSensors[0]?.longitude || -82.3248

      const map = L.map(mapRef.current, {
        center: [centerLat, centerLng],
        zoom: 12,
        zoomControl: true,
      })

      mapInstanceRef.current = map

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map)

      // Initial markers
      updateMarkers()
    })

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        markersLayerRef.current = null
        leafletRef.current = null
      }
    }
  }, []) // Only run once on mount

  useEffect(() => {
    if (mapInstanceRef.current && leafletRef.current) {
      updateMarkers()
    }
  }, [sensors, updateMarkers])

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-foreground">City Flood Map</CardTitle>
            <CardDescription className="text-muted-foreground">
              Real-time sensor locations and flood levels ({sensors.length} sensors)
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ background: "#22c55e" }} />
              <span className="text-muted-foreground">No Flood</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ background: "#eab308" }} />
              <span className="text-muted-foreground">Low</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ background: "#f97316" }} />
              <span className="text-muted-foreground">Moderate</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ background: "#ef4444" }} />
              <span className="text-muted-foreground">Major</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ background: "#7f1d1d" }} />
              <span className="text-muted-foreground">Extreme</span>
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
