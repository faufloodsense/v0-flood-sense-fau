"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"

type Point = { ts: string; water_m: number }

export function WaterLevelChart() {
  const [data, setData] = useState<Point[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch("/api/metrics/water-level", { cache: "no-store" })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        if (alive) setData(json.series ?? [])
      } catch (e: any) {
        if (alive) setError(e?.message ?? "Failed to load")
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  return (
    <Card className="p-6 bg-card border-border">
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">Water Level Trends</p>
        <p className="text-2xl font-bold text-foreground">Last 24 hours</p>
        <p className="text-xs text-muted-foreground">Average across sensors, 5-minute buckets</p>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : error ? (
        <div className="text-sm text-destructive">Error: {error}</div>
      ) : data.length === 0 ? (
        <div className="text-sm text-muted-foreground">No readings in the last 24 hours.</div>
      ) : (
        <div className="w-full h-64">
          <ResponsiveContainer>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="ts"
                tickFormatter={(v) => {
                  const d = new Date(v)
                  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes()
                    .toString()
                    .padStart(2, "0")}`
                }}
                minTickGap={30}
              />
              <YAxis dataKey="water_m" tickFormatter={(v) => `${v}m`} width={60} domain={["auto", "auto"]} />
              <Tooltip
                labelFormatter={(v) => new Date(v as string).toLocaleString()}
                formatter={(value) => [`${value as number} m`, "Avg water level"]}
              />
              <Line type="monotone" dataKey="water_m" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}
