import { type NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

const DB_COLUMNS = ["received_at", "sensor_id", "distance_mm", "battery_level"] as const
type DbCol = (typeof DB_COLUMNS)[number]

export async function GET(req: NextRequest) {
  try {
    const sb = createServiceClient()

    const parsed = new URL(req.url)
    const sp = parsed.searchParams

    const sensorsParam = sp.get("sensors")
    const all = sp.get("all") === "true"
    const pretty = sp.get("pretty") === "true"

    const to = sp.get("to") ?? new Date().toISOString()
    const from = sp.get("from") ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const maxRows = Number(sp.get("limit") ?? 200_000)

    if (!all && (!sensorsParam || sensorsParam.trim() === "")) {
      return new NextResponse("Provide sensors=<id,id,...> or all=true", { status: 400 })
    }

    const sensors = all
      ? null
      : sensorsParam!
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)

    let q = sb
      .from("sensor_readings")
      .select(
        `
        received_at,
        sensor_id,
        distance_mm,
        battery_level,
        sensors!inner(device_id)
      `,
        { count: "exact" },
      )
      .gte("received_at", from)
      .lte("received_at", to)
      .order("received_at", { ascending: true })
      .limit(maxRows)

    if (sensors) q = q.in("sensor_id", sensors)

    const { data, error } = await q
    if (error) {
      console.error("Export query error:", error)
      return new NextResponse("Export failed", { status: 500 })
    }

    let deviceIdForFilename = "sensor"
    if (sensors && sensors.length === 1 && data && data.length > 0) {
      const firstRow = data[0] as any
      deviceIdForFilename = firstRow.sensors?.device_id ?? "sensor"
    }

    // Build CSV
    let header: string[]
    let rows: string[]

    if (pretty) {
      header = ["Time (local)", "Device ID", "Water Level (m)", "Distance (mm)", "Battery (%)"]

      const fmt = new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })

      rows = (data ?? []).map((r: any) => {
        const dmm = typeof r.distance_mm === "number" ? r.distance_mm : null
        const meters = dmm != null ? (dmm / 1000).toFixed(2) : ""
        const ts = r.received_at ? fmt.format(new Date(r.received_at)) : ""
        const batt = typeof r.battery_level === "number" ? r.battery_level.toString() : ""
        const deviceId = r.sensors?.device_id ?? r.sensor_id ?? ""
        const cells = [ts, deviceId, meters, dmm ?? "", batt]
        return cells
          .map((v) => {
            const s = String(v ?? "")
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
          })
          .join(",")
      })
    } else {
      header = ["received_at", "device_id", "distance_mm", "battery_level"]
      rows = (data ?? []).map((r: any) => {
        const deviceId = r.sensors?.device_id ?? r.sensor_id ?? ""
        const cells = [r.received_at ?? "", deviceId, r.distance_mm ?? "", r.battery_level ?? ""]
        return cells
          .map((v) => {
            const s = String(v ?? "")
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
          })
          .join(",")
      })
    }

    const csv = "\ufeff" + [header.join(","), ...rows].join("\n")
    const fileName = sensors
      ? `${deviceIdForFilename}_readings_${from.slice(0, 10)}_to_${to.slice(0, 10)}.csv`
      : `floodsense_export_all_${from.slice(0, 10)}_to_${to.slice(0, 10)}.csv`

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (e) {
    console.error(e)
    return new NextResponse("Unexpected error in export", { status: 500 })
  }
}
