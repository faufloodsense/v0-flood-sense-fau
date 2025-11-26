import { getChartData, getChartDataForDevice } from "@/lib/chart-data"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DistanceChartClient } from "@/components/distance-chart-client"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function ChartPage() {
  const chartData = await getChartData()
  const floodsense001Data = await getChartDataForDevice("floodsense001", 30)

  const now = new Date()
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Distance Over Time - Past 7 Days</CardTitle>
            <CardDescription>
              Sensor readings from {sevenDaysAgo.toLocaleDateString()} to {now.toLocaleDateString()} (
              {chartData.dataPoints.length} data points, {chartData.sensors.length} sensor(s))
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DistanceChartClient initialData={chartData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>FloodSense001 - Past 30 Days</CardTitle>
            <CardDescription>
              Sensor readings from {thirtyDaysAgo.toLocaleDateString()} to {now.toLocaleDateString()} (
              {floodsense001Data.dataPoints.length} data points)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DistanceChartClient initialData={floodsense001Data} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
