import { DashboardHeader } from "@/components/dashboard-header"
import { StatsOverview } from "@/components/stats-overview"
import { FloodHeatmap } from "@/components/flood-heatmap"
import { WaterLevelChart } from "@/components/water-level-chart"
import { SensorStatusChart } from "@/components/sensor-status-chart"
import { AlertsFeed } from "@/components/alerts-feed"
import { ActiveSensorsTable } from "@/components/active-sensors-table"
import { WeatherCard } from "@/components/weather-card"
import { getSensorsWithLatestReadings } from "@/lib/dashboard-data"

// 🔽 ADDED
import ExportButton from "@/components/export-button"

export default async function DashboardPage() {
  const sensors = await getSensorsWithLatestReadings()

  // Avg Water Level (meters) from latest readings
  const readingsM = sensors
    .map((s) => (s.latest_reading?.distance_mm != null ? s.latest_reading.distance_mm / 1000 : null))
    .filter((v): v is number => v != null)

  const avgWaterM = readingsM.length
    ? Number((readingsM.reduce((a, b) => a + b, 0) / readingsM.length).toFixed(2))
    : null

  // Network Health: % sensors with a fresh heartbeat (last 15 minutes)
  const FRESH_MINUTES = 15
  const cutoff = Date.now() - FRESH_MINUTES * 60 * 1000
  const onlineCount = sensors.filter((s) => {
    const ts = s.latest_reading?.received_at
    return ts ? new Date(ts).getTime() >= cutoff : false
  }).length
  const networkHealthPct = sensors.length > 0 ? Number(((onlineCount / sensors.length) * 100).toFixed(1)) : null

  // Critical Alerts: count sensors with status === "critical"
  const criticalAlertsCount = sensors.filter((s) => s.status === "critical").length

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto p-6 space-y-6">
        <StatsOverview
          sensorsCount={sensors.length}
          avgWaterM={avgWaterM}
          networkHealthPct={networkHealthPct}
          criticalAlertsCount={criticalAlertsCount}
          sensors={sensors} // Pass sensors array for the Active Sensors dialog
        />

        {/* 🔽 ADDED — toolbar row with Export CSV button */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">City Flood Map</h2>
          <ExportButton all />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <FloodHeatmap sensors={sensors} />
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

        <ActiveSensorsTable />
      </main>
    </div>
  )
}
