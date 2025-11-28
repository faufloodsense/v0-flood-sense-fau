import { createServiceClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sensor_id } = body

    if (!sensor_id) {
      return NextResponse.json({ error: "sensor_id is required" }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Set the sensor to awaiting calibration mode
    const { data, error } = await supabase
      .from("sensors")
      .update({ awaiting_calibration: true })
      .eq("id", sensor_id)
      .select()
      .single()

    if (error) {
      console.error("[v0] Error setting calibration mode:", error)
      return NextResponse.json({ error: "Failed to set calibration mode" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Sensor is now awaiting calibration. The next reading will be marked as benchmark.",
      sensor: data,
    })
  } catch (error) {
    console.error("[v0] Calibration API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
