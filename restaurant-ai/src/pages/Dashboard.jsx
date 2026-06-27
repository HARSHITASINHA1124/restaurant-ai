import { useEffect, useState } from 'react'
import { getDashboardStats, getWeeklyRevenue, getTopDishes, getStockAlerts, getCategoryRevenue } from '../api'
import {
  TrendingUp, ShoppingBag, Package, AlertTriangle,
  ChefHat, ArrowUpRight, ArrowDownRight, IndianRupee
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'

const PIE_COLORS = ['#f97316', '#3b82f6', '#22c55e', '#a855f7']

const FALLBACK_CATEGORY = [
  { name: 'Main Course', value: 38 },
  { name: 'Beverages',   value: 27 },
  { name: 'Snacks',      value: 20 },
  { name: 'Desserts',    value: 15 },
]

function StatCard({ title, value, subtitle, icon: Icon, trend, trendVal, color }) {
  const colors = {
    orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    blue:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
    green:  'bg-green-500/10 text-green-400 border-green-500/20',
    red:    'bg-red-500/10 text-red-400 border-red-500/20',
  }
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-gray-400 text-sm font-medium">{title}</p>
        <div className={`p-2 rounded-xl border ${colors[color]}`}>
          <Icon size={18}/>
        </div>
      </div>
      <div>
        <p className="text-white text-2xl font-bold">{value}</p>
        <p className="text-gray-500 text-xs mt-1">{subtitle}</p>
      </div>
      {trendVal && (
        <div className={`flex items-center gap-1 text-xs font-medium ${trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
          {trend === 'up' ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>}
          {trendVal} vs last week
        </div>
      )}
    </div>
  )
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-3 text-xs">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name === 'revenue' ? `₹${p.value.toLocaleString()}` : `${p.value} orders`}
        </p>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats]           = useState(null)
  const [weekly, setWeekly]         = useState([])
  const [dishes, setDishes]         = useState([])
  const [stockAlerts, setStock]     = useState([])
  const [categoryData, setCategoryData] = useState(FALLBACK_CATEGORY)
  const [loading, setLoading]       = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)

  function loadData() {
    Promise.all([
      getDashboardStats(),
      getWeeklyRevenue(),
      getTopDishes(),
      getStockAlerts(),
      getCategoryRevenue(),
    ]).then(([s, w, d, a, c]) => {
      setStats(s.data)
      setWeekly(w.data)
      setDishes(d.data.slice(0, 5))
      setStock(a.data.filter(a => a.status === 'critical' || a.status === 'low').slice(0, 4))
      if (c.data.length) setCategoryData(c.data)
      setLastUpdated(new Date())
    }).catch(console.error)
    .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 60000) // auto refresh every 60s
    return () => clearInterval(interval)
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-400">Loading dashboard...</p>
    </div>
  )

  const revenueChange = stats?.revenue_change ?? 0

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Good morning, Chef 👋</h1>
          <p className="text-gray-400 text-sm mt-1">Here's what's happening at your restaurant today.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-medium px-4 py-2 rounded-xl">
            <ChefHat size={14}/> Live Dashboard
          </div>
          {lastUpdated && (
            <p className="text-gray-600 text-xs">
              Updated {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Today's Revenue"
          value={`₹${(stats?.today_revenue || 0).toLocaleString()}`}
          subtitle={`${stats?.today_orders || 0} orders completed`}
          icon={IndianRupee} color="orange"
          trend={revenueChange >= 0 ? 'up' : 'down'}
          trendVal={`${revenueChange >= 0 ? '+' : ''}${revenueChange}%`}
        />
        <StatCard
          title="Weekly Orders"
          value={stats?.week_orders || 0}
          subtitle="Served this week"
          icon={ShoppingBag} color="blue"
          trend="up" trendVal="+8.1%"
        />
        <StatCard
          title="Weekly Revenue"
          value={`₹${(stats?.week_revenue || 0).toLocaleString()}`}
          subtitle="This week total"
          icon={TrendingUp} color="green"
          trend={revenueChange >= 0 ? 'up' : 'down'}
          trendVal={`${revenueChange >= 0 ? '+' : ''}${revenueChange}%`}
        />
        <StatCard
          title="Active Orders"
          value={stats?.active_orders || 0}
          subtitle="Pending / Preparing / Ready"
          icon={AlertTriangle} color="red"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-3 gap-4">

        {/* Revenue Area Chart */}
        <div className="col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white font-semibold">Weekly Revenue</p>
              <p className="text-gray-400 text-xs">Revenue & orders this week</p>
            </div>
            <span className={`text-xs px-3 py-1 rounded-lg border ${revenueChange >= 0 ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
              {revenueChange >= 0 ? '↑' : '↓'} {Math.abs(revenueChange)}% this week
            </span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={weekly}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f97316" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937"/>
              <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Area type="monotone" dataKey="revenue" name="revenue" stroke="#f97316" strokeWidth={2} fill="url(#revGrad)"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category Pie — now real data */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="text-white font-semibold mb-1">Sales by Category</p>
          <p className="text-gray-400 text-xs mb-4">This week's distribution</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={categoryData} cx="50%" cy="45%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3}>
                {categoryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}
              </Pie>
              <Legend formatter={v => <span className="text-gray-400 text-xs">{v}</span>}/>
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 12 }}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-2 gap-4">

        {/* Top Dishes */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="text-white font-semibold mb-1">Top Selling Dishes</p>
          <p className="text-gray-400 text-xs mb-4">By revenue this week</p>
          {dishes.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              <p className="text-sm">No sales data yet — place some orders!</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dishes} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false}/>
                <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false}/>
                <YAxis dataKey="name" type="category" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} width={130}/>
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 12 }}/>
                <Bar dataKey="sales" name="Units Sold" fill="#f97316" radius={[0,6,6,0]}/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Stock Alerts */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white font-semibold">Stock Alerts</p>
              <p className="text-gray-400 text-xs">Items needing attention</p>
            </div>
            <span className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-lg">
              {stockAlerts.length} alerts
            </span>
          </div>
          {stockAlerts.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              <Package size={32} className="mx-auto mb-2 opacity-30"/>
              <p className="text-sm">All stock levels are healthy!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stockAlerts.map((alert, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-800 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${alert.status === 'critical' ? 'bg-red-500' : 'bg-yellow-500'}`}/>
                    <div>
                      <p className="text-white text-sm font-medium">{alert.name}</p>
                      <p className="text-gray-400 text-xs">Need {alert.min_stock} {alert.unit}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${alert.status === 'critical' ? 'text-red-400' : 'text-yellow-400'}`}>
                      {alert.current_stock} {alert.unit}
                    </p>
                    <p className={`text-xs ${alert.status === 'critical' ? 'text-red-500/70' : 'text-yellow-500/70'}`}>
                      {alert.status === 'critical' ? 'Critical' : 'Low'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}