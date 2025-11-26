// components/alerts-feed.tsx
import { Card } from "@/components/ui/card"

type LatestReading = {
  received_at?: string | null
  battery_level?: number | null
  distance_mm?: number | null
}

type Sensor = {
  id: string
  status?: "normal" | "warning" | "critical" | string
  location_description?: string | null
  latitude?: number | null
  longitude?: number | null
  latest_reading?: LatestReading | null
}

type AlertItem = {
  id: string
  severity: "critical" | "warning"
  title: string
  description: string
  asOf: string | null
}

function fmtLoc(s: Sensor): string {
  if (s.location_description) return s.location_description
  const lat = s.latitude != null ? Number(s.latitude).toFixed(5) : "?"
  const lon = s.longitude != null ? Number(s.longitude).toFixed(5) : "?"
  return `${lat}, ${lon}`
}

export function AlertsFeed({ sensors }: { sensors: Sensor[] }) {
  const STALE_MIN = 30
  const cutoff = Date.now() - STALE_MIN * 60 * 1000

  const items: AlertItem[] = []

  for (const s of sensors) {
    const asOf = s.latest_reading?.received_at ?? null
    const asOfMs = asOf ? new Date(asOf).getTime() : 0
    const batt = s.latest_reading?.battery_level ?? null

    // 1) Status-based alerts
    if (s.status === "critical") {
      items.push({
        id: `${s.id}-critical`,
        severity: "critical",
        title: `CRITICAL • ${s.id}`,
        description: `Sensor reported critical status at ${fmtLoc(s)}.`,
        asOf,
      })
    } else if (s.status === "warning") {
      items.push({
        id: `${s.id}-warning`,
        severity: "warning",
        title: `Warning • ${s.id}`,
        description: `Sensor reported warning status at ${fmtLoc(s)}.`,
        asOf,
      })
    }

    // 2) Low battery
    if (batt != null && batt < 20) {
      items.push({
        id: `${s.id}-battery`,
        severity: "warning",
        title: `Low battery • ${s.id}`,
        description: `Battery at ${batt}% for sensor at ${fmtLoc(s)}.`,
        asOf,
      })
    }

    // 3) Stale heartbeat (no recent reading)
    if (!asOf || asOfMs < cutoff) {
      items.push({
        id: `${s.id}-stale`,
        severity: "warning",
        title: `Stale heartbeat • ${s.id}`,
        description: `No reading in the last ${STALE_MIN} min from ${fmtLoc(s)}.`,
        asOf,
      })
    }
  }

  // Sort newest first
  items.sort((a, b) => (new Date(b.asOf ?? 0).getTime() - new Date(a.asOf ?? 0).getTime()))

  return (
    <Card className="p-6 bg-card border-border">
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">Active Alerts</p>
        <p className="text-2xl font-bold text-foreground">{items.length}</p>
        <p className="text-xs text-muted-foreground">Status, battery, and heartbeat issues</p>
      </div>

      {items.length === 0 ? (
        <div className="text-sm text-muted-foreground">No active alerts 🎉</div>
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <div
              key={a.id}
              className={`rounded-md border p-3 ${
                a.severity === "critical"
                  ? "border-destructive/30 bg-destructive/5"
                  : "border-warning/30 bg-warning/5"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-semibold uppercase tracking-wide ${
                    a.severity === "critical" ? "text-destructive" : "text-warning"
                  }`}
                >
                  {a.title}
                </span>
                <span className="text-xs text-muted-foreground">
                  {a.asOf ? new Date(a.asOf).toLocaleString() : "—"}
                </span>
              </div>
              <div className="text-sm text-foreground mt-1">{a.description}</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
