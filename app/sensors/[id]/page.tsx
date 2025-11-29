import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { SensorDetailHeader } from "@/components/sensor-detail-header"
import { SensorInfoCard } from "@/components/sensor-info-card"
import { SensorHistoryChart } from "@/components/sensor-history-chart"
import { WaterDepthChart } from "@/components/water-depth-chart"
import { SensorLocationMap } from "@/components/sensor-location-map"
import { PaginatedReadingsTable } from "@/components/paginated-readings-table"

async function getSensorWithLatestReading(sensorId: string) {
  const supabase = await createClient()

  // Fetch sensor data
  const { data: sensor, error: sensorError } = await supabase.from("sensors").select("*").eq("id", sensorId).single()

  if (sensorError || !sensor) {
    return null
  }

  // Fetch latest reading for this sensor
  const { data: latestReading } = await supabase
    .from("sensor_readings")
    .select("*")
    .eq("sensor_id", sensorId)
    .order("received_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  // Get total reading count
  const { count } = await supabase
    .from("sensor_readings")
    .select("*", { count: "exact", head: true })
    .eq("sensor_id", sensorId)

  return {
    ...sensor,
    latest_reading: latestReading,
    total_readings: count ?? 0,
  }
}

export default async function SensorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sensor = await getSensorWithLatestReading(id)

  if (!sensor) {
    notFound()
  }

  // Format sensor for existing components
  const sensorInfo = {
    id: sensor.id,
    device_id: sensor.device_id,
    name: sensor.name ?? `Sensor ${sensor.device_id}`,
    location: sensor.location_description ?? "Unknown location",
    latitude: sensor.latitude ?? 0,
    longitude: sensor.longitude ?? 0,
    status: sensor.status as "active" | "inactive" | "maintenance",
    battery: sensor.latest_reading?.battery_level ?? 0,
    lastUpdate: sensor.latest_reading?.received_at
      ? formatTimeAgo(new Date(sensor.latest_reading.received_at))
      : "No data",
    notes: sensor.notes,
    waterDepth: sensor.latest_reading?.water_depth ?? null,
  }

  return (
    <div className="min-h-screen bg-background">
      <SensorDetailHeader sensorId={sensor.device_id} />

      <main className="container mx-auto p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SensorInfoCard sensor={sensorInfo} />
          </div>
          <div>
            <SensorLocationMap
              latitude={sensorInfo.latitude}
              longitude={sensorInfo.longitude}
              sensorId={sensor.device_id}
            />
          </div>
        </div>

        <SensorHistoryChart sensorId={id} />

        <WaterDepthChart sensorId={id} />

        <PaginatedReadingsTable sensorId={id} deviceId={sensor.device_id} totalCount={sensor.total_readings} />
      </main>
    </div>
  )
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`
}
