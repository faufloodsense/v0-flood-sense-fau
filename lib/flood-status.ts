// Shared flood status utility for consistent color coding across the app

export interface FloodStatus {
  level: string
  color: string
  bgColor: string
  borderColor: string
  mapColor: string // Color for map markers
  severity: number // Added numeric severity for comparison
}

export function getFloodStatus(waterDepth: number | null | undefined): FloodStatus {
  if (waterDepth === null || waterDepth === undefined) {
    return {
      level: "No Data",
      color: "text-muted-foreground",
      bgColor: "bg-muted/50",
      borderColor: "border-muted",
      mapColor: "#6b7280", // gray
      severity: -1,
    }
  }
  if (waterDepth < 10) {
    return {
      level: "No Flooding",
      color: "text-success",
      bgColor: "bg-success/10",
      borderColor: "border-success/20",
      mapColor: "#22c55e", // green
      severity: 0,
    }
  }
  if (waterDepth < 50) {
    return {
      level: "Low Flooding",
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      borderColor: "border-yellow-500/20",
      mapColor: "#eab308", // yellow
      severity: 1,
    }
  }
  if (waterDepth < 150) {
    return {
      level: "Moderate Flooding",
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      borderColor: "border-orange-500/20",
      mapColor: "#f97316", // orange
      severity: 2,
    }
  }
  if (waterDepth < 300) {
    return {
      level: "Major Flooding",
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/20",
      mapColor: "#ef4444", // red
      severity: 3,
    }
  }
  return {
    level: "Extreme Flooding",
    color: "text-red-700",
    bgColor: "bg-red-700/10",
    borderColor: "border-red-700/20",
    mapColor: "#7f1d1d", // dark red
    severity: 4,
  }
}

export function isModerateOrHigher(status: FloodStatus): boolean {
  return status.severity >= 2 // Moderate, Major, or Extreme
}

export function isLowOrBelow(status: FloodStatus): boolean {
  return status.severity <= 1 // No Flooding or Low Flooding
}
