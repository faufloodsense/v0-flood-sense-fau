import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()

  // Fetch all sensors with their latest readings
  const { data: sensors, error } = await supabase
    .from("sensors")
    .select("id, device_id, name, latitude, longitude, location_description, status, notes")
    .order("device_id")

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Fetch latest reading for each sensor
  const sensorsWithReadings = await Promise.all(
    (sensors || []).map(async (sensor) => {
      const { data: latestReading } = await supabase
        .from("sensor_readings")
        .select("distance_mm, battery_level, received_at, water_depth")
        .eq("sensor_id", sensor.id)
        .order("received_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      return {
        ...sensor,
        latest_reading: latestReading || undefined,
      }
    }),
  )

  return NextResponse.json({ sensors: sensorsWithReadings })
}
