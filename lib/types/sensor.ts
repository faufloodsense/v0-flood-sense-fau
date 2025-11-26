export interface Sensor {
  id: string
  device_id: string
  name: string | null
  latitude: number | null
  longitude: number | null
  location_description: string | null
  status: "active" | "inactive" | "maintenance"
  created_at: string
  updated_at: string
}

export interface SensorReading {
  id: string
  sensor_id: string
  device_id: string
  distance_mm: number | null
  battery_level: number | null
  signal_strength: number | null
  ambient_temperature: number | null
  ambient_humidity: number | null
  cloud_cover: number | null
  weather_condition: string | null
  raw_payload: unknown
  received_at: string
}
