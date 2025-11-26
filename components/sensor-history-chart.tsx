"use client"

import { useEffect, useState } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

type HistoryPoint = {
  timestamp: string
  waterLevel: number | null // meters
  temperature: number | null
  battery: number | null
}

export function SensorHistoryChart({
  sensorId,
  hours = 24,
}: {
  sensorId: string
  hours?: number
}) {
  const [data, setData] = useState<HistoryPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const GRID = "rgba(255,255,255,0.12)"
  const TICKS = "rgba(255,255,255,0.72)"
  const BLUE = "#219ebc"
  const GREEN = "#22c55e"
  const YELLOW = "#facc15"

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/sensors/${sensorId}/history?hours=${hours}`, { cache: "no-store" })
        const json = await res.json()
        if (!cancelled) setData(Array.isArray(json.series) ? json.series : [])
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sensorId, hours])

  if (loading) return <div className="text-muted-foreground">Loading history…</div>
  if (error) return <div className="text-red-500">Error: {error}</div>
  if (!data.length) return <div className="text-muted-foreground">No data for the selected window.</div>

  return (
    <div className="w-full h-[360px]">
      <div className="mb-2 text-foreground font-semibold">Historical Data (Past {hours}h)</div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 24, left: 8, bottom: 12 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="4 4" />
          <XAxis dataKey="timestamp" stroke={TICKS} tick={{ fill: TICKS }} minTickGap={24} />
          <YAxis
            yAxisId="left"
            stroke={TICKS}
            tick={{ fill: TICKS }}
            label={{ value: "Water (m)", angle: -90, position: "insideLeft", fill: TICKS }}
          />
          <YAxis yAxisId="right" orientation="right" stroke={TICKS} tick={{ fill: TICKS }} />
          <Tooltip />
          <Legend wrapperStyle={{ color: TICKS }} />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="waterLevel"
            stroke={BLUE}
            strokeWidth={2.2}
            dot={false}
            name="Water (m)"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="temperature"
            stroke={GREEN}
            strokeWidth={1.8}
            dot={false}
            name="Temp (°C)"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="battery"
            stroke={YELLOW}
            strokeWidth={1.8}
            dot={false}
            name="Battery (%)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
