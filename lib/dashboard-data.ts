import { createClient } from "@/lib/supabase/server"

export interface Sensor {
  id: string
  device_id: string
  name: string
  latitude: number
  longitude: number
  location_description: string
  notes: string | null
  status: string
  latest_reading?: {
    distance_mm: number
    battery_level: number
    received_at: string
    ambient_temperature?: number
    ambient_humidity?: number
    cloud_cover?: number
    weather_condition?: string
  }
}

/**
 * FIXED: More tolerant latest-weather fetch.
 * - Simplified query to avoid Supabase 556 errors
 * - Falls back gracefully when no data available
 */
export async function getLatestWeatherData() {
  console.log("[v0] Fetching latest weather data from Supabase (tolerant)")
  const startTime = Date.now()

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("sensor_readings")
    .select("ambient_temperature, ambient_humidity, cloud_cover, weather_condition, received_at")
    .order("received_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error("[v0] Error fetching weather data:", error)
    return null
  }

  console.log(`[v0] Fetched weather data in ${Date.now() - startTime}ms`, data?.received_at)
  return data
}

export async function getSensorsWithLatestReadings(): Promise<Sensor[]> {
  console.log("[v0] Fetching sensors with latest readings from Supabase")
  const startTime = Date.now()

  const supabase = await createClient()

  // Fetch all sensors
  const { data: sensors, error: sensorsError } = await supabase
    .from("sensors")
    .select("*")
    .order("created_at", { ascending: false })

  if (sensorsError) {
    console.error("[v0] Error fetching sensors:", sensorsError)
    return []
  }

  console.log(`[v0] Fetched ${sensors?.length || 0} sensors in ${Date.now() - startTime}ms`)

  if (!sensors || sensors.length === 0) {
    return []
  }

  // Fetch latest reading for each sensor
  const sensorIds = sensors.map((s) => s.id)
  const { data: readings, error: readingsError } = await supabase
    .from("sensor_readings")
    .select("*")
    .in("sensor_id", sensorIds)
    .order("received_at", { ascending: false })

  if (readingsError) {
    console.error("[v0] Error fetching readings:", readingsError)
  }

  console.log(`[v0] Fetched ${readings?.length || 0} readings in ${Date.now() - startTime}ms`)

  // Map latest reading to each sensor
  const sensorsWithReadings: Sensor[] = sensors.map((sensor) => {
    const latestReading = readings?.find((r) => r.sensor_id === sensor.id)

    return {
      id: sensor.id,
      device_id: sensor.device_id || sensor.id,
      name: sensor.name || sensor.device_id || `Sensor ${sensor.id.slice(0, 8)}`,
      latitude: Number(sensor.latitude) || 29.6516,
      longitude: Number(sensor.longitude) || -82.3248,
      location_description: sensor.location_description || "Unknown location",
      notes: sensor.notes || null,
      status: sensor.status || "active",
      latest_reading: latestReading
        ? {
            distance_mm: Number(latestReading.distance_mm) || 0,
            battery_level: Number(latestReading.battery_level) || 0,
            received_at: latestReading.received_at,
            ambient_temperature:
              latestReading.ambient_temperature != null ? Number(latestReading.ambient_temperature) : undefined,
            ambient_humidity:
              latestReading.ambient_humidity != null ? Number(latestReading.ambient_humidity) : undefined,
            cloud_cover: latestReading.cloud_cover != null ? Number(latestReading.cloud_cover) : undefined,
            weather_condition: latestReading.weather_condition || undefined,
          }
        : undefined,
    }
  })

  console.log(`[v0] Total fetch time: ${Date.now() - startTime}ms`)
  return sensorsWithReadings
}
