import { DashboardHeader } from "@/components/dashboard-header"
import { LiveDashboardWrapper } from "@/components/live-dashboard-wrapper"
import { getSensorsWithLatestReadings } from "@/lib/dashboard-data"

export default async function DashboardPage() {
  const sensors = await getSensorsWithLatestReadings()

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto p-6 space-y-6">
        <LiveDashboardWrapper initialSensors={sensors} />
      </main>
    </div>
  )
}
