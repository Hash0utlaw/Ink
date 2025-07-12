export interface Client {
  id: string
  name: string
  avatarUrl: string
  email: string
  totalAppointments: number
  lastAppointmentDate: string
  notes: string | null
}

export interface AnalyticsData {
  profileViews: {
    currentMonth: number
    changePercent: number
  }
  bookingRequests: {
    currentMonth: number
    changePercent: number
  }
  estimatedRevenue: {
    currentMonth: number
    changePercent: number
  }
  revenueChartData: { month: string; revenue: number }[]
  stylePopularity: { style: string; count: number }[]
}

export interface ArtistDashboardData {
  clients: Client[]
  analytics: AnalyticsData
}
