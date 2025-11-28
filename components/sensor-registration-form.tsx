"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { MapPin, Navigation, FileText, Loader2, CheckCircle, AlertTriangle } from "lucide-react"

interface SensorRegistrationFormProps {
  initialSensorId: string
}

export function SensorRegistrationForm({ initialSensorId }: SensorRegistrationFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [showCalibrationModal, setShowCalibrationModal] = useState(false)
  const [registeredSensorId, setRegisteredSensorId] = useState<string | null>(null)
  const [isCalibrating, setIsCalibrating] = useState(false)
  const [calibrationStatus, setCalibrationStatus] = useState<"idle" | "pending" | "success">("idle")

  const [formData, setFormData] = useState({
    sensorId: initialSensorId,
    latitude: "",
    longitude: "",
    address: "",
    notes: "",
  })

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser")
      return
    }

    setIsGettingLocation(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData((prev) => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        }))
        setIsGettingLocation(false)
      },
      (error) => {
        setError(`Unable to get location: ${error.message}`)
        setIsGettingLocation(false)
      },
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      // Validate required fields
      if (!formData.sensorId) {
        throw new Error("Sensor ID is required")
      }

      if (!formData.latitude || !formData.longitude) {
        throw new Error("Location coordinates are required")
      }

      const response = await fetch("/api/sensors/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          device_id: formData.sensorId,
          latitude: Number.parseFloat(formData.latitude),
          longitude: Number.parseFloat(formData.longitude),
          location_description: formData.address,
          notes: formData.notes,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to register sensor")
      }

      setRegisteredSensorId(data.sensor?.id || null)
      setShowCalibrationModal(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStartCalibration = async () => {
    if (!registeredSensorId) return

    setIsCalibrating(true)
    try {
      const response = await fetch("/api/sensors/calibrate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sensor_id: registeredSensorId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to start calibration")
      }

      setCalibrationStatus("pending")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start calibration")
    } finally {
      setIsCalibrating(false)
    }
  }

  const handleSkipCalibration = () => {
    router.push("/?registered=true")
  }

  const handleFinish = () => {
    router.push("/?registered=true&calibration=pending")
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="sensorId" className="text-foreground">
            Sensor ID
          </Label>
          <Input
            id="sensorId"
            value={formData.sensorId}
            onChange={(e) => setFormData({ ...formData, sensorId: e.target.value })}
            placeholder="e.g., flood-sensor-001"
            required
            className="bg-background"
          />
          <p className="text-sm text-muted-foreground">This should be auto-populated from the QR code</p>
        </div>

        <Card className="p-4 bg-muted/50">
          <div className="flex items-start gap-3 mb-4">
            <MapPin className="h-5 w-5 text-primary mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1">Location Coordinates</h3>
              <p className="text-sm text-muted-foreground">
                Enter the exact GPS coordinates where the sensor is installed
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
            <div className="space-y-2">
              <Label htmlFor="latitude" className="text-foreground">
                Latitude
              </Label>
              <Input
                id="latitude"
                type="number"
                step="any"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                placeholder="e.g., 29.6516"
                required
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="longitude" className="text-foreground">
                Longitude
              </Label>
              <Input
                id="longitude"
                type="number"
                step="any"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                placeholder="e.g., -82.3248"
                required
                className="bg-background"
              />
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleGetCurrentLocation}
            disabled={isGettingLocation}
            className="w-full bg-transparent"
          >
            {isGettingLocation ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Getting Location...
              </>
            ) : (
              <>
                <Navigation className="mr-2 h-4 w-4" />
                Use Current Location
              </>
            )}
          </Button>
        </Card>

        <div className="space-y-2">
          <Label htmlFor="address" className="text-foreground">
            Address / Location Description
          </Label>
          <Input
            id="address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="e.g., Corner of Main St and 5th Ave, near the bridge"
            className="bg-background"
          />
          <p className="text-sm text-muted-foreground">Provide a human-readable description of the sensor location</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes" className="text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Additional Notes
          </Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Any additional information about the sensor installation, nearby landmarks, or special considerations..."
            rows={4}
            className="bg-background resize-none"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" onClick={() => router.push("/")} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Registering...
              </>
            ) : (
              "Register Sensor"
            )}
          </Button>
        </div>
      </form>

      <Dialog open={showCalibrationModal} onOpenChange={setShowCalibrationModal}>
        <DialogContent className="sm:max-w-md z-[9999]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {calibrationStatus === "idle" && <CheckCircle className="h-5 w-5 text-green-500" />}
              {calibrationStatus === "pending" && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
              {calibrationStatus === "success" && <CheckCircle className="h-5 w-5 text-green-500" />}
              {calibrationStatus === "idle" ? "Sensor Registered Successfully!" : "Calibration Mode"}
            </DialogTitle>
            <DialogDescription>
              {calibrationStatus === "idle" && (
                <>
                  Your sensor <strong>{formData.sensorId}</strong> has been registered. Would you like to calibrate the
                  sensor now?
                  <br />
                  <br />
                  Calibration sets a benchmark reading that will be used as a reference point for future measurements.
                </>
              )}
              {calibrationStatus === "pending" && (
                <>
                  <strong>Calibration mode is active.</strong>
                  <br />
                  <br />
                  The next sensor reading received will be marked as the benchmark reading. Make sure the sensor is
                  positioned correctly and the water level is at the expected baseline before the next reading.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {calibrationStatus === "idle" && (
              <>
                <Button variant="outline" onClick={handleSkipCalibration} className="w-full sm:w-auto bg-transparent">
                  Skip for Now
                </Button>
                <Button onClick={handleStartCalibration} disabled={isCalibrating} className="w-full sm:w-auto">
                  {isCalibrating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    "Start Calibration"
                  )}
                </Button>
              </>
            )}
            {calibrationStatus === "pending" && (
              <Button onClick={handleFinish} className="w-full sm:w-auto">
                Done - Go to Dashboard
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
