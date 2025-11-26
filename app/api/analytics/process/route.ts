// API route to process raw sensor readings and store cleaned data
import { createServiceClient } from "@/lib/supabase/server"
import { applyFloodFilters, type RawReading } from "@/lib/flood-filters"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { sensorId } = await request.json()

    const supabase = createServiceClient()

    // Fetch raw readings for this sensor (or all sensors if not specified)
    let query = supabase
      .from("sensor_readings")
      .select(`
        id,
        sensor_id,
        device_id,
        distance_mm,
        battery_level,
        signal_strength,
        ambient_temperature,
        ambient_humidity,
        cloud_cover,
        weather_condition,
        received_at
      `)
      .not("distance_mm", "is", null)
      .order("received_at", { ascending: true })

    if (sensorId) {
      query = query.eq("sensor_id", sensorId)
    }

    const { data: rawReadings, error: fetchError } = await query

    if (fetchError) {
      console.error("[v0] Error fetching raw readings:", fetchError)
      return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 })
    }

    if (!rawReadings || rawReadings.length === 0) {
      return NextResponse.json({ success: true, message: "No readings to process", processed: 0 })
    }

    // Convert to RawReading format for the filter
    const rawForFilter: (RawReading & {
      originalId: string
      originalData: (typeof rawReadings)[0]
    })[] = rawReadings.map((r) => ({
      sensorId: r.sensor_id,
      t_ms: new Date(r.received_at).getTime(),
      distance_mm: Number(r.distance_mm),
      originalId: r.id,
      originalData: r,
    }))

    // Apply NYC flood filters
    const processed = applyFloodFilters(rawForFilter)

    // Filter only valid readings (nycValid = true and not z-score anomaly)
    const validReadings = processed.filter((p) => p.nycValid && !p.zAnomaly)

    // Prepare clean readings for insertion
    const cleanReadings = validReadings.map((p) => {
      const original = rawForFilter.find((r) => r.originalId === (p as any).originalId)?.originalData
      return {
        sensor_reading_id: (p as any).originalId,
        sensor_id: p.sensorId,
        device_id: original?.device_id || null,
        distance_mm: p.depth_mm !== null ? p.depth_mm : original?.distance_mm,
        battery_level: original?.battery_level || null,
        signal_strength: original?.signal_strength || null,
        ambient_temperature: original?.ambient_temperature || null,
        ambient_humidity: original?.ambient_humidity || null,
        cloud_cover: original?.cloud_cover || null,
        weather_condition: original?.weather_condition || null,
        received_at: p.timestamp_iso,
      }
    })

    if (cleanReadings.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No valid readings after filtering",
        total: rawReadings.length,
        processed: 0,
      })
    }

    // Clear existing clean readings for this sensor (to avoid duplicates)
    if (sensorId) {
      await supabase.from("sensor_readings_clean").delete().eq("sensor_id", sensorId)
    } else {
      // If processing all, clear all clean readings
      await supabase.from("sensor_readings_clean").delete().neq("id", "00000000-0000-0000-0000-000000000000") // Delete all
    }

    // Insert clean readings
    const { error: insertError } = await supabase.from("sensor_readings_clean").insert(cleanReadings)

    if (insertError) {
      console.error("[v0] Error inserting clean readings:", insertError)
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Readings processed successfully",
      total: rawReadings.length,
      processed: cleanReadings.length,
      filtered: rawReadings.length - cleanReadings.length,
    })
  } catch (error) {
    console.error("[v0] Analytics processing error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// GET endpoint to check processing status
export async function GET() {
  try {
    const supabase = createServiceClient()

    const [rawCount, cleanCount] = await Promise.all([
      supabase.from("sensor_readings").select("id", { count: "exact", head: true }),
      supabase.from("sensor_readings_clean").select("id", { count: "exact", head: true }),
    ])

    return NextResponse.json({
      raw_readings: rawCount.count || 0,
      clean_readings: cleanCount.count || 0,
      endpoint: "/api/analytics/process",
      usage: "POST with optional { sensorId: 'uuid' } to process readings",
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to get counts" }, { status: 500 })
  }
}
