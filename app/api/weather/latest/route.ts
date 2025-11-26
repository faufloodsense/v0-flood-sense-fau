import { NextResponse } from "next/server"
import { getLatestWeatherData } from "@/lib/dashboard-data"

// Force dynamic execution and disable ISR for this route
export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  try {
    const data = await getLatestWeatherData()

    const now = Date.now()
    const receivedAt = data?.received_at ? new Date(data.received_at).getTime() : 0
    const minutesOld = receivedAt ? Math.round((now - receivedAt) / 60000) : null
    const stale = minutesOld !== null ? minutesOld > 30 : true

    return NextResponse.json(
      { data, meta: { stale, minutesOld, asOf: data?.received_at ?? null } },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 })
  }
}
