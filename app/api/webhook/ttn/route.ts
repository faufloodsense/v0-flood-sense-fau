import { createServiceClient } from "@/lib/supabase/server"
import { getCurrentWeather } from "@/lib/weather"
import { type NextRequest, NextResponse } from "next/server"

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
      .select("id")
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
    }

    const { data: sensorData, error: sensorDataError } = await supabase
      .from("sensors")
      .select("latitude, longitude, location_description")
      .eq("id", sensorId)
      .single()

    if (sensorDataError) {
      console.error("[v0] Error fetching sensor location:", sensorDataError)
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
    const { error: readingError } = await supabase.from("sensor_readings").insert({
      sensor_id: sensorId,
      device_id: deviceId,
      distance_mm: distanceMm,
      battery_level: batteryLevel,
      signal_strength: rxMetadata?.rssi || null,
      latitude: sensorData?.latitude || null,
      longitude: sensorData?.longitude || null,
      location_description: sensorData?.location_description || null,
      // Weather data from API (South Delray, FL)
      ambient_temperature: weatherData?.ambient_temperature || null,
      ambient_humidity: weatherData?.ambient_humidity || null,
      cloud_cover: weatherData?.cloud_cover || null,
      weather_condition: weatherData?.weather_condition || null,
      raw_payload: payload,
      received_at: receivedAt,
    })

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

    console.log("[v0] ✓ Successfully stored sensor data for device:", deviceId)

    return NextResponse.json({
      success: true,
      message: "Data received and stored",
      device_id: deviceId,
      sensor_id: sensorId,
      processed_data: {
        distance_mm: distanceMm,
        battery_percentage: batteryLevel,
        signal_strength: rxMetadata?.rssi,
        weather: weatherData,
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

// Optional: Add GET endpoint for testing
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
