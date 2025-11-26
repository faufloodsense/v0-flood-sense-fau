"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Table, Download } from "lucide-react"

type Reading = {
  id: string
  sensor_id: string
  received_at: string
  distance_mm: number | null
  ambient_temperature: number | null
  ambient_humidity: number | null
  cloud_cover: number | null
  weather_condition: string | null
  battery_level: number | null
  signal_strength: number | null
}

type PaginatedReadingsTableProps = {
  sensorId: string
  deviceId: string // Added deviceId for human-readable display
  totalCount: number
}

const PAGE_SIZE = 50

export function PaginatedReadingsTable({ sensorId, deviceId, totalCount }: PaginatedReadingsTableProps) {
  const [readings, setReadings] = useState<Reading[]>([])
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  useEffect(() => {
    async function fetchReadings() {
      setLoading(true)
      try {
        const res = await fetch(`/api/sensors/${sensorId}/readings?page=${page}&limit=${PAGE_SIZE}`)
        if (res.ok) {
          const data = await res.json()
          setReadings(data.readings)
        }
      } catch (error) {
        console.error("Failed to fetch readings:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchReadings()
  }, [sensorId, page])

  const handlePrevious = () => {
    if (page > 0) setPage(page - 1)
  }

  const handleNext = () => {
    if (page < totalPages - 1) setPage(page + 1)
  }

  const handleExportCSV = async () => {
    setExporting(true)
    try {
      const url = `/api/export?sensors=${sensorId}&all=false&pretty=true`
      const res = await fetch(url)

      if (res.ok) {
        const blob = await res.blob()
        const downloadUrl = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = downloadUrl
        a.download = `${deviceId}_readings.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(downloadUrl)
        document.body.removeChild(a)
      } else {
        console.error("Export failed:", await res.text())
      }
    } catch (error) {
      console.error("Export error:", error)
    } finally {
      setExporting(false)
    }
  }

  const startRecord = page * PAGE_SIZE + 1
  const endRecord = Math.min((page + 1) * PAGE_SIZE, totalCount)

  const formatBatteryClass = (level: number | null) => {
    if (level == null) return ""
    if (level > 80) return "text-green-500"
    if (level > 50) return "text-yellow-500"
    return "text-red-500"
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Table className="h-5 w-5" />
          Sensor Readings
        </CardTitle>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={exporting || totalCount === 0}>
            <Download className="h-4 w-4 mr-2" />
            {exporting ? "Exporting..." : "Export to CSV"}
          </Button>
          <span className="text-sm text-muted-foreground">
            {totalCount > 0 ? `${startRecord}-${endRecord} of ${totalCount}` : "No readings"}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrevious} disabled={page === 0 || loading}>
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button variant="outline" size="sm" onClick={handleNext} disabled={page >= totalPages - 1 || loading}>
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : readings.length === 0 ? (
          <div className="py-6 text-muted-foreground text-center">No readings yet for this sensor.</div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-3 pr-4 font-medium">Device ID</th>
                  <th className="py-3 pr-4 font-medium">Time</th>
                  <th className="py-3 pr-4 font-medium">Distance (mm)</th>
                  <th className="py-3 pr-4 font-medium">Temp (°F)</th>
                  <th className="py-3 pr-4 font-medium">Humidity (%)</th>
                  <th className="py-3 pr-4 font-medium">Cloud Cover</th>
                  <th className="py-3 pr-4 font-medium">Weather</th>
                  <th className="py-3 pr-4 font-medium">Battery</th>
                  <th className="py-3 pr-4 font-medium">Signal</th>
                </tr>
              </thead>
              <tbody className="text-foreground">
                {readings.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-none hover:bg-secondary/30">
                    <td className="py-3 pr-4 font-mono text-xs">{deviceId}</td>
                    <td className="py-3 pr-4">{new Date(r.received_at).toLocaleString()}</td>
                    <td className="py-3 pr-4">{r.distance_mm ?? "—"}</td>
                    <td className="py-3 pr-4">{r.ambient_temperature?.toFixed(1) ?? "—"}</td>
                    <td className="py-3 pr-4">{r.ambient_humidity?.toFixed(0) ?? "—"}</td>
                    <td className="py-3 pr-4">{r.cloud_cover != null ? `${r.cloud_cover}%` : "—"}</td>
                    <td className="py-3 pr-4">{r.weather_condition ?? "—"}</td>
                    <td className="py-3 pr-4">
                      <span className={formatBatteryClass(r.battery_level)}>{r.battery_level?.toFixed(1) ?? "—"}%</span>
                    </td>
                    <td className="py-3 pr-4">{r.signal_strength ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
