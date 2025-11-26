import { createClient } from "@/lib/supabase/server"

export interface ChartDataPoint {
  timestamp: string
  formattedTime: string
  // Dynamic sensor data: [sensorId]: distance value
  [key: string]: string | number
}

export interface SensorInfo {
  id: string
  deviceId: string
  color: string
}

export interface ChartData {
  dataPoints: ChartDataPoint[]
  sensors: SensorInfo[]
}

const SENSOR_COLORS = [
  "#ef4444", // Bright Red
  "#22c55e", // Bright Green
  "#3b82f6", // Bright Blue
  "#f59e0b", // Bright Orange
  "#a855f7", // Bright Purple
  "#ec4899", // Bright Pink
  "#06b6d4", // Bright Cyan
  "#eab308", // Bright Yellow
  "#14b8a6", // Bright Teal
  "#f97316", // Bright Deep Orange
  "#8b5cf6", // Bright Violet
  "#10b981", // Bright Emerald
]

export async function getChartData(): Promise<ChartData> {
  console.log("[v0] Fetching chart data from sensor_readings")

  const supabase = await createClient()

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data, error } = await supabase
    .from("sensor_readings")
    .select("received_at, distance_mm, sensor_id, device_id")
    .gte("received_at", sevenDaysAgo.toISOString())
    .order("received_at", { ascending: true })

  if (error) {
    console.error("[v0] Error fetching chart data:", error)
    return { dataPoints: [], sensors: [] }
  }

  console.log(`[v0] Fetched ${data?.length || 0} data points`)

  if (data && data.length > 0) {
    console.log("[v0] Sample data point:", JSON.stringify(data[0]))
    console.log("[v0] Date range:", data[0].received_at, "to", data[data.length - 1].received_at)

    // Log all unique device_ids found in the raw data
    const allDeviceIds = new Set(data.map((d) => d.device_id).filter(Boolean))
    console.log("[v0] All device_ids in fetched data:", Array.from(allDeviceIds).join(", "))

    // Count records per device_id
    const deviceCounts = new Map<string, number>()
    data.forEach((d) => {
      if (d.device_id) {
        deviceCounts.set(d.device_id, (deviceCounts.get(d.device_id) || 0) + 1)
      }
    })
    console.log("[v0] Records per device_id:")
    deviceCounts.forEach((count, deviceId) => {
      console.log(`[v0]   ${deviceId}: ${count} records`)
    })
  }

  if (!data || data.length === 0) {
    console.log("[v0] No data available in sensor_readings table")
    return { dataPoints: [], sensors: [] }
  }

  const uniqueSensors = new Map<string, string>()
  data.forEach((reading) => {
    if (reading.sensor_id && !uniqueSensors.has(reading.sensor_id)) {
      uniqueSensors.set(reading.sensor_id, reading.device_id || reading.sensor_id.substring(0, 8))
    }
  })

  // Sort sensors by device_id alphabetically to ensure consistent color assignment
  const sortedSensors = Array.from(uniqueSensors.entries()).sort((a, b) => {
    const deviceIdA = a[1].toLowerCase()
    const deviceIdB = b[1].toLowerCase()
    return deviceIdA.localeCompare(deviceIdB)
  })

  const sensors: SensorInfo[] = sortedSensors.map(([id, deviceId], index) => ({
    id,
    deviceId,
    color: SENSOR_COLORS[index % SENSOR_COLORS.length],
  }))

  console.log(`[v0] Found ${sensors.length} unique sensors (sorted by device_id)`)
  sensors.forEach((sensor, idx) => {
    console.log(`[v0] Sensor ${idx + 1}: ${sensor.deviceId} (${sensor.id.substring(0, 8)}) - ${sensor.color}`)
  })

  const timeMap = new Map<string, ChartDataPoint>()

  data.forEach((reading) => {
    const date = new Date(reading.received_at)
    const easternTime = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date)

    const timestamp = reading.received_at

    if (!timeMap.has(timestamp)) {
      timeMap.set(timestamp, {
        timestamp,
        formattedTime: easternTime,
      })
    }

    const point = timeMap.get(timestamp)!
    // Use sensor_id as the key for the distance value
    point[reading.sensor_id] = reading.distance_mm || 0
  })

  const dataPoints = Array.from(timeMap.values())

  if (dataPoints.length > 0) {
    console.log("[v0] Sample chart point:", JSON.stringify(dataPoints[0]))
    console.log("[v0] Total chart points:", dataPoints.length)
  }

  return { dataPoints, sensors }
}

export async function getChartDataForDevice(deviceId: string, daysBack = 7): Promise<ChartData> {
  console.log(`[v0] Fetching chart data for device: ${deviceId}`)

  const supabase = await createClient()

  const daysAgo = new Date()
  daysAgo.setDate(daysAgo.getDate() - daysBack)

  const { data, error } = await supabase
    .from("sensor_readings")
    .select("received_at, distance_mm, sensor_id, device_id")
    .eq("device_id", deviceId)
    .gte("received_at", daysAgo.toISOString())
    .order("received_at", { ascending: true })

  if (error) {
    console.error(`[v0] Error fetching chart data for ${deviceId}:`, error)
    return { dataPoints: [], sensors: [] }
  }

  console.log(`[v0] Fetched ${data?.length || 0} data points for ${deviceId}`)

  if (!data || data.length === 0) {
    console.log(`[v0] No data available for ${deviceId}`)
    return { dataPoints: [], sensors: [] }
  }

  const uniqueSensors = new Map<string, string>()
  data.forEach((reading) => {
    if (reading.sensor_id && !uniqueSensors.has(reading.sensor_id)) {
      uniqueSensors.set(reading.sensor_id, reading.device_id || reading.sensor_id.substring(0, 8))
    }
  })

  const sortedSensors = Array.from(uniqueSensors.entries()).sort((a, b) => {
    const deviceIdA = a[1].toLowerCase()
    const deviceIdB = b[1].toLowerCase()
    return deviceIdA.localeCompare(deviceIdB)
  })

  const sensors: SensorInfo[] = sortedSensors.map(([id, deviceId], index) => ({
    id,
    deviceId,
    color: SENSOR_COLORS[index % SENSOR_COLORS.length],
  }))

  const timeMap = new Map<string, ChartDataPoint>()

  data.forEach((reading) => {
    const date = new Date(reading.received_at)
    const easternTime = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date)

    const timestamp = reading.received_at

    if (!timeMap.has(timestamp)) {
      timeMap.set(timestamp, {
        timestamp,
        formattedTime: easternTime,
      })
    }

    const point = timeMap.get(timestamp)!
    point[reading.sensor_id] = reading.distance_mm || 0
  })

  const dataPoints = Array.from(timeMap.values())

  return { dataPoints, sensors }
}
