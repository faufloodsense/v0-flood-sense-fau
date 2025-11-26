"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"

type WeatherData = {
  ambient_temperature?: number | null
  ambient_humidity?: number | null
  cloud_cover?: number | null
  weather_condition?: string | null
  received_at?: string | null
}

const POLL_MS = 30 * 1000 // poll every 30 seconds

export function WeatherCard() {
  const [data, setData] = useState<WeatherData | null>(null)
  const [asOf, setAsOf] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stale, setStale] = useState<boolean>(false)
  const [minutesOld, setMinutesOld] = useState<number | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  async function fetchWeather() {
    try {
      setError(null)
      if (!isRefreshing) setLoading(true)
      
      const res = await fetch("/api/weather/latest", { cache: "no-store" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json?.data ?? null)
      setAsOf(json?.meta?.asOf ?? null)
      setStale(Boolean(json?.meta?.stale))
      setMinutesOld(json?.meta?.minutesOld ?? null)
    } catch (e: any) {
      setError(e?.message ?? "Failed to load weather")
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  async function handleRefresh() {
    setIsRefreshing(true)
    await fetchWeather()
  }

  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!alive) return
      await fetchWeather()
    })()

    const id = setInterval(() => {
      if (!alive) return
      fetchWeather()
    }, POLL_MS)

    // Refresh when the tab becomes visible again
    const onVis = () => {
      if (document.visibilityState === "visible") fetchWeather()
    }
    document.addEventListener("visibilitychange", onVis)

    return () => {
      alive = false
      clearInterval(id)
      document.removeEventListener("visibilitychange", onVis)
    }
  }, [])

  return (
    <Card className="p-6 bg-card border-border">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Current Weather</p>
          <p className="text-2xl font-bold text-foreground">Local conditions</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading || isRefreshing}
          className="px-3 py-1 text-xs bg-muted hover:bg-muted/80 disabled:opacity-50 rounded transition-colors"
          title="Refresh weather data"
        >
          {isRefreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {loading && !data ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : error ? (
        <div className="text-sm text-destructive">Error: {error}</div>
      ) : !data ? (
        <div className="text-sm text-muted-foreground">No weather data yet.</div>
      ) : (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Temperature</span>
            <span className="text-foreground">
              {data.ambient_temperature ?? "—"}{data.ambient_temperature != null ? "°F" : ""}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Humidity</span>
            <span className="text-foreground">
              {data.ambient_humidity ?? "—"}{data.ambient_humidity != null ? "%" : ""}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cloud Cover</span>
            <span className="text-foreground">
              {data.cloud_cover ?? "—"}{data.cloud_cover != null ? "%" : ""}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Conditions</span>
            <span className="text-foreground">{data.weather_condition ?? "—"}</span>
          </div>

          <div className="pt-2 text-xs space-y-1">
            <div className={`${stale ? "text-warning" : "text-muted-foreground"}`}>
              {asOf ? `As of ${new Date(asOf).toLocaleString()}` : "As of —"}
              {minutesOld !== null && ` (${minutesOld}m ago)`}
            </div>
            {stale && (
              <div className="text-warning flex items-center gap-1">
                <span>⚠</span>
                <span>Data is stale • Check if sensor is sending updates</span>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}
