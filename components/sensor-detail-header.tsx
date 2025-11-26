import { ArrowLeft, Droplets } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface SensorDetailHeaderProps {
  sensorId: string
}

export function SensorDetailHeader({ sensorId }: SensorDetailHeaderProps) {
  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <Droplets className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Sensor {sensorId}</h1>
                <p className="text-sm text-muted-foreground">Detailed sensor monitoring</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
