"use client"

import { useEffect, useState } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { getFloodStatus } from "@/lib/flood-status"

type HistoryPoint = {
  timestamp: string
  water_depth: number | null
  is_valid: boolean
}

type TimeUnit = "hours" | "days" | "weeks" | "months"

const TIME_PRESETS = [
  { label: "24h", range: 24, unit: "hours" as TimeUnit },
  { label: "7d", range: 7, unit: "days" as TimeUnit },
  { label: "30d", range: 30, unit: "days" as TimeUnit },
  { label: "3mo", range: 3, unit: "months" as TimeUnit },
]

// Flood level thresholds for reference lines
const FLOOD_THRESHOLDS = [
  { value: 10, label: "Low", color: "#facc15" },
  { value: 50, label: "Moderate", color: "#f97316" },
  { value: 150, label: "Major", color: "#ef4444" },
  { value: 300, label: "Extreme", color: "#991b1b" },
]

export function WaterDepthChart({ sensorId }: { sensorId: string }) {
  const [data, setData] = useState<HistoryPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [validOnly, setValidOnly] = useState(false)
  const [timeRange, setTimeRange] = useState(24)
  const [timeUnit, setTimeUnit] = useState<TimeUnit>("hours")
  const [showThresholds, setShowThresholds] = useState(true)

  const GRID = "rgba(255,255,255,0.12)"
  const TICKS = "rgba(255,255,255,0.72)"
  const CYAN = "#06b6d4"
  const RED = "#ef4444"

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const res = await fetch(
          `/sensors/${sensorId}/history?range=${timeRange}&unit=${timeUnit}&validOnly=${validOnly}`,
          { cache: "no-store" },
        )
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
  }, [sensorId, timeRange, timeUnit, validOnly])

  const handleTimePreset = (preset: string) => {
    const selected = TIME_PRESETS.find((p) => p.label === preset)
    if (selected) {
      setTimeRange(selected.range)
      setTimeUnit(selected.unit)
    }
  }

  const formatXAxis = (timestamp: string) => {
    const date = new Date(timestamp)
    if (timeUnit === "hours") {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
    if (timeUnit === "days" && timeRange <= 7) {
      return date.toLocaleDateString([], { weekday: "short", hour: "2-digit" })
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" })
  }

  const getTimeLabel = () => {
    if (timeUnit === "hours") return `${timeRange} Hour${timeRange > 1 ? "s" : ""}`
    if (timeUnit === "days") return `${timeRange} Day${timeRange > 1 ? "s" : ""}`
    if (timeUnit === "weeks") return `${timeRange} Week${timeRange > 1 ? "s" : ""}`
    return `${timeRange} Month${timeRange > 1 ? "s" : ""}`
  }

  // Calculate max water depth for Y axis domain
  const maxWaterDepth = Math.max(
    ...data.filter((d) => d.water_depth !== null).map((d) => d.water_depth as number),
    50, // Minimum Y max to show at least low flooding threshold
  )

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle>Water Depth Over Time ({getTimeLabel()})</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <ToggleGroup
              type="single"
              value={TIME_PRESETS.find((p) => p.range === timeRange && p.unit === timeUnit)?.label ?? "24h"}
              onValueChange={handleTimePreset}
              className="bg-muted rounded-md"
            >
              {TIME_PRESETS.map((preset) => (
                <ToggleGroupItem key={preset.label} value={preset.label} size="sm">
                  {preset.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>

            <Button
              variant={showThresholds ? "default" : "outline"}
              size="sm"
              onClick={() => setShowThresholds(!showThresholds)}
            >
              {showThresholds ? "Thresholds On" : "Thresholds Off"}
            </Button>

            <Button variant={validOnly ? "default" : "outline"} size="sm" onClick={() => setValidOnly(!validOnly)}>
              {validOnly ? "Valid Only" : "All Points"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">Loading chart data...</div>
        ) : error ? (
          <div className="h-[300px] flex items-center justify-center text-red-500">Error: {error}</div>
        ) : !data.length ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No data for the selected time window.
          </div>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 12, right: 24, left: 8, bottom: 12 }}>
                <CartesianGrid stroke={GRID} strokeDasharray="4 4" />
                <XAxis
                  dataKey="timestamp"
                  stroke={TICKS}
                  tick={{ fill: TICKS, fontSize: 12 }}
                  tickFormatter={formatXAxis}
                  minTickGap={40}
                />
                <YAxis
                  stroke={TICKS}
                  tick={{ fill: TICKS }}
                  domain={[0, Math.ceil(maxWaterDepth * 1.1)]}
                  label={{
                    value: "Water Depth (mm)",
                    angle: -90,
                    position: "insideLeft",
                    fill: TICKS,
                    style: { textAnchor: "middle" },
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  labelFormatter={(label) => new Date(label).toLocaleString()}
                  formatter={(value: number | null) => {
                    if (value === null) return ["N/A", "Water Depth"]
                    const status = getFloodStatus(value)
                    return [`${value} mm (${status.level})`, "Water Depth"]
                  }}
                />

                {/* Flood threshold reference lines */}
                {showThresholds &&
                  FLOOD_THRESHOLDS.map((threshold) => (
                    <ReferenceLine
                      key={threshold.label}
                      y={threshold.value}
                      stroke={threshold.color}
                      strokeDasharray="5 5"
                      strokeWidth={1.5}
                      label={{
                        value: threshold.label,
                        position: "right",
                        fill: threshold.color,
                        fontSize: 11,
                      }}
                    />
                  ))}

                <Line
                  type="monotone"
                  dataKey="water_depth"
                  stroke={CYAN}
                  strokeWidth={2}
                  dot={(props: any) => {
                    const { cx, cy, payload } = props
                    if (payload.water_depth === null) return null
                    if (!payload.is_valid && !validOnly) {
                      return <circle cx={cx} cy={cy} r={4} fill={RED} stroke={RED} />
                    }
                    // Color dot based on flood level
                    const status = getFloodStatus(payload.water_depth)
                    if (status.level !== "No Flooding") {
                      return <circle cx={cx} cy={cy} r={3} fill={status.color} stroke={status.color} />
                    }
                    return null
                  }}
                  activeDot={{ r: 5, fill: CYAN }}
                  name="water_depth"
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Legend */}
        {showThresholds && (
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            {FLOOD_THRESHOLDS.map((t) => (
              <div key={t.label} className="flex items-center gap-1.5">
                <span className="inline-block w-4 h-0.5" style={{ backgroundColor: t.color }}></span>
                <span>
                  {t.label} ({t.value}mm)
                </span>
              </div>
            ))}
          </div>
        )}

        {!validOnly && data.some((d) => !d.is_valid) && (
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-block w-3 h-3 rounded-full bg-red-500"></span>
            <span>Red dots indicate anomalous readings (is_valid = false)</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
