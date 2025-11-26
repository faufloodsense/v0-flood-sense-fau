import { createClient } from "@/lib/supabase/server"

type Row = {
  id: string
  received_at: string
  distance_mm: number | null
  ambient_temperature: number | null
  ambient_humidity: number | null
  battery_level: number | null
}

async function getRecentReadings(sensorId: string): Promise<Row[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("sensor_readings")
    .select("id, received_at, distance_mm, ambient_temperature, ambient_humidity, battery_level")
    .eq("sensor_id", sensorId)
    .order("received_at", { ascending: false })
    .limit(20)

  if (error) return []
  return data ?? []
}

export async function SensorReadingsTable({ sensorId }: { sensorId: string }) {
  const rows = await getRecentReadings(sensorId)

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-muted-foreground">
          <tr>
            <th className="py-2 pr-4">Time</th>
            <th className="py-2 pr-4">Water (m)</th>
            <th className="py-2 pr-4">Temp (°C)</th>
            <th className="py-2 pr-4">Humidity (%)</th>
            <th className="py-2 pr-4">Battery</th>
          </tr>
        </thead>
        <tbody className="text-foreground">
          {rows.map((r) => {
            const meters = r.distance_mm != null ? (r.distance_mm / 1000).toFixed(3) : "—"
            const batt = r.battery_level != null ? `${r.battery_level}%` : "—"
            return (
              <tr key={r.id} className="border-b border-border last:border-none">
                <td className="py-2 pr-4">{new Date(r.received_at).toLocaleString()}</td>
                <td className="py-2 pr-4">{meters}</td>
                <td className="py-2 pr-4">{r.ambient_temperature ?? "—"}</td>
                <td className="py-2 pr-4">{r.ambient_humidity ?? "—"}</td>
                <td className="py-2 pr-4">{batt}</td>
              </tr>
            )
          })}
          {!rows.length && (
            <tr>
              <td className="py-3 text-muted-foreground" colSpan={5}>
                No readings yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
