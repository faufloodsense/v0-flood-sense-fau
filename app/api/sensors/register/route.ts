import { createServiceClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

interface RegisterSensorRequest {
  device_id: string
  latitude: number
  longitude: number
  location_description?: string
  notes?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: RegisterSensorRequest = await request.json()

    // Validate required fields
    if (!body.device_id) {
      return NextResponse.json({ error: "device_id is required" }, { status: 400 })
    }

    if (typeof body.latitude !== "number" || typeof body.longitude !== "number") {
      return NextResponse.json({ error: "Valid latitude and longitude are required" }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data: existingSensor, error: queryError } = await supabase
      .from("sensors")
      .select("id, device_id, name")
      .eq("device_id", body.device_id)
      .maybeSingle()

    if (queryError) {
      console.error("[v0] Error querying sensor:", queryError)
      return NextResponse.json({ error: "Database error", details: queryError.message }, { status: 500 })
    }

    if (existingSensor) {
      // Update existing sensor with location data
      const { data: updatedSensor, error: updateError } = await supabase
        .from("sensors")
        .update({
          latitude: body.latitude,
          longitude: body.longitude,
          location_description: body.location_description || null,
          notes: body.notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("device_id", body.device_id)
        .select()
        .single()

      if (updateError) {
        console.error("[v0] Error updating sensor:", updateError)
        return NextResponse.json({ error: "Failed to update sensor", details: updateError.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: "Sensor updated successfully",
        sensor: updatedSensor,
      })
    } else {
      // Create new sensor with location data
      const { data: newSensor, error: insertError } = await supabase
        .from("sensors")
        .insert({
          device_id: body.device_id,
          name: `Sensor ${body.device_id}`,
          latitude: body.latitude,
          longitude: body.longitude,
          location_description: body.location_description || null,
          notes: body.notes || null,
          status: "active",
        })
        .select()
        .single()

      if (insertError) {
        console.error("[v0] Error creating sensor:", insertError)
        return NextResponse.json({ error: "Failed to create sensor", details: insertError.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: "Sensor registered successfully",
        sensor: newSensor,
      })
    }
  } catch (error) {
    console.error("[v0] Registration error:", error)
    return NextResponse.json(
      {
        error: "Invalid request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 },
    )
  }
}
