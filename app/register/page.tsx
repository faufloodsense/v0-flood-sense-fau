"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { SensorRegistrationForm } from "@/components/sensor-registration-form"
import { Card } from "@/components/ui/card"

function RegistrationContent() {
  const searchParams = useSearchParams()
  const sensorId =
    searchParams.get("sensorId") ||
    searchParams.get("sensor_id") ||
    ""

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Register Flood Sensor</h1>
          <p className="text-muted-foreground">
            Complete the sensor setup by providing location details and additional information.
          </p>
        </div>
        <SensorRegistrationForm initialSensorId={sensorId} />
      </Card>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>}>
      <RegistrationContent />
    </Suspense>
  )
}
