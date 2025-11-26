// Weather API integration using Open-Meteo (free, no API key required)
// Fetches real-time weather based on provided latitude and longitude

interface WeatherData {
  ambient_temperature: number
  ambient_humidity: number
  cloud_cover: number
  weather_condition: string
}

export async function getCurrentWeather(latitude: number, longitude: number): Promise<WeatherData | null> {
  try {
    console.log(`[v0] Fetching weather for location: ${latitude}, ${longitude}`)

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code&hourly=cloud_cover&temperature_unit=fahrenheit&timezone=America/New_York&forecast_days=1`

    console.log("[v0] Weather API URL:", url)

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    })

    console.log("[v0] Weather API response status:", response.status)

    if (!response.ok) {
      console.error("[v0] Weather API error:", response.status, response.statusText)
      const errorText = await response.text()
      console.error("[v0] Weather API error body:", errorText)
      return null
    }

    const data = await response.json()

    console.log("[v0] Full weather API response:", JSON.stringify(data, null, 2))

    if (!data.current) {
      console.error("[v0] Weather API response missing 'current' data")
      return null
    }

    if (!data.hourly || !Array.isArray(data.hourly.cloud_cover)) {
      console.error("[v0] Weather API response missing 'hourly.cloud_cover' array")
      return null
    }

    const current = data.current
    const currentCloudCover = data.hourly.cloud_cover[0]

    console.log("[v0] Extracted values:")
    console.log("[v0]   - Temperature:", current.temperature_2m)
    console.log("[v0]   - Humidity:", current.relative_humidity_2m)
    console.log("[v0]   - Weather code:", current.weather_code)
    console.log("[v0]   - Cloud cover:", currentCloudCover)

    const weatherCondition = getWeatherCondition(current.weather_code)

    const weatherData = {
      ambient_temperature: current.temperature_2m ?? null,
      ambient_humidity: current.relative_humidity_2m ?? null,
      cloud_cover: currentCloudCover ?? null,
      weather_condition: weatherCondition,
    }

    console.log("[v0] Final weather data object:", JSON.stringify(weatherData, null, 2))

    if (weatherData.cloud_cover === null || weatherData.cloud_cover === undefined) {
      console.warn("[v0] WARNING: cloud_cover is null/undefined in final weather data!")
    }

    return weatherData
  } catch (error) {
    console.error("[v0] Error fetching weather:", error)
    if (error instanceof Error) {
      console.error("[v0] Error details:", error.message)
      console.error("[v0] Error stack:", error.stack)
    }
    return null
  }
}

// Map WMO Weather interpretation codes to readable conditions
function getWeatherCondition(code: number): string {
  const weatherCodes: Record<number, string> = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
  }

  return weatherCodes[code] || "Unknown"
}
