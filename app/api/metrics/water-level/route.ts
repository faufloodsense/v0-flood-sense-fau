// app/api/metrics/water-level/route.ts
import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server" // corrected import path

type ReadingRow = {
  received_at: string
  distance_mm: number | null
}

function floorToBucket(date: Date, minutes = 5) {
  const d = new Date(date)
  d.setSeconds(0, 0)
  const m = d.getMinutes()
  d.setMinutes(m - (m % minutes))
  return d
}

export async function GET() {
  const supabase = createServiceClient()

  const sinceISO = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from("sensor_readings")
    .select("received_at, distance_mm")
    .gte("received_at", sinceISO)
    .order("received_at", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Bucket into 5-min slots and average (distance_mm → meters)
  const buckets = new Map<string, { sum: number; n: number }>()
  ;(data as ReadingRow[]).forEach((r) => {
    if (r.distance_mm == null) return
    const bucketISO = floorToBucket(new Date(r.received_at), 5).toISOString()
    const meters = r.distance_mm / 1000
    const entry = buckets.get(bucketISO) ?? { sum: 0, n: 0 }
    entry.sum += meters
    entry.n += 1
    buckets.set(bucketISO, entry)
  })

  const series = Array.from(buckets.entries())
    .map(([ts, { sum, n }]) => ({ ts, water_m: Number((sum / n).toFixed(3)) }))
    .sort((a, b) => a.ts.localeCompare(b.ts))

  return NextResponse.json({ series })
}
