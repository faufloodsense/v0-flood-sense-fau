import { createServiceClient } from "@/lib/supabase/server"
import { getCurrentWeather } from "@/lib/weather"
import { type NextRequest, NextResponse } from "next/server"

/**
 * Calculate z-score for anomaly detection
 * Formula: z = (x - μ) / σ
 * Where x is the current value, μ is the mean, σ is the standard deviation
 * Reference: Standard statistical z-score for outlier detection
 * https://en.wikipedia.org/wiki/Standard_score
 */
function calculateZScore(currentValue: number, historicalValues: number[]): number | null {
  if (historicalValues.length === 0) return null

  // Calculate mean (μ)
  const mean = historicalValues.reduce((sum, val) => sum + val, 0) / historicalValues.length

  // Calculate standard deviation (σ)
  const squaredDiffs = historicalValues.map((val) => Math.pow(val - mean, 2))
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / historicalValues.length
  const stdDev = Math.sqrt(variance)

  // Avoid division by zero - if all values are the same, stdDev = 0
  if (stdDev === 0) {
    // If current value equals mean, z-score is 0; otherwise it's an anomaly
    return currentValue === mean ? 0 : Number.POSITIVE_INFINITY
  }

  // Calculate z-score
  const zScore = Math.abs(currentValue - mean) / stdDev
  return zScore
}

// Z-score configuration
const Z_SCORE_WINDOW = 15 // Number of previous readings to consider
const Z_SCORE_THRESHOLD = 3 // Readings with z-score > 3 are anomalies

interface TTNWebhookPayload {
  name?: string
  time?: string
  identifiers?: Array<{
    device_ids: {
      device_id: string
      application_ids?: {
        application_id: string
      }
      dev_eui?: string
      dev_addr?: string
    }
  }>
  data?: {
    "@type"?: string
    end_device_ids?: {
      device_id: string
      application_ids?: {
        application_id: string
      }
      dev_eui?: string
      dev_addr?: string
    }
    received_at?: string
    uplink_message?: {
      session_key_id?: string
      f_port?: number
      f_cnt?: number
      frm_payload?: string
      decoded_payload?: {
        distance_mm?: number
        voltage_mv?: number
        distance?: number
        battery?: number
        [key: string]: unknown
      }
      rx_metadata?: Array<{
        gateway_ids: {
          gateway_id: string
          eui?: string
        }
        rssi?: number
        snr?: number
        timestamp?: number
        frequency_offset?: string
      }>
      settings?: {
        data_rate?: unknown
        frequency?: string
        timestamp?: number
      }
      last_battery_percentage?: {
        value: number
        received_at: string
      }
    }
  }
  end_device_ids?: {
    device_id: string
    application_ids?: {
      application_id: string
    }
    dev_eui?: string
    dev_addr?: string
  }
  uplink_message?: {
    decoded_payload?: {
      distance_mm?: number
      voltage_mv?: number
      distance?: number
      battery?: number
      [key: string]: unknown
    }
    rx_metadata?: Array<{
      gateway_ids: {
        gateway_id: string
        eui?: string
      }
      rssi?: number
      snr?: number
    }>
    last_battery_percentage?: {
      value: number
      received_at: string
    }
  }
  received_at?: string
  correlation_ids?: string[]
  unique_id?: string
}

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] TTN Webhook received")

    const payload: TTNWebhookPayload = await request.json()
    console.log("[v0] Full payload received:", JSON.stringify(payload, null, 2))

    const endDeviceIds = payload.data?.end_device_ids || payload.end_device_ids
    const uplinkMessage = payload.data?.uplink_message || payload.uplink_message
    const receivedAt = payload.data?.received_at || payload.received_at || new Date().toISOString()

    if (!endDeviceIds?.device_id) {
      console.warn("[v0] Missing device_id in payload, attempting to extract from identifiers")
      const deviceIdFromIdentifiers = payload.identifiers?.[0]?.device_ids?.device_id

      if (!deviceIdFromIdentifiers) {
        console.error("[v0] Could not find device_id anywhere in payload")
        return NextResponse.json(
          {
            success: false,
            message: "Missing device_id - payload logged for debugging",
            received: payload,
          },
          { status: 200 },
        )
      }
    }

    if (!uplinkMessage) {
      console.warn("[v0] Missing uplink_message in payload")
      return NextResponse.json(
        {
          success: false,
          message: "Missing uplink_message - this might be a downlink or other event type",
          event_type: payload.name || "unknown",
        },
        { status: 200 },
      )
    }

    // Extract device information
    const deviceId = endDeviceIds.device_id
    const decodedPayload = uplinkMessage.decoded_payload || {}
    const rxMetadata = uplinkMessage.rx_metadata?.[0]
    const batteryPercentage = uplinkMessage.last_battery_percentage?.value

    console.log("[v0] Processing device:", deviceId)
    console.log("[v0] Decoded payload:", JSON.stringify(decodedPayload, null, 2))
    console.log("[v0] Battery percentage:", batteryPercentage)

    // TTN sends 'distance' (in mm) not 'distance_mm', and 'battery' (in volts) not 'voltage_mv'
    const distanceMm = decodedPayload.distance_mm || decodedPayload.distance || null

    // Handle battery level - TTN may send 'battery' in volts (e.g., 3.814)
    let batteryLevel = batteryPercentage || null
    if (!batteryLevel && decodedPayload.battery) {
      const voltage = decodedPayload.battery // Already in volts
      // LiPo battery: ~4.2V = 100%, ~3.0V = 0%
      batteryLevel = Math.max(0, Math.min(100, ((voltage - 3.0) / 1.2) * 100))
    } else if (!batteryLevel && decodedPayload.voltage_mv) {
      const voltage = decodedPayload.voltage_mv / 1000 // Convert mV to V
      batteryLevel = Math.max(0, Math.min(100, ((voltage - 3.0) / 1.2) * 100))
    }

    console.log("[v0] Converted values - distance_mm:", distanceMm, "battery:", batteryLevel)

    // Create Supabase service client (bypasses RLS for webhook operations)
    const supabase = createServiceClient()
    console.log("[v0] Supabase client created")

    // Check if sensor exists, if not create it
    const { data: existingSensor, error: sensorQueryError } = await supabase
      .from("sensors")
      .select("id, awaiting_calibration")
      .eq("device_id", deviceId)
      .single()

    if (sensorQueryError && sensorQueryError.code !== "PGRST116") {
      // PGRST116 is "not found" which is expected for new sensors
      console.error("[v0] Error querying sensor:", sensorQueryError)
      return NextResponse.json(
        {
          success: false,
          message: "Database query error - logged for investigation",
          error: sensorQueryError.message,
        },
        { status: 200 },
      )
    }

    let sensorId = existingSensor?.id
    const isBenchmark = existingSensor?.awaiting_calibration || false

    if (!existingSensor) {
      console.log("[v0] Creating new sensor for device:", deviceId)
      // Create new sensor entry
      const { data: newSensor, error: sensorError } = await supabase
        .from("sensors")
        .insert({
          device_id: deviceId,
          name: `Sensor ${deviceId}`,
          status: "active",
        })
        .select("id")
        .single()

      if (sensorError) {
        console.error("[v0] Error creating sensor:", sensorError)
        return NextResponse.json(
          {
            success: false,
            message: "Failed to create sensor - logged for investigation",
            error: sensorError.message,
          },
          { status: 200 },
        )
      }

      sensorId = newSensor.id
      console.log("[v0] Created sensor with ID:", sensorId)
    } else {
      console.log("[v0] Using existing sensor ID:", sensorId)
      if (isBenchmark) {
        console.log("[v0] Sensor is awaiting calibration - this reading will be marked as BENCHMARK")
      }
    }

    const { data: sensorData, error: sensorDataError } = await supabase
      .from("sensors")
      .select("latitude, longitude, location_description")
      .eq("id", sensorId)
      .single()

    if (sensorDataError) {
      console.error("[v0] Error fetching sensor location:", sensorDataError)
    }

    let waterDepth: number | null = null
    if (distanceMm !== null && sensorId && !isBenchmark) {
      const { data: benchmarkReading, error: benchmarkError } = await supabase
        .from("sensor_readings")
        .select("distance_mm")
        .eq("sensor_id", sensorId)
        .eq("is_benchmark", true)
        .order("received_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (benchmarkError) {
        console.error("[v0] Error fetching benchmark reading:", benchmarkError)
      } else if (benchmarkReading?.distance_mm) {
        // water_depth = benchmark distance - current distance
        // Positive value means water has risen (closer to sensor)
        const rawWaterDepth = Number(benchmarkReading.distance_mm) - Number(distanceMm)

        const WATER_DEPTH_TOLERANCE = 10 // mm
        if (Math.abs(rawWaterDepth) <= WATER_DEPTH_TOLERANCE) {
          waterDepth = 0
          console.log("[v0] Water depth within tolerance (±10mm), setting to 0:", {
            benchmark_mm: benchmarkReading.distance_mm,
            current_mm: distanceMm,
            raw_water_depth_mm: rawWaterDepth,
            final_water_depth_mm: waterDepth,
          })
        } else {
          waterDepth = rawWaterDepth
          console.log("[v0] Water depth calculated:", {
            benchmark_mm: benchmarkReading.distance_mm,
            current_mm: distanceMm,
            water_depth_mm: waterDepth,
          })
        }
      } else {
        console.log("[v0] No benchmark reading found for sensor, water_depth will be null")
      }
    } else if (isBenchmark) {
      // Benchmark reading has 0 water depth by definition
      waterDepth = 0
      console.log("[v0] Benchmark reading - setting water_depth to 0")
    }

    let weatherData = null
    if (sensorData?.latitude && sensorData?.longitude) {
      console.log(`[v0] Fetching weather for sensor location: ${sensorData.latitude}, ${sensorData.longitude}`)
      weatherData = await getCurrentWeather(sensorData.latitude, sensorData.longitude)
      if (weatherData) {
        console.log("[v0] Weather data retrieved:", weatherData)
      } else {
        console.warn("[v0] Could not fetch weather data for sensor location")
      }
    } else {
      console.warn("[v0] Sensor missing latitude/longitude coordinates, skipping weather fetch")
    }

    console.log("[v0] Inserting sensor reading...")
    const { data: insertedReading, error: readingError } = await supabase
      .from("sensor_readings")
      .insert({
        sensor_id: sensorId,
        device_id: deviceId,
        distance_mm: distanceMm,
        battery_level: batteryLevel,
        signal_strength: rxMetadata?.rssi || null,
        latitude: sensorData?.latitude || null,
        longitude: sensorData?.longitude || null,
        location_description: sensorData?.location_description || null,
        ambient_temperature: weatherData?.ambient_temperature || null,
        ambient_humidity: weatherData?.ambient_humidity || null,
        cloud_cover: weatherData?.cloud_cover || null,
        weather_condition: weatherData?.weather_condition || null,
        raw_payload: payload,
        received_at: receivedAt,
        is_benchmark: isBenchmark,
        water_depth: waterDepth, // Added water_depth to insert
        // is_valid defaults to false in the database
      })
      .select("id")
      .single()

    if (readingError) {
      console.error("[v0] Error inserting reading:", readingError)
      return NextResponse.json(
        {
          success: false,
          message: "Failed to insert sensor reading - logged for investigation",
          error: readingError.message,
        },
        { status: 200 },
      )
    }

    console.log("[v0] ✓ Successfully stored sensor reading with ID:", insertedReading.id)

    if (isBenchmark && sensorId) {
      console.log("[v0] Resetting awaiting_calibration flag for sensor")
      const { error: resetError } = await supabase
        .from("sensors")
        .update({ awaiting_calibration: false })
        .eq("id", sensorId)

      if (resetError) {
        console.error("[v0] Error resetting calibration flag:", resetError)
      } else {
        console.log("[v0] ✓ Calibration flag reset - benchmark reading captured")
      }
    }

    let isValid = true // Default to true
    let zScore: number | null = null
    let validationReason = ""

    if (isBenchmark) {
      isValid = true
      validationReason = "Benchmark/calibration reading - marked as valid"
      console.log("[v0]", validationReason)
    } else if (distanceMm !== null && sensorId) {
      const { data: historicalReadings, error: historyError } = await supabase
        .from("sensor_readings")
        .select("distance_mm")
        .eq("sensor_id", sensorId)
        .not("distance_mm", "is", null)
        .neq("id", insertedReading.id)
        .order("received_at", { ascending: false })
        .limit(Z_SCORE_WINDOW)

      if (historyError) {
        console.error("[v0] Error fetching historical readings:", historyError)
        validationReason = "Error fetching history, defaulting to valid"
      } else {
        const historyCount = historicalReadings?.length || 0
        console.log(`[v0] Found ${historyCount} historical readings for z-score calculation`)

        if (historyCount < Z_SCORE_WINDOW) {
          isValid = true
          validationReason = `Insufficient history (${historyCount}/${Z_SCORE_WINDOW}), marking as valid`
          console.log("[v0]", validationReason)
        } else {
          const historicalValues = historicalReadings.map((r) => Number(r.distance_mm))
          zScore = calculateZScore(Number(distanceMm), historicalValues)

          console.log("[v0] Z-score calculation:", {
            currentValue: distanceMm,
            historicalValues: historicalValues.slice(0, 5),
            zScore: zScore,
            threshold: Z_SCORE_THRESHOLD,
          })

          if (zScore !== null && zScore <= Z_SCORE_THRESHOLD) {
            isValid = true
            validationReason = `Z-score ${zScore.toFixed(2)} <= ${Z_SCORE_THRESHOLD}, valid reading`
          } else {
            isValid = false
            validationReason = `Z-score ${zScore?.toFixed(2) || "Infinity"} > ${Z_SCORE_THRESHOLD}, anomaly detected`
          }
          console.log("[v0]", validationReason)
        }
      }
    } else {
      validationReason = "No distance_mm value, skipping validation"
      console.log("[v0]", validationReason)
    }

    const { error: updateError } = await supabase
      .from("sensor_readings")
      .update({ is_valid: isValid })
      .eq("id", insertedReading.id)

    if (updateError) {
      console.error("[v0] Error updating is_valid:", updateError)
    } else {
      console.log("[v0] ✓ Updated is_valid to:", isValid)
    }

    return NextResponse.json({
      success: true,
      message: "Data received and stored",
      device_id: deviceId,
      sensor_id: sensorId,
      reading_id: insertedReading.id,
      is_benchmark: isBenchmark,
      processed_data: {
        distance_mm: distanceMm,
        battery_percentage: batteryLevel,
        signal_strength: rxMetadata?.rssi,
        weather: weatherData,
        water_depth: waterDepth, // Added water_depth to response
      },
      validation: {
        is_valid: isValid,
        z_score: zScore,
        threshold: Z_SCORE_THRESHOLD,
        window_size: Z_SCORE_WINDOW,
        reason: validationReason,
      },
    })
  } catch (error) {
    console.error("[v0] Webhook error:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    const errorStack = error instanceof Error ? error.stack : undefined

    console.error("[v0] Error details:", {
      message: errorMessage,
      stack: errorStack,
    })

    return NextResponse.json(
      {
        success: false,
        message: "Error processing webhook - logged for investigation",
        error: errorMessage,
      },
      { status: 200 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: "TTN Webhook endpoint is active",
    endpoint: "/api/webhook/ttn",
    method: "POST",
    expected_payload: {
      data: {
        end_device_ids: { device_id: "string" },
        uplink_message: {
          decoded_payload: {
            distance_mm: "number (distance in millimeters - stored directly, no conversion)",
            voltage_mv: "number (battery voltage in millivolts - converted to percentage)",
            distance: "number (distance in millimeters - stored directly, no conversion)",
            battery: "number (battery voltage in volts - converted to percentage)",
          },
          last_battery_percentage: {
            value: "number (battery percentage from TTN)",
          },
        },
      },
    },
    note: "Weather data (temperature, humidity, cloud cover) is automatically fetched from API for South Delray, FL",
  })
}
