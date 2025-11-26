import { Droplets, Bell, Settings, Calendar, PlusCircle, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"

export function DashboardHeader() {
  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Droplets className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Flood Hive</h1>
                <p className="text-sm text-muted-foreground">Flood Monitoring System</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Select defaultValue="12h">
              <SelectTrigger className="w-[140px] bg-secondary border-border">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">Last 1 hour</SelectItem>
                <SelectItem value="6h">Last 6 hours</SelectItem>
                <SelectItem value="12h">Last 12 hours</SelectItem>
                <SelectItem value="24h">Last 24 hours</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
              </SelectContent>
            </Select>

            <Link href="/register">
              <Button variant="default" size="sm" className="gap-2">
                <PlusCircle className="h-4 w-4" />
                Register Device
              </Button>
            </Link>

            <Link href="/chart">
              <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                <BarChart3 className="h-4 w-4" />
                Charts
              </Button>
            </Link>

            <Button variant="outline" size="icon" className="relative bg-transparent">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                3
              </span>
            </Button>

            <Button variant="outline" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
