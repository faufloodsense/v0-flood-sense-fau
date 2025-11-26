import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getSensorsWithLatestReadings } from "@/lib/dashboard-data"
import Link from "next/link"

export async function ActiveSensorsTable() {
  const sensors = await getSensorsWithLatestReadings()

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Sensor Network Overview</CardTitle>
        <CardDescription className="text-muted-foreground">Detailed status of all active flood sensors</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground">Sensor ID</TableHead>
              <TableHead className="text-muted-foreground">Location</TableHead>
              <TableHead className="text-muted-foreground">Water Level</TableHead>
              <TableHead className="text-muted-foreground">Battery</TableHead>
              <TableHead className="text-muted-foreground">Status</TableHead>
              <TableHead className="text-muted-foreground">Last Update</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sensors.map((sensor) => (
              <TableRow key={sensor.device_id} className="border-border hover:bg-secondary/50 cursor-pointer">
                <TableCell className="font-mono font-semibold text-foreground">
                  <Link href={`/sensors/${sensor.device_id}`} className="hover:underline">
                    {sensor.device_id}
                  </Link>
                </TableCell>
                <TableCell className="text-foreground">
                  {sensor.location_description ??
                    `${sensor.latitude?.toFixed?.(5) ?? sensor.latitude}, ${sensor.longitude?.toFixed?.(5) ?? sensor.longitude}`}
                </TableCell>
                <TableCell>
                  <span
                    className={`font-semibold ${
                      sensor.status === "critical"
                        ? "text-destructive"
                        : sensor.status === "warning"
                          ? "text-warning"
                          : "text-success"
                    }`}
                  >
                    {sensor.latest_reading?.distance_mm != null
                      ? (sensor.latest_reading.distance_mm / 1000).toFixed(2)
                      : "—"}
                    m
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          (sensor.latest_reading?.battery_level ?? 0 > 80)
                            ? "bg-success"
                            : (sensor.latest_reading?.battery_level ?? 0 > 50)
                              ? "bg-warning"
                              : "bg-destructive"
                        }`}
                        style={{ width: `${sensor.latest_reading?.battery_level ?? 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{sensor.latest_reading?.battery_level ?? 0}%</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      sensor.status === "critical"
                        ? "destructive"
                        : sensor.status === "warning"
                          ? "secondary"
                          : "outline"
                    }
                    className={
                      sensor.status === "normal"
                        ? "bg-success/10 text-success border-success/20"
                        : sensor.status === "warning"
                          ? "bg-warning/10 text-warning border-warning/20"
                          : ""
                    }
                  >
                    {sensor.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {sensor.latest_reading?.received_at
                    ? new Date(sensor.latest_reading.received_at).toLocaleString()
                    : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
