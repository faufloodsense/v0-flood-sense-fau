"use client"

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { ChartData } from "@/lib/chart-data"

interface DistanceChartClientProps {
  initialData: ChartData
}

export function DistanceChartClient({ initialData }: DistanceChartClientProps) {
  const { dataPoints, sensors } = initialData

  if (dataPoints.length === 0) {
    return (
      <div className="flex h-[400px] items-center justify-center text-muted-foreground">
        No data available for the selected time range
      </div>
    )
  }

  // Build chart config from sensors
  const chartConfig: Record<string, { label: string; color: string }> = {}
  sensors.forEach((sensor) => {
    chartConfig[sensor.id] = {
      label: sensor.deviceId,
      color: sensor.color,
    }
  })

  return (
    <ChartContainer config={chartConfig} className="h-[400px] w-full">
      <LineChart data={dataPoints} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="formattedTime"
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          className="text-muted-foreground"
          interval="preserveStartEnd"
        />
        <YAxis
          label={{ value: "Distance (mm)", angle: -90, position: "insideLeft" }}
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          className="text-muted-foreground"
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        {sensors.map((sensor) => (
          <Line
            key={sensor.id}
            type="monotone"
            dataKey={sensor.id}
            name={sensor.deviceId}
            stroke={sensor.color}
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        ))}
      </LineChart>
    </ChartContainer>
  )
}
