"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Target, Loader2, CheckCircle } from "lucide-react"

interface CalibrationButtonProps {
  sensorId: string
  deviceId: string
}

export function CalibrationButton({ sensorId, deviceId }: CalibrationButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isCalibrating, setIsCalibrating] = useState(false)

  const handleStartCalibration = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/sensors/calibrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sensor_id: sensorId }),
      })

      if (response.ok) {
        setIsCalibrating(true)
      } else {
        const error = await response.json()
        alert(`Failed to start calibration: ${error.error}`)
      }
    } catch (error) {
      alert("Failed to start calibration. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setIsOpen(true)} className="gap-2">
        <Target className="h-4 w-4" />
        Calibrate Sensor
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md z-[9999]">
          {!isCalibrating ? (
            <>
              <DialogHeader>
                <DialogTitle>Calibrate {deviceId}</DialogTitle>
                <DialogDescription>
                  This will set the next sensor reading as the benchmark/calibration value for this device. Make sure
                  the sensor is positioned correctly before proceeding.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <p className="text-sm text-muted-foreground">
                  When you click "Start Calibration", the next reading from this sensor will be marked as the benchmark
                  reading.
                </p>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleStartCalibration} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Target className="mr-2 h-4 w-4" />
                      Start Calibration
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-success" />
                  Calibration Mode Active
                </DialogTitle>
                <DialogDescription>{deviceId} is now waiting for calibration.</DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  The next reading from this sensor will be marked as the <strong>benchmark reading</strong>.
                </p>
                <p className="text-sm text-muted-foreground">
                  Ensure the sensor is properly positioned and the environment represents normal conditions.
                </p>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => {
                    setIsOpen(false)
                    setIsCalibrating(false)
                  }}
                >
                  Done
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
