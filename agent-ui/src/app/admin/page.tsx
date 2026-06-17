'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/authStore'
import { usePlaygroundStore } from '@/store'
import AuthGuard from '@/components/AuthGuard'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ShieldAlert, 
  LogOut, 
  MessageSquare, 
  Search, 
  Activity, 
  Users, 
  Database, 
  Clock,
  RefreshCw,
  Edit2,
  Trash2,
  Check,
  X,
  BarChart2,
  PieChart,
  Sun,
  Moon
} from 'lucide-react'

interface LoginLog {
  id: number
  user_id: number
  email: string
  name: string
  role: string
  login_time: string
  logout_time: string | null
}

interface DBUser {
  id: number
  name: string
  email: string
  role: string
  login_count?: number
  last_login?: string | null
  is_online?: boolean
  created_at?: string
}

export default function AdminPage() {
  const router = useRouter()
  const { token, user, clearAuth } = useAuthStore()

  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark'
    setThemeMode(savedTheme as 'dark' | 'light')
    if (savedTheme === 'light') {
      document.documentElement.classList.remove('dark')
    } else {
      document.documentElement.classList.add('dark')
    }
  }, [])

  const handleToggleTheme = () => {
    const newTheme = themeMode === 'dark' ? 'light' : 'dark'
    setThemeMode(newTheme)
    localStorage.setItem('theme', newTheme)
    if (newTheme === 'light') {
      document.documentElement.classList.remove('dark')
    } else {
      document.documentElement.classList.add('dark')
    }
  }
  
  // Tabs: logs, users, insights
  const [activeTab, setActiveTab] = useState<'logs' | 'users' | 'insights'>('logs')

  // Chart aggregation filter: daily, weekly, monthly
  const [chartFilter, setChartFilter] = useState<'daily' | 'weekly' | 'monthly'>('weekly')

  // Logs state
  const [logs, setLogs] = useState<LoginLog[]>([])
  const [filteredLogs, setFilteredLogs] = useState<LoginLog[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all')
  const [timeFilter, setTimeFilter] = useState<'all' | 'daily' | 'weekly' | 'monthly'>('all')
  const [isLogsLoading, setIsLogsLoading] = useState(false)

  // Users state
  const [users, setUsers] = useState<DBUser[]>([])
  const [filteredUsers, setFilteredUsers] = useState<DBUser[]>([])
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [isUsersLoading, setIsUsersLoading] = useState(false)

  // Selected bar details state for clicking counts
  const [selectedBarDetails, setSelectedBarDetails] = useState<{
    label: string
    registeredUsers: DBUser[]
    loggedInLogs: LoginLog[]
  } | null>(null)

  const getTimeframeString = (label: string) => {
    if (chartFilter === 'daily') {
      return `Today, Hour ${label}:00`
    } else if (chartFilter === 'weekly') {
      const dayMap: Record<string, string> = {
        'Sun': 'Sunday', 'Mon': 'Monday', 'Tue': 'Tuesday', 'Wed': 'Wednesday',
        'Thu': 'Thursday', 'Fri': 'Friday', 'Sat': 'Saturday'
      }
      return `This Week, ${dayMap[label] || label}`
    } else {
      const monthMap: Record<string, string> = {
        'Jan': 'January', 'Feb': 'February', 'Mar': 'March', 'Apr': 'April',
        'May': 'May', 'Jun': 'June', 'Jul': 'July', 'Aug': 'August',
        'Sep': 'September', 'Oct': 'October', 'Nov': 'November', 'Dec': 'December'
      }
      return `This Year, ${monthMap[label] || label}`
    }
  }

  // Animation trigger state for charts
  const [animateCharts, setAnimateCharts] = useState(false)

  // Editing state
  const [editingUserId, setEditingUserId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editRole, setEditRole] = useState('user')

  const fetchLogs = async (silent = false) => {
    if (!silent) setIsLogsLoading(true)
    try {
      const response = await fetch('http://localhost:5000/api/auth/all-login-logs', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (response.ok) setLogs(data)
    } catch (err) {
      console.error(err)
      toast.error('Failed to load access logs')
    } finally {
      setIsLogsLoading(false)
    }
  }

  const fetchUsers = async (silent = false) => {
    if (!silent) setIsUsersLoading(true)
    try {
      const response = await fetch('http://localhost:5000/api/auth/users', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (response.ok) setUsers(data)
    } catch (err) {
      console.error(err)
      toast.error('Failed to load registered operators')
    } finally {
      setIsUsersLoading(false)
    }
  }

  useEffect(() => {
    if (token) {
      fetchLogs()
      fetchUsers()
    }
  }, [token])

  // Filter logs
  useEffect(() => {
    let result = [...logs]
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (log) =>
          log.name.toLowerCase().includes(query) ||
          log.email.toLowerCase().includes(query)
      )
    }
    if (statusFilter === 'online') {
      result = result.filter((log) => !log.logout_time)
    } else if (statusFilter === 'offline') {
      result = result.filter((log) => !!log.logout_time)
    }

    // Filter by time frame
    const now = dayjs()
    if (timeFilter === 'daily') {
      result = result.filter((log) => dayjs(log.login_time).isSame(now, 'day'))
    } else if (timeFilter === 'weekly') {
      result = result.filter((log) => dayjs(log.login_time).isSame(now, 'week'))
    } else if (timeFilter === 'monthly') {
      result = result.filter((log) => dayjs(log.login_time).isSame(now, 'month'))
    }

    setFilteredLogs(result)
  }, [logs, searchQuery, statusFilter, timeFilter])

  // Filter users
  useEffect(() => {
    let result = [...users]
    if (userSearchQuery.trim()) {
      const query = userSearchQuery.toLowerCase()
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query)
      )
    }
    setFilteredUsers(result)
  }, [users, userSearchQuery])

  // Trigger chart loading animation
  useEffect(() => {
    if (activeTab === 'insights') {
      setAnimateCharts(false)
      const timer = setTimeout(() => setAnimateCharts(true), 50)
      return () => clearTimeout(timer)
    }
  }, [activeTab, chartFilter])

  const handleRefresh = async () => {
    if (activeTab === 'logs') {
      await fetchLogs(true)
      toast.success('Logs feed updated')
    } else if (activeTab === 'users') {
      await fetchUsers(true)
      toast.success('User directory updated')
    } else {
      await fetchLogs(true)
      await fetchUsers(true)
      toast.success('Visual analytics updated')
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:5000/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
    } catch (err) {
      console.error(err)
    }
    // Reset Playground Store memory states to prevent data leakage between users
    usePlaygroundStore.setState({
      messages: [],
      sessionsData: null,
      selectedTeamId: null,
      streamingErrorMessage: '',
      isStreaming: false,
      isSessionsLoading: false,
      agents: [],
      teams: [],
      selectedModel: ''
    })
    clearAuth()
    toast.success('Logged out successfully')
    router.replace('/login')
  }

  const startEditing = (u: DBUser) => {
    setEditingUserId(u.id)
    setEditName(u.name)
    setEditEmail(u.email)
    setEditRole(u.role)
  }

  const cancelEditing = () => {
    setEditingUserId(null)
  }

  const handleSaveUser = async (userId: number) => {
    if (!editName || !editEmail) {
      toast.error('Please fill in Name and Email')
      return
    }

    try {
      const response = await fetch(`http://localhost:5000/api/auth/users/${userId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: editName, email: editEmail, role: editRole })
      })

      const data = await response.json()
      if (!response.ok) {
        toast.error(data.message || 'Update failed')
        return
      }

      toast.success('Operator saved successfully')
      setEditingUserId(null)
      fetchUsers(true)
      fetchLogs(true)
    } catch (err) {
      console.error(err)
      toast.error('Failed to connect to database')
    }
  }

  const handleDeleteUser = async (userId: number) => {
    if (userId === user?.id) {
      toast.error('You cannot delete your own admin account')
      return
    }

    const confirmDelete = window.confirm('Are you sure you want to delete this operator?')
    if (!confirmDelete) return

    try {
      const response = await fetch(`http://localhost:5000/api/auth/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        toast.error('Deletion failed')
        return
      }

      toast.success('Operator deleted')
      fetchUsers(true)
      fetchLogs(true)
    } catch (err) {
      console.error(err)
      toast.error('Failed to connect to database')
    }
  }

  // Group filteredLogs to keep only the latest session record for each unique user
  const uniqueLogsMap = new Map<number, LoginLog>()
  filteredLogs.forEach((log) => {
    if (!uniqueLogsMap.has(log.user_id)) {
      uniqueLogsMap.set(log.user_id, log)
    }
  })
  const uniqueLogs = Array.from(uniqueLogsMap.values())

  // Metrics
  const totalLogs = logs.length
  const activeSessions = logs.filter((log) => !log.logout_time).length
  const uniqueLoggedInCount = new Set(logs.map((log) => log.user_id)).size
  const registeredUsersCount = users.length

  // --- Dynamic Stacked Analytics Configurations ---
  const now = dayjs()

  // Initialize bins based on chartFilter
  let chartData: {
    label: string
    registeredCount: number
    loggedInCount: number
    registeredUsers: DBUser[]
    loggedInLogs: LoginLog[]
  }[] = []

  if (chartFilter === 'daily') {
    const dailyBins = ['00-04', '04-08', '08-12', '12-16', '16-20', '20-24']
    chartData = dailyBins.map((bin) => ({
      label: bin,
      registeredCount: 0,
      loggedInCount: 0,
      registeredUsers: [],
      loggedInLogs: []
    }))

    // Filter and group users (registered today)
    users.forEach((u) => {
      if (u.created_at) {
        const cTime = dayjs(u.created_at)
        if (cTime.isSame(now, 'day')) {
          const hour = cTime.hour()
          const binIdx = Math.floor(hour / 4)
          if (binIdx >= 0 && binIdx < 6) {
            chartData[binIdx].registeredCount++
            chartData[binIdx].registeredUsers.push(u)
          }
        }
      }
    })

    // Filter and group login logs (logged in today)
    logs.forEach((log) => {
      const lTime = dayjs(log.login_time)
      if (lTime.isSame(now, 'day')) {
        const hour = lTime.hour()
        const binIdx = Math.floor(hour / 4)
        if (binIdx >= 0 && binIdx < 6) {
          chartData[binIdx].loggedInCount++
          chartData[binIdx].loggedInLogs.push(log)
        }
      }
    })

  } else if (chartFilter === 'weekly') {
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    chartData = daysOfWeek.map((day) => ({
      label: day,
      registeredCount: 0,
      loggedInCount: 0,
      registeredUsers: [],
      loggedInLogs: []
    }))

    // Filter and group users (registered this week)
    users.forEach((u) => {
      if (u.created_at) {
        const cTime = dayjs(u.created_at)
        if (cTime.isSame(now, 'week')) {
          const dayIdx = cTime.day()
          if (dayIdx >= 0 && dayIdx < 7) {
            chartData[dayIdx].registeredCount++
            chartData[dayIdx].registeredUsers.push(u)
          }
        }
      }
    })

    // Filter and group login logs (logged in this week)
    logs.forEach((log) => {
      const lTime = dayjs(log.login_time)
      if (lTime.isSame(now, 'week')) {
        const dayIdx = lTime.day()
        if (dayIdx >= 0 && dayIdx < 7) {
          chartData[dayIdx].loggedInCount++
          chartData[dayIdx].loggedInLogs.push(log)
        }
      }
    })

  } else if (chartFilter === 'monthly') {
    const monthsOfYear = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    chartData = monthsOfYear.map((m) => ({
      label: m,
      registeredCount: 0,
      loggedInCount: 0,
      registeredUsers: [],
      loggedInLogs: []
    }))

    // Filter and group users (registered this year)
    users.forEach((u) => {
      if (u.created_at) {
        const cTime = dayjs(u.created_at)
        if (cTime.isSame(now, 'year')) {
          const monthIdx = cTime.month()
          if (monthIdx >= 0 && monthIdx < 12) {
            chartData[monthIdx].registeredCount++
            chartData[monthIdx].registeredUsers.push(u)
          }
        }
      }
    })

    // Filter and group login logs (logged in this year)
    logs.forEach((log) => {
      const lTime = dayjs(log.login_time)
      if (lTime.isSame(now, 'year')) {
        const monthIdx = lTime.month()
        if (monthIdx >= 0 && monthIdx < 12) {
          chartData[monthIdx].loggedInCount++
          chartData[monthIdx].loggedInLogs.push(log)
        }
      }
    })
  }

  const maxChartValue = Math.max(
    ...chartData.map((d) => d.registeredCount + d.loggedInCount),
    1
  )

  // Donut chart details
  const adminCount = users.filter((u) => u.role === 'admin').length
  const standardCount = users.filter((u) => u.role === 'user').length
  const totalUsers = users.length || 1
  const adminPercentage = Math.round((adminCount / totalUsers) * 100)
  const standardPercentage = 100 - adminPercentage

  const occupancyPercentage = Math.round((activeSessions / totalUsers) * 100)

  // Donut SVG params
  const radius = 50
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (adminPercentage / 100) * circumference

  return (
    <AuthGuard allowedRoles={['admin']}>
      <div className="min-h-screen bg-background text-secondary font-dmmono p-6 overflow-x-hidden relative">
        {/* Background gradients */}
        <div className="absolute top-0 right-0 h-[400px] w-[400px] rounded-full bg-blue-500/5 blur-[150px]" />
        <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-blue-600/5 blur-[150px]" />

        <div className="max-w-7xl mx-auto space-y-6 relative z-10">
          
          {/* Header Panel */}
          <header className="flex flex-col md:flex-row items-start md:items-center justify-between border border-primary/15 bg-background-secondary/30 backdrop-blur-md p-5 rounded-2xl gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-500">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-sm font-bold uppercase tracking-widest text-primary">
                  Industrial Control Tower
                </h1>
                <p className="text-[10px] text-muted uppercase tracking-wider">
                  Authentication & Access Audit Dashboard
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
              <div className="text-right mr-3 hidden sm:block">
                <div className="text-xs text-primary uppercase font-bold">{user?.name}</div>
                <div className="text-[9px] text-blue-500 uppercase tracking-widest">Sysop Admin</div>
              </div>

              <button
                onClick={handleToggleTheme}
                type="button"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-primary/15 hover:border-primary/25 bg-background-secondary/40 hover:bg-background-secondary/70 text-xs text-muted hover:text-primary transition-all duration-200 cursor-pointer"
              >
                {themeMode === 'dark' ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-blue-400" />
                    <span className="uppercase text-[10px] tracking-wider font-semibold">LIGHT</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-blue-500" />
                    <span className="uppercase text-[10px] tracking-wider font-semibold">DARK</span>
                  </>
                )}
              </button>

              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-primary/15 hover:border-primary/30 bg-background-secondary/40 hover:bg-background-secondary/70 text-xs text-muted hover:text-primary transition-all duration-200 cursor-pointer"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span className="uppercase text-[10px] tracking-wider font-semibold">Playground</span>
              </button>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-destructive/20 hover:border-destructive/45 bg-destructive/5 hover:bg-destructive/15 text-xs text-destructive hover:text-red-400 transition-all duration-200 cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="uppercase text-[10px] tracking-wider font-semibold">Exit</span>
              </button>
            </div>
          </header>

          {/* Metrics Overview Grid */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="border border-primary/15 bg-background-secondary/35 backdrop-blur-md p-4 rounded-xl flex items-center justify-between shadow-lg">
              <div className="space-y-1">
                <div className="text-[10px] text-muted uppercase tracking-widest">Active Connections</div>
                <div className="text-2xl font-bold text-primary leading-none pt-1">{activeSessions}</div>
                <div className="text-[9px] text-green-500 uppercase tracking-wider flex items-center gap-1 pt-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-ping" />
                  Live Sessions
                </div>
              </div>
              <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl border border-blue-500/20">
                <Activity className="h-5 w-5" />
              </div>
            </div>

            <div className="border border-primary/15 bg-background-secondary/35 backdrop-blur-md p-4 rounded-xl flex items-center justify-between shadow-lg">
              <div className="space-y-1">
                <div className="text-[10px] text-muted uppercase tracking-widest">System Login Logs</div>
                <div className="text-2xl font-bold text-primary leading-none pt-1">{totalLogs}</div>
                <div className="text-[9px] text-muted uppercase tracking-wider pt-1">Logs Retained</div>
              </div>
              <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl border border-blue-500/20">
                <Clock className="h-5 w-5" />
              </div>
            </div>

            <div className="border border-primary/15 bg-background-secondary/35 backdrop-blur-md p-4 rounded-xl flex items-center justify-between shadow-lg">
              <div className="space-y-1">
                <div className="text-[10px] text-muted uppercase tracking-widest">Unique Operators</div>
                <div className="text-2xl font-bold text-primary leading-none pt-1">{registeredUsersCount}</div>
                <div className="text-[9px] text-muted uppercase tracking-wider pt-1">Registered Accounts</div>
              </div>
              <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl border border-blue-500/20">
                <Users className="h-5 w-5" />
              </div>
            </div>

            <div className="border border-primary/15 bg-background-secondary/35 backdrop-blur-md p-4 rounded-xl flex items-center justify-between shadow-lg">
              <div className="space-y-1">
                <div className="text-[10px] text-muted uppercase tracking-widest">Vault Status</div>
                <div className="text-xs font-bold text-primary leading-none pt-2 uppercase tracking-wide">JWT SECURED</div>
                <div className="text-[9px] text-green-500 uppercase tracking-wider pt-1">Database Healthy</div>
              </div>
              <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl border border-blue-500/20">
                <Database className="h-5 w-5" />
              </div>
            </div>
          </section>

          {/* Main Control Console Card */}
          <div className="border border-primary/15 bg-background-secondary/30 backdrop-blur-md rounded-2xl overflow-hidden shadow-2xl p-6 space-y-4">
            
            {/* Tab Selection Row */}
            <div className="flex border-b border-primary/10 mb-2">
              <button
                onClick={() => setActiveTab('logs')}
                className={`px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-all duration-200 cursor-pointer ${
                  activeTab === 'logs'
                    ? 'border-b-2 border-blue-500 text-blue-500'
                    : 'border-b border-transparent text-muted hover:text-primary'
                }`}
              >
                Access Registry Logs
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-all duration-200 cursor-pointer ${
                  activeTab === 'users'
                    ? 'border-b-2 border-blue-500 text-blue-500'
                    : 'border-b border-transparent text-muted hover:text-primary'
                }`}
              >
                Operator Directory (CRUD)
              </button>
              <button
                onClick={() => setActiveTab('insights')}
                className={`px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-all duration-200 cursor-pointer ${
                  activeTab === 'insights'
                    ? 'border-b-2 border-blue-500 text-blue-500'
                    : 'border-b border-transparent text-muted hover:text-primary'
                }`}
              >
                System Visual Insights
              </button>
            </div>

            {/* Tab 1: Access Logs */}
            {activeTab === 'logs' && (
              <div className="space-y-4">
                {/* Table Controls */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-primary uppercase tracking-wider">Access Registry Feed (Unique Sessions)</span>
                    <button 
                      onClick={handleRefresh}
                      disabled={isLogsLoading}
                      className="p-1.5 rounded-lg border border-primary/10 bg-background-secondary/30 text-muted hover:text-primary hover:border-primary/25 transition-all cursor-pointer"
                      title="Reload Registry Feed"
                    >
                      <RefreshCw className={`h-3 w-3 ${isLogsLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    {/* Search Bar */}
                    <div className="relative">
                      <span className="absolute inset-y-0 left-3 flex items-center text-muted">
                        <Search className="h-3.5 w-3.5" />
                      </span>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search name/email..."
                        className="w-full sm:w-60 h-8 pl-9 pr-4 rounded-lg border border-primary/15 bg-background text-xs text-secondary placeholder:text-muted focus:border-blue-500/50 focus:outline-none transition-all"
                      />
                    </div>

                    {/* Time Frame Filter */}
                    <div className="flex rounded-lg border border-primary/10 bg-background-secondary/35 p-0.5 overflow-hidden">
                      {[
                        { value: 'all', label: 'All Time' },
                        { value: 'daily', label: 'Daily' },
                        { value: 'weekly', label: 'Weekly' },
                        { value: 'monthly', label: 'Monthly' }
                      ].map((item) => (
                        <button
                          key={item.value}
                          onClick={() => setTimeFilter(item.value as any)}
                          className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                            timeFilter === item.value
                              ? 'bg-blue-600 text-white shadow-md'
                              : 'text-muted hover:text-primary'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    {/* Status Filters */}
                    <div className="flex rounded-lg border border-primary/10 bg-background-secondary/35 p-0.5 overflow-hidden">
                      {['all', 'online', 'offline'].map((filter) => (
                        <button
                          key={filter}
                          onClick={() => setStatusFilter(filter as any)}
                          className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                            statusFilter === filter
                              ? 'bg-blue-600 text-white shadow-md'
                              : 'text-muted hover:text-primary'
                          }`}
                        >
                          {filter}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Table Area */}
                <div className="overflow-x-auto rounded-xl border border-primary/10 bg-background-secondary/10">
                  {isLogsLoading ? (
                    <div className="flex flex-col items-center justify-center p-12 space-y-3">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                      <div className="text-[10px] text-muted uppercase tracking-widest">Fetching Audit Data...</div>
                    </div>
                  ) : uniqueLogs.length === 0 ? (
                    <div className="p-12 text-center text-xs text-muted uppercase tracking-wider">
                      No unique active session logs found.
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-primary/10 bg-background-secondary/60 text-muted font-bold uppercase tracking-wider text-[10px]">
                          <th className="p-3">User ID</th>
                          <th className="p-3">Operator</th>
                          <th className="p-3">Identifier</th>
                          <th className="p-3">Authority</th>
                          <th className="p-3">Latest Login Event</th>
                          <th className="p-3">Latest Logout Event</th>
                          <th className="p-3 text-center">Session Status</th>
                          <th className="p-3 text-right w-24">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {uniqueLogs.map((log) => {
                          const isOnline = !log.logout_time
                          return (
                            <tr 
                              key={log.id} 
                              className="border-b border-primary/5 hover:bg-background-secondary/30 transition-colors"
                            >
                              <td className="p-3 font-mono text-[10px] text-muted">
                                #{log.user_id}
                              </td>
                              <td className="p-3 font-bold text-primary">
                                {log.name}
                              </td>
                              <td className="p-3 text-muted">
                                {log.email}
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                  log.role === 'admin' 
                                    ? 'bg-blue-500/10 border border-blue-500/25 text-blue-400' 
                                    : 'bg-background-secondary text-muted border border-primary/10'
                                }`}>
                                  {log.role}
                                </span>
                              </td>
                              <td className="p-3 text-muted">
                                {dayjs(log.login_time).format('YYYY-MM-DD HH:mm:ss')}
                              </td>
                              <td className="p-3 text-muted font-mono">
                                {log.logout_time 
                                  ? dayjs(log.logout_time).format('YYYY-MM-DD HH:mm:ss')
                                  : '-'
                                }
                              </td>
                              <td className="p-3 text-center">
                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                  isOnline
                                    ? 'bg-green-500/10 text-green-500 border border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.05)]'
                                    : 'bg-background-secondary/50 text-muted border border-primary/10'
                                }`}>
                                  {isOnline && <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />}
                                  {isOnline ? 'Online' : 'Offline'}
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => handleDeleteUser(log.user_id)}
                                  className="p-1 rounded-lg border border-destructive/20 hover:border-destructive/45 bg-destructive/5 text-destructive hover:bg-destructive/15 hover:text-red-400 cursor-pointer"
                                  title="Delete Operator Account"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* Tab 2: Operator Directory */}
            {activeTab === 'users' && (
              <div className="space-y-4">
                {/* User Controls */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-primary uppercase tracking-wider">Registered Operators List</span>
                    <button 
                      onClick={handleRefresh}
                      disabled={isUsersLoading}
                      className="p-1.5 rounded-lg border border-primary/10 bg-background-secondary/30 text-muted hover:text-primary hover:border-primary/25 transition-all cursor-pointer"
                      title="Reload Operators"
                    >
                      <RefreshCw className={`h-3 w-3 ${isUsersLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  {/* Search Bar */}
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center text-muted">
                      <Search className="h-3.5 w-3.5" />
                    </span>
                    <input
                      type="text"
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      placeholder="Search operator..."
                      className="w-full sm:w-60 h-8 pl-9 pr-4 rounded-lg border border-primary/15 bg-background text-xs text-secondary placeholder:text-muted focus:border-blue-500/50 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Table Area */}
                <div className="overflow-x-auto rounded-xl border border-primary/10 bg-background-secondary/10">
                  {isUsersLoading ? (
                    <div className="flex flex-col items-center justify-center p-12 space-y-3">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                      <div className="text-[10px] text-muted uppercase tracking-widest">Fetching operator data...</div>
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="p-12 text-center text-xs text-muted uppercase tracking-wider">
                      No operators found.
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-primary/10 bg-background-secondary/60 text-muted font-bold uppercase tracking-wider text-[10px]">
                          <th className="p-3 w-16">ID</th>
                          <th className="p-3">Operator Name</th>
                          <th className="p-3">Email Signature</th>
                          <th className="p-3 w-32">Authority</th>
                          <th className="p-3 w-28 text-center">Status</th>
                          <th className="p-3 w-28 text-center">Login Freq</th>
                          <th className="p-3 w-40">Last Active</th>
                          <th className="p-3 text-right w-24">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((u) => {
                          const isEditing = editingUserId === u.id
                          return (
                            <tr 
                              key={u.id} 
                              className="border-b border-primary/5 hover:bg-background-secondary/30 transition-colors"
                            >
                              <td className="p-3 font-mono text-[10px] text-muted">
                                #{u.id}
                              </td>
                              
                              <td className="p-3 font-bold text-primary">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="h-8 px-2 w-full rounded border border-primary/15 bg-background text-xs text-secondary focus:outline-none focus:border-blue-500"
                                  />
                                ) : (
                                  u.name
                                )}
                              </td>

                              <td className="p-3 text-secondary">
                                {isEditing ? (
                                  <input
                                    type="email"
                                    value={editEmail}
                                    onChange={(e) => setEditEmail(e.target.value)}
                                    className="h-8 px-2 w-full rounded border border-primary/15 bg-background text-xs text-secondary focus:outline-none focus:border-blue-500"
                                  />
                                ) : (
                                  u.email
                                )}
                              </td>

                              <td className="p-3">
                                {isEditing ? (
                                  <select
                                    value={editRole}
                                    onChange={(e) => setEditRole(e.target.value)}
                                    className="h-8 px-2 w-full rounded border border-primary/15 bg-background text-xs text-secondary focus:outline-none focus:border-blue-500"
                                  >
                                    <option value="user">user (Standard)</option>
                                    <option value="admin">admin (Full Access)</option>
                                  </select>
                                ) : (
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                    u.role === 'admin' 
                                      ? 'bg-blue-500/10 border border-blue-500/25 text-blue-400' 
                                      : 'bg-background-secondary text-muted border border-primary/10'
                                  }`}>
                                    {u.role}
                                  </span>
                                )}
                              </td>

                              <td className="p-3 text-center">
                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                  u.is_online
                                    ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                                    : 'bg-background-secondary/50 text-muted border border-primary/10'
                                }`}>
                                  {u.is_online ? 'Online' : 'Offline'}
                                </span>
                              </td>

                              <td className="p-3 text-center font-bold text-primary font-mono">
                                {u.login_count ?? 0} {u.login_count === 1 ? 'login' : 'logins'}
                              </td>

                              <td className="p-3 text-muted font-mono">
                                {u.last_login 
                                  ? dayjs(u.last_login).format('YYYY-MM-DD HH:mm:ss')
                                  : 'Never'
                                }
                              </td>

                              <td className="p-3 text-right">
                                {isEditing ? (
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => handleSaveUser(u.id)}
                                      className="p-1 rounded-lg border border-green-500/30 hover:border-green-500/60 bg-green-500/5 text-green-500 hover:bg-green-500/10 cursor-pointer"
                                      title="Save Modifications"
                                    >
                                      <Check className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={cancelEditing}
                                      className="p-1 rounded-lg border border-primary/10 hover:border-primary/20 bg-background-secondary/30 text-muted hover:text-primary cursor-pointer"
                                      title="Cancel"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => startEditing(u)}
                                      className="p-1 rounded-lg border border-primary/10 hover:border-primary/20 bg-background-secondary/30 text-muted hover:text-primary cursor-pointer"
                                      title="Modify User"
                                    >
                                      <Edit2 className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteUser(u.id)}
                                      className="p-1 rounded-lg border border-destructive/20 hover:border-destructive/45 bg-destructive/5 text-destructive hover:bg-destructive/15 hover:text-red-400 cursor-pointer"
                                      title="Delete Operator Account"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* Tab 3: System Visual Insights */}
            {activeTab === 'insights' && (
              <div className="space-y-6 pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">Access Analytics & Trends</span>
                  <button 
                    onClick={handleRefresh}
                    className="p-1.5 rounded-lg border border-primary/10 bg-background-secondary/30 text-muted hover:text-primary hover:border-primary/25 transition-all cursor-pointer"
                    title="Reload Analytics"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Card 1: Access Activity trend (Daily/Weekly/Monthly Stacked Bar Chart) */}
                  <div className="border border-primary/10 bg-background-secondary/20 p-5 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between border-b border-primary/10 pb-2">
                      <div className="flex items-center gap-2">
                        <BarChart2 className="h-4 w-4 text-blue-500" />
                        <span className="text-[11px] font-bold text-primary uppercase tracking-wider">Access Load (Stacked)</span>
                      </div>
                      
                      {/* Filter Toggles */}
                      <div className="flex rounded bg-background p-0.5 overflow-hidden border border-primary/10 scale-90">
                        {['daily', 'weekly', 'monthly'].map((filter) => (
                          <button
                            key={filter}
                            onClick={() => setChartFilter(filter as any)}
                            className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                              chartFilter === filter
                                ? 'bg-blue-600 text-white'
                                : 'text-muted hover:text-primary'
                            }`}
                          >
                            {filter}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="h-44 flex items-end justify-between px-2 pt-4 border-b border-primary/10 font-mono text-[8px] text-muted overflow-x-auto gap-1">
                      {chartData.map((data, idx) => {
                        const totalVal = data.registeredCount + data.loggedInCount
                        const targetHeight = totalVal > 0 ? (totalVal / maxChartValue) * 100 : 4
                        const heightPct = animateCharts ? targetHeight : 0
                        
                        // Calculate percentage of stacked segments
                        const registeredPct = totalVal > 0 ? (data.registeredCount / totalVal) * 100 : 0
                        const loggedInPct = totalVal > 0 ? (data.loggedInCount / totalVal) * 100 : 0

                        return (
                          <div 
                            key={`${data.label}-${idx}`} 
                            className="flex flex-col items-center gap-1.5 flex-1 min-w-[20px] group relative cursor-pointer"
                            onClick={() => setSelectedBarDetails({
                              label: data.label,
                              registeredUsers: data.registeredUsers,
                              loggedInLogs: data.loggedInLogs
                            })}
                          >
                            {/* Tooltip */}
                            <div className="absolute -top-16 opacity-0 scale-95 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0 bg-background/95 backdrop-blur-md text-secondary font-mono text-[8px] p-2 rounded-lg border border-primary/20 shadow-xl transition-all duration-250 ease-out whitespace-nowrap z-20">
                              <div className="font-bold text-primary uppercase tracking-wider mb-1 border-b border-primary/10 pb-0.5">
                                {data.label} Summary
                              </div>
                              <div>Total Activity: <span className="font-bold text-primary">{totalVal}</span></div>
                              <div className="text-blue-400">Logged In: <span className="font-bold">{data.loggedInCount}</span></div>
                              <div className="text-muted">Registered: <span className="font-bold text-secondary">{data.registeredCount}</span></div>
                              <div className="text-[7px] text-muted italic mt-1 uppercase tracking-wider">Click for details</div>
                            </div>
                            
                            {/* Stacked Glowing Bar */}
                            <div 
                              className="w-full rounded-t-sm flex flex-col justify-end overflow-hidden border border-primary/10 shadow-[0_0_15px_rgba(59,130,246,0.05)] group-hover:shadow-[0_0_20px_rgba(59,130,246,0.25)] transition-all duration-700 ease-out hover:scale-x-105 hover:-translate-y-1 transform origin-bottom hover:brightness-110"
                              style={{ height: `${heightPct}%` }}
                            >
                              {/* Registered users (zinc/gray top section) */}
                              {data.registeredCount > 0 && (
                                <div 
                                  className="bg-zinc-400 dark:bg-zinc-650 w-full transition-all duration-500"
                                  style={{ height: `${registeredPct}%` }} 
                                />
                              )}
                              {/* Logged in users (blue bottom section) */}
                              {data.loggedInCount > 0 && (
                                <div 
                                  className="bg-blue-600 w-full transition-all duration-500"
                                  style={{ height: `${loggedInPct}%` }} 
                                />
                              )}
                            </div>
                            <span className="text-[8px] uppercase tracking-wider">{data.label}</span>
                          </div>
                        )
                      })}
                    </div>
                    {/* Legend */}
                    <div className="flex items-center justify-center gap-4 text-[9px] pt-1">
                      <div className="flex items-center gap-1.5 text-blue-400 font-bold uppercase tracking-wider">
                        <span className="h-2 w-2 rounded bg-blue-600" />
                        Logged In Users
                      </div>
                      <div className="flex items-center gap-1.5 text-muted font-bold uppercase tracking-wider">
                        <span className="h-2 w-2 rounded bg-zinc-400 dark:bg-zinc-650" />
                        Registered Users
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Authority Distribution (Donut) */}
                  <div className="border border-primary/10 bg-background-secondary/20 p-5 rounded-2xl space-y-4 flex flex-col justify-between">
                    <div className="flex items-center gap-2 border-b border-primary/10 pb-2">
                      <PieChart className="h-4 w-4 text-blue-500" />
                      <span className="text-[11px] font-bold text-primary uppercase tracking-wider">Operator Roles Share</span>
                    </div>

                    <div className="flex items-center justify-around py-2">
                      <div className="relative h-28 w-28 flex items-center justify-center group/donut">
                        {/* Donut Tooltip */}
                        <div className="absolute -top-12 opacity-0 scale-95 translate-y-1 pointer-events-none group-hover/donut:opacity-100 group-hover/donut:scale-100 group-hover/donut:translate-y-0 bg-background/95 backdrop-blur-md text-secondary font-mono text-[8px] p-2 rounded-lg border border-primary/20 shadow-xl transition-all duration-200 ease-out whitespace-nowrap z-20">
                          <div>Admin: <span className="text-blue-400 font-bold">{adminCount} ({adminPercentage}%)</span></div>
                          <div>User: <span className="text-muted font-bold">{standardCount} ({standardPercentage}%)</span></div>
                        </div>

                        <svg className="h-full w-full -rotate-90 transition-transform duration-300 group-hover/donut:scale-105" viewBox="0 0 120 120">
                          <circle
                            cx="60"
                            cy="60"
                            r={radius}
                            className="stroke-primary/10"
                            strokeWidth="10"
                            fill="transparent"
                          />
                          <circle
                            cx="60"
                            cy="60"
                            r={radius}
                            className="stroke-blue-500"
                            strokeWidth="10"
                            fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={animateCharts ? strokeDashoffset : circumference}
                            strokeLinecap="round"
                            style={{
                              transition: 'stroke-dashoffset 1s ease-out',
                              filter: 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.4))'
                            }}
                          />
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center font-mono pointer-events-none">
                          <span className="text-sm font-bold text-primary leading-none">{adminPercentage}%</span>
                          <span className="text-[8px] text-muted uppercase tracking-widest mt-1">Admin</span>
                        </div>
                      </div>

                      <div className="space-y-2.5 font-mono text-[9px] text-muted">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded bg-blue-500" />
                          <div>
                            <div className="text-primary font-bold uppercase">{adminPercentage}% Admin</div>
                            <div className="text-[8px] uppercase tracking-wider">{adminCount} Operators</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded bg-zinc-400 dark:bg-zinc-650" />
                          <div>
                            <div className="text-primary font-bold uppercase">{standardPercentage}% Users</div>
                            <div className="text-[8px] uppercase tracking-wider">{standardCount} Operators</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-[9px] text-muted uppercase text-center tracking-widest pt-1">
                      Account authority classification ratio
                    </div>
                  </div>

                  {/* Card 3: Session Occupancy Gauge */}
                  <div className="border border-primary/10 bg-background-secondary/20 p-5 rounded-2xl space-y-4 flex flex-col justify-between">
                    <div className="flex items-center gap-2 border-b border-primary/10 pb-2">
                      <Activity className="h-4 w-4 text-blue-500" />
                      <span className="text-[11px] font-bold text-primary uppercase tracking-wider">Session Occupancy</span>
                    </div>

                    <div className="flex flex-col items-center justify-center space-y-3 py-2">
                      <div className="relative h-24 w-44 flex items-center justify-center overflow-hidden group/gauge">
                        {/* Gauge Tooltip */}
                        <div className="absolute top-4 opacity-0 scale-95 translate-y-1 pointer-events-none group-hover/gauge:opacity-100 group-hover/gauge:scale-100 group-hover/gauge:translate-y-0 bg-background/95 backdrop-blur-md text-secondary font-mono text-[8px] p-2 rounded-lg border border-primary/20 shadow-xl transition-all duration-200 ease-out whitespace-nowrap z-20">
                          <div>Active: <span className="text-green-500 font-bold">{activeSessions}</span></div>
                          <div>Total Users: <span className="text-primary font-bold">{users.length}</span></div>
                        </div>

                        <svg className="absolute top-0 h-44 w-44 -rotate-180 transition-transform duration-300 group-hover/gauge:scale-105" viewBox="0 0 120 120">
                          <circle
                            cx="60"
                            cy="60"
                            r={45}
                            className="stroke-primary/10"
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray={2 * Math.PI * 45}
                            strokeDashoffset={Math.PI * 45}
                          />
                          <circle
                            cx="60"
                            cy="60"
                            r={45}
                            className="stroke-green-500"
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray={2 * Math.PI * 45}
                            strokeDashoffset={animateCharts ? (2 * Math.PI * 45 - (occupancyPercentage / 100) * (Math.PI * 45)) : (2 * Math.PI * 45)}
                            strokeLinecap="round"
                            style={{
                              transition: 'stroke-dashoffset 1s ease-out',
                              filter: 'drop-shadow(0 0 5px rgba(34, 197, 94, 0.4))'
                            }}
                          />
                        </svg>
                        <div className="absolute bottom-2 flex flex-col items-center font-mono pointer-events-none">
                          <span className="text-base font-bold text-primary leading-none">{occupancyPercentage}%</span>
                          <span className="text-[8px] text-muted uppercase tracking-widest mt-1">Occupied</span>
                        </div>
                      </div>

                      <div className="text-[10px] text-secondary font-semibold uppercase tracking-wider flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        {activeSessions} of {users.length} Operators Connected
                      </div>
                    </div>

                    <div className="text-[9px] text-muted uppercase text-center tracking-widest pt-1">
                      Active connections vs registry capacity
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* Total entries count banner */}
            <div className="flex justify-between items-center text-[10px] text-muted uppercase tracking-widest pt-2">
              {activeTab === 'logs' ? (
                <span>Showing {uniqueLogs.length} of {uniqueLoggedInCount} unique logged-in users</span>
              ) : activeTab === 'users' ? (
                <span>Showing {filteredUsers.length} of {users.length} operators</span>
              ) : (
                <span>System Status: Operational</span>
              )}
              <span>System Clock: {dayjs().format('HH:mm:ss z')}</span>
            </div>

          </div>

        </div>
      </div>

      {/* Premium Glassmorphic Detail Dialog */}
      <AnimatePresence>
        {selectedBarDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="bg-background/95 border border-primary/20 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl backdrop-blur-md font-dmmono"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-primary/15 p-4.5 bg-background-secondary/90">
                <div className="flex items-center gap-2">
                  <Activity className="h-4.5 w-4.5 text-blue-500" />
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-primary">
                      Activity Breakdown
                    </h3>
                    <p className="text-[10px] text-muted uppercase tracking-widest font-mono">
                      {getTimeframeString(selectedBarDetails.label)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedBarDetails(null)}
                  className="p-1.5 rounded-lg border border-primary/10 bg-background-secondary/35 text-muted hover:text-primary hover:border-primary/20 transition-all cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
                {/* Logged In Users */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-primary/15 pb-1.5">
                    <span className="font-bold text-primary uppercase tracking-wider text-[10px]">
                      Logged In Users ({selectedBarDetails.loggedInLogs.length})
                    </span>
                    <span className="text-[9px] text-muted uppercase tracking-wider">Access Event Log</span>
                  </div>
                  {selectedBarDetails.loggedInLogs.length === 0 ? (
                    <p className="text-muted italic text-[11px] py-1">No user logins recorded in this timeframe.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-primary/10 bg-background-secondary/10">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-primary/10 bg-background-secondary/50 text-muted font-bold uppercase tracking-wider text-[9px]">
                            <th className="p-2.5">User</th>
                            <th className="p-2.5">Role</th>
                            <th className="p-2.5">Login Time</th>
                            <th className="p-2.5">Logout Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedBarDetails.loggedInLogs.map((log, idx) => (
                            <tr key={idx} className="border-b border-primary/5 hover:bg-background-secondary/30">
                              <td className="p-2.5">
                                <div className="font-bold text-primary">{log.name}</div>
                                <div className="text-[10px] text-muted font-mono">{log.email}</div>
                              </td>
                              <td className="p-2.5">
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                                  log.role === 'admin' 
                                    ? 'bg-blue-500/10 border border-blue-500/25 text-blue-400' 
                                    : 'bg-background-secondary text-muted border border-primary/10'
                                }`}>
                                  {log.role}
                                </span>
                              </td>
                              <td className="p-2.5 text-muted font-mono">
                                {dayjs(log.login_time).format('YYYY-MM-DD HH:mm:ss')}
                              </td>
                              <td className="p-2.5 text-muted font-mono">
                                {log.logout_time ? dayjs(log.logout_time).format('YYYY-MM-DD HH:mm:ss') : <span className="text-green-500 font-bold animate-pulse">Active Now</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Registered Users */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-primary/15 pb-1.5">
                    <span className="font-bold text-primary uppercase tracking-wider text-[10px]">
                      Registered Users ({selectedBarDetails.registeredUsers.length})
                    </span>
                    <span className="text-[9px] text-muted uppercase tracking-wider">New Registrations</span>
                  </div>
                  {selectedBarDetails.registeredUsers.length === 0 ? (
                    <p className="text-muted italic text-[11px] py-1">No user registrations recorded in this timeframe.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-primary/10 bg-background-secondary/10">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-primary/10 bg-background-secondary/50 text-muted font-bold uppercase tracking-wider text-[9px]">
                            <th className="p-2.5">User</th>
                            <th className="p-2.5">Role</th>
                            <th className="p-2.5">Registered At</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedBarDetails.registeredUsers.map((u, idx) => (
                            <tr key={idx} className="border-b border-primary/5 hover:bg-background-secondary/30">
                              <td className="p-2.5">
                                <div className="font-bold text-primary">{u.name}</div>
                                <div className="text-[10px] text-muted font-mono">{u.email}</div>
                              </td>
                              <td className="p-2.5">
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                                  u.role === 'admin' 
                                    ? 'bg-blue-500/10 border border-blue-500/25 text-blue-400' 
                                    : 'bg-background-secondary text-muted border border-primary/10'
                                }`}>
                                  {u.role}
                                </span>
                              </td>
                              <td className="p-2.5 text-muted font-mono">
                                {u.created_at ? dayjs(u.created_at).format('YYYY-MM-DD HH:mm:ss') : 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-primary/15 p-4 bg-background-secondary/90 flex justify-end">
                <button
                  onClick={() => setSelectedBarDetails(null)}
                  className="px-4 py-2 bg-background-secondary border border-primary/15 hover:bg-background text-primary rounded-xl text-xs uppercase font-bold transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


    </AuthGuard>
  )
}
