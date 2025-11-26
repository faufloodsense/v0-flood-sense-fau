"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { MapPin, Navigation, FileText, Loader2 } from "lucide-react"

interface SensorRegistrationFormProps {
  initialSensorId: string
}

export function SensorRegistrationForm({ initialSensorId }: SensorRegistrationFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isGettingLocation, setIsGettingLocation] = useState(false)

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

      // Success - redirect to dashboard
      router.push("/?registered=true")
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg">{error}</div>
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
  )
}
