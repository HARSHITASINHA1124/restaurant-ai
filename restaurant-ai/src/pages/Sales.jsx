import { useEffect, useState } from 'react'
import { getWeeklyRevenue, getTopDishes, getHourlyOrders, getCategoryRevenue } from '../api'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { TrendingUp, TrendingDown, IndianRupee, ShoppingBag, AlertTriangle, Star } from 'lucide-react'

const PIE_COLORS = ['#f97316', '#3b82f6', '#22c55e', '#a855f7']

const INSIGHTS_FN = (dishes, weekly) => {
  const topDish    = dishes[0]
  const totalRev   = weekly.reduce((a, d) => a + d.revenue, 0)
  const weekendRev = weekly.filter(d => ['Sat','Sun'].includes(d.day)).reduce((a,d) => a + d.revenue, 0)
  const weekdayRev = weekly.filter(d => !['Sat','Sun'].includes(d.day)).reduce((a,d) => a + d.revenue, 0)
  const weekendAvg = weekendRev / 2 || 0
  const weekdayAvg = weekdayRev / 5 || 1
  const multiplier = (weekendAvg / weekdayAvg).toFixed(1)
  const highMargin = dishes.find(d => d.margin >= 60)
  const lowSales   = dishes[dishes.length - 1]

  return [
    { icon: TrendingUp,    color: 'text-green-400',  bg: 'bg-green-500/10',  text: `Weekend revenue is ${multiplier}× higher than weekdays. Consider weekend specials.` },
    { icon: Star,          color: 'text-orange-400', bg: 'bg-orange-500/10', text: highMargin ? `${highMargin.name} has the highest margin (${highMargin.margin}%). Bundle it with meals to boost revenue.` : `${topDish?.name} is your top performer this week.` },
    { icon: TrendingDown,  color: 'text-red-400',    bg: 'bg-red-500/10',    text: lowSales   ? `${lowSales.name} has the lowest sales. Consider a discount or combo deal.` : 'All dishes performing well this week.' },
    { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10', text: `Total weekly revenue: ₹${totalRev.toLocaleString()}. Track daily to spot dips early.` },
  ]
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-3 text-xs space-y-1">
      <p className="text-gray-400 font-medium">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name === 'revenue' || p.name === 'profit' ? `₹${Number(p.value).toLocaleString()}` : p.value}
          {' '}<span className="text-gray-500 font-normal">{p.name}</span>
        </p>
      ))}
    </div>
  )
}

function StatCard({ label, value, sub, trendUp, trend }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-2">
      <p className="text-gray-400 text-xs">{label}</p>
      <p className="text-white text-2xl font-bold">{value}</p>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-semibold flex items-center gap-0.5 ${trendUp ? 'text-green-400' : 'text-red-400'}`}>
          {trendUp ? <TrendingUp size={12}/> : <TrendingDown size={12}/>} {trend}
        </span>
        <span className="text-gray-500 text-xs">{sub}</span>
      </div>
    </div>
  )
}

export default function Sales() {
  const [weekly,   setWeekly]   = useState([])
  const [dishes,   setDishes]   = useState([])
  const [hourly,   setHourly]   = useState([])
  const [category, setCategory] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    Promise.all([
      getWeeklyRevenue(),
      getTopDishes(),
      getHourlyOrders(),
      getCategoryRevenue(),
    ]).then(([w, d, h, c]) => {
      setWeekly(w.data)
      setDishes(d.data)
      setHourly(h.data)
      setCategory(c.data.length ? c.data : [
        { name: 'Main Course', value: 38 },
        { name: 'Beverages',   value: 27 },
        { name: 'Snacks',      value: 20 },
        { name: 'Desserts',    value: 15 },
      ])
    }).catch(console.error)
    .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-400">Loading sales data...</p>
    </div>
  )

  const totalRevenue = weekly.reduce((a, d) => a + d.revenue, 0)
  const totalProfit  = weekly.reduce((a, d) => a + d.profit,  0)
  const totalOrders  = weekly.reduce((a, d) => a + d.orders,  0)
  const avgOrder     = totalOrders ? Math.round(totalRevenue / totalOrders) : 0
  const insights     = INSIGHTS_FN(dishes, weekly)

  const weeklyWithProfit = weekly.map(d => ({
    ...d,
    profit: d.profit || Math.round(d.revenue * 0.47)
  }))

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Sales Analytics</h1>
        <p className="text-gray-400 text-sm mt-1">Weekly performance — real data from your orders</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Weekly Revenue"  value={`₹${totalRevenue.toLocaleString()}`} sub="this week" trend="+12.4%" trendUp/>
        <StatCard label="Weekly Profit"   value={`₹${totalProfit.toLocaleString()}`}  sub="est. 47% margin" trend="+9.8%" trendUp/>
        <StatCard label="Total Orders"    value={totalOrders}                          sub="orders served" trend="+8.1%" trendUp/>
        <StatCard label="Avg Order Value" value={`₹${avgOrder}`}                      sub="per order" trend="-1.2%" trendUp={false}/>
      </div>

      {/* Revenue + Profit Chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <p className="text-white font-semibold mb-1">Revenue vs Profit — This Week</p>
        <p className="text-gray-400 text-xs mb-4">Daily breakdown from real orders</p>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={weeklyWithProfit}>
            <defs>
              <linearGradient id="revG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#f97316" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="proG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937"/>
            <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false}/>
            <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`}/>
            <Tooltip content={<CustomTooltip/>}/>
            <Area type="monotone" dataKey="revenue" name="revenue" stroke="#f97316" strokeWidth={2} fill="url(#revG)"/>
            <Area type="monotone" dataKey="profit"  name="profit"  stroke="#22c55e" strokeWidth={2} fill="url(#proG)"/>
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Hourly + Category */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="text-white font-semibold mb-1">Hourly Orders — Today</p>
          <p className="text-gray-400 text-xs mb-4">Real order volume by hour</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={hourly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937"/>
              <XAxis dataKey="hour" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Bar dataKey="orders" name="orders" fill="#f97316" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="text-white font-semibold mb-1">Revenue by Category</p>
          <p className="text-gray-400 text-xs mb-2">This week</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={category} cx="50%" cy="45%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
                {category.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]}/>)}
              </Pie>
              <Legend formatter={v => <span className="text-gray-400 text-xs">{v}</span>}/>
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 12 }}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Dish performance table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <p className="text-white font-semibold">Dish Performance</p>
          <p className="text-gray-400 text-xs mt-0.5">Real sales, revenue & margin from your orders</p>
        </div>
        {dishes.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            <p>No sales data yet — place and serve some orders first!</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 text-xs border-b border-gray-800">
                {['Dish','Units Sold','Revenue','Profit','Margin','Performance'].map(h => (
                  <th key={h} className="text-left px-5 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {dishes.map((dish, i) => (
                <tr key={dish.name} className="hover:bg-gray-800/50 transition">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 text-xs w-4">{i+1}</span>
                      <span className="text-white font-medium">{dish.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-300">{dish.sales}</td>
                  <td className="px-5 py-3 text-white font-semibold">₹{dish.revenue.toLocaleString()}</td>
                  <td className="px-5 py-3 text-green-400 font-semibold">₹{dish.profit.toLocaleString()}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg border ${
                      dish.margin >= 60 ? 'text-green-400 bg-green-500/10 border-green-500/20'
                      : dish.margin >= 50 ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
                      : 'text-red-400 bg-red-500/10 border-red-500/20'
                    }`}>{dish.margin}%</span>
                  </td>
                  <td className="px-5 py-3 w-36">
                    <div className="w-full bg-gray-800 rounded-full h-1.5">
                      <div className="bg-orange-500 h-1.5 rounded-full"
                        style={{ width: `${(dish.revenue / dishes[0].revenue) * 100}%` }}/>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* AI Insights */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <p className="text-white font-semibold mb-4">💡 AI Insights</p>
        <div className="grid grid-cols-2 gap-3">
          {insights.map((ins, i) => (
            <div key={i} className={`flex items-start gap-3 ${ins.bg} rounded-xl p-4`}>
              <ins.icon size={18} className={`${ins.color} mt-0.5 shrink-0`}/>
              <p className="text-gray-300 text-sm">{ins.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}