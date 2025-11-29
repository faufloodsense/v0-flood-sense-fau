import { type NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const searchParams = new URL(req.url).searchParams

    const range = Number(searchParams.get("range") ?? 24)
    const unit = searchParams.get("unit") ?? "hours" // hours, days, weeks, months
    const validOnly = searchParams.get("validOnly") === "true"

    // Calculate time window based on unit
    let multiplier = 60 * 60 * 1000 // hours in ms
    switch (unit) {
      case "days":
        multiplier = 24 * 60 * 60 * 1000
        break
      case "weeks":
        multiplier = 7 * 24 * 60 * 60 * 1000
        break
      case "months":
        multiplier = 30 * 24 * 60 * 60 * 1000
        break
      default:
        multiplier = 60 * 60 * 1000 // hours
    }

    const since = new Date(Date.now() - range * multiplier).toISOString()

    const supabase = createServiceClient()

    let query = supabase
      .from("sensor_readings")
      .select("received_at, distance_mm, battery_level, is_valid, water_depth")
      .eq("sensor_id", id)
      .gte("received_at", since)
      .order("received_at", { ascending: true })

    if (validOnly) {
      query = query.eq("is_valid", true)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const series = (data ?? []).map((r) => ({
      timestamp: r.received_at,
      distance_mm: r.distance_mm ?? null,
      battery: r.battery_level ?? null,
      is_valid: r.is_valid ?? true,
      water_depth: r.water_depth ?? null,
    }))

    return NextResponse.json({ series })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unexpected error" }, { status: 500 })
  }
}
