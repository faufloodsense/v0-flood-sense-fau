import { type NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const hours = Number(new URL(req.url).searchParams.get("hours") ?? 24)
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from("sensor_readings")
      .select("received_at, distance_mm, ambient_temperature, ambient_humidity, battery_level")
      .eq("sensor_id", params.id)
      .gte("received_at", since)
      .order("received_at", { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const series = (data ?? []).map((r) => ({
      timestamp: r.received_at,
      waterLevel: r.distance_mm != null ? r.distance_mm / 1000 : null, // meters
      temperature: r.ambient_temperature ?? null,
      humidity: r.ambient_humidity ?? null,
      battery: r.battery_level ?? null,
    }))

    return NextResponse.json({ series })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unexpected error" }, { status: 500 })
  }
}
