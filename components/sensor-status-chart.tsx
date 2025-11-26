"use client"

import { Card } from "@/components/ui/card"
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts"

type LatestReading = {
  received_at?: string
  battery_level?: number
  distance_mm?: number
}

type Sensor = {
  id: string
  status?: "normal" | "warning" | "critical" | string
  location_description?: string
  latitude?: number
  longitude?: number
  latest_reading?: LatestReading | null
}

export function SensorStatusChart({ sensors }: { sensors: Sensor[] }) {
  // Count sensors by status (default to "normal" if undefined)
  const counts = sensors.reduce(
    (acc, s) => {
      const k = (s.status ?? "normal") as "normal" | "warning" | "critical" | string
      if (k === "critical") acc.critical += 1
      else if (k === "warning") acc.warning += 1
      else acc.normal += 1
      return acc
    },
    { normal: 0, warning: 0, critical: 0 }
  )

  const total = counts.normal + counts.warning + counts.critical
  const data = [
    { name: "Normal", value: counts.normal },
    { name: "Warning", value: counts.warning },
    { name: "Critical", value: counts.critical },
  ]

  // Tailwind default palette approximations (to match your badge colors)
  const COLORS = {
    normal: "#16a34a",   // green-600
    warning: "#f59e0b",  // amber-500
    critical: "#ef4444", // red-500
  }

  return (
    <Card className="p-6 bg-card border-border">
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">Sensor Network Status</p>
        <p className="text-2xl font-bold text-foreground">{total} sensors</p>
        <p className="text-xs text-muted-foreground">Distribution by status</p>
      </div>

      {total === 0 ? (
        <div className="text-sm text-muted-foreground">No sensors found yet.</div>
      ) : (
        <div className="w-full h-64">
          <ResponsiveContainer>
            <PieChart>
              <Tooltip
                formatter={(value: any, name: any) => [`${value}`, name]}
                labelFormatter={() => ""}
              />
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
              >
                <Cell key="normal" fill={COLORS.normal} />
                <Cell key="warning" fill={COLORS.warning} />
                <Cell key="critical" fill={COLORS.critical} />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: COLORS.normal }} />
          <span className="text-foreground">Normal</span>
          <span className="text-muted-foreground">({counts.normal})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: COLORS.warning }} />
          <span className="text-foreground">Warning</span>
          <span className="text-muted-foreground">({counts.warning})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: COLORS.critical }} />
          <span className="text-foreground">Critical</span>
          <span className="text-muted-foreground">({counts.critical})</span>
        </div>
      </div>
    </Card>
  )
}
