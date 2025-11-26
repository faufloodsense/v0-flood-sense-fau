import { type NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const url = new URL(req.url)
    const page = Number.parseInt(url.searchParams.get("page") ?? "0", 10)
    const limit = Number.parseInt(url.searchParams.get("limit") ?? "50", 10)
    const offset = page * limit

    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from("sensor_readings")
      .select(
        "id, sensor_id, received_at, distance_mm, ambient_temperature, ambient_humidity, cloud_cover, weather_condition, battery_level, signal_strength",
      )
      .eq("sensor_id", id)
      .order("received_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ readings: data ?? [] })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unexpected error" }, { status: 500 })
  }
}
