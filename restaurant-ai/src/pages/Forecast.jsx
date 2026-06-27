import { useEffect, useState } from 'react'
import { getForecast, getForecastChart, getReorderRecs } from '../api'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine
} from 'recharts'
import {
  Brain, TrendingUp, TrendingDown, Package,
  CheckCircle, RefreshCw, Zap
} from 'lucide-react'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-3 text-xs space-y-1">
      <p className="text-gray-300 font-semibold">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{p.value} units</span>
        </p>
      ))}
    </div>
  )
}

function UrgencyBadge({ urgency }) {
  const map = {
    critical: 'text-red-400 bg-red-500/10 border-red-500/20',
    high:     'text-orange-400 bg-orange-500/10 border-orange-500/20',
    low:      'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    none:     'text-green-400 bg-green-500/10 border-green-500/20',
  }
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border capitalize ${map[urgency]}`}>
      {urgency === 'none' ? 'Sufficient' : urgency}
    </span>
  )
}

function ConfidenceBar({ value }) {
  const color = value >= 90 ? 'bg-green-500' : value >= 80 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 bg-gray-800 rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full`} style={{ width: `${value}%` }}/>
      </div>
      <span className="text-xs text-gray-400">{value}%</span>
    </div>
  )
}

export default function Forecast() {
  const [forecast, setForecast]   = useState([])
  const [chartData, setChartData] = useState([])
  const [reorder, setReorder]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [running, setRunning]     = useState(false)
  const [ran, setRan]             = useState(false)

  function loadAll() {
    return Promise.all([
      getForecast(),
      getForecastChart(),
      getReorderRecs(),
    ]).then(([f, c, r]) => {
      setForecast(f.data)
      setChartData(c.data)
      setReorder(r.data)
    })
  }

  useEffect(() => {
    loadAll().catch(console.error).finally(() => setLoading(false))
  }, [])

  async function runForecast() {
    setRunning(true)
    await loadAll().catch(console.error)
    setTimeout(() => { setRunning(false); setRan(true) }, 1500)
  }

  const totalReorderCost = reorder.reduce((a, r) => a + r.cost, 0)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-400">Loading forecast...</p>
    </div>
  )

  // Top 3 dishes for bar chart
  const top3    = forecast.slice(0, 3)
  const today   = new Date()
  const barData = Array.from({ length: 7 }, (_, i) => {
    const d       = new Date(today)
    d.setDate(d.getDate() + i)
    const day     = d.toLocaleDateString('en', { weekday: 'short' })
    const isWknd  = d.getDay() === 0 || d.getDay() === 6
    const obj     = { day }
    top3.forEach(dish => {
      obj[dish.dish.split(' ')[0]] = Math.round(dish.avg_daily * (isWknd ? 1.35 : 1.0))
    })
    return obj
  })

  const barKeys = top3.map(d => d.dish.split(' ')[0])
  const BAR_COLORS = ['#f97316', '#3b82f6', '#22c55e']

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Brain size={24} className="text-orange-400"/> AI Demand Forecast
          </h1>
          <p className="text-gray-400 text-sm mt-1">Predictions based on your real sales history</p>
        </div>
        <button onClick={runForecast} disabled={running}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition">
          {running
            ? <><RefreshCw size={15} className="animate-spin"/> Refreshing...</>
            : <><Zap size={15}/> Refresh Forecast</>}
        </button>
      </div>

      {/* Model info */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Model',           value: 'Statistical + Weighted Avg', color: 'text-orange-400' },
          { label: 'Data Points',     value: `${forecast.reduce((a,f) => a + Math.round(f.avg_daily * 30), 0).toLocaleString()} sales`, color: 'text-green-400' },
          { label: 'Forecast Window', value: '7 Days',                      color: 'text-blue-400'   },
          { label: 'Data Source',     value: 'Live PostgreSQL DB',           color: 'text-purple-400' },
        ].map(c => (
          <div key={c.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <p className="text-gray-400 text-xs">{c.label}</p>
            <p className={`text-sm font-bold mt-1 ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Actual vs Forecast line chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white font-semibold">Order Volume — Actual vs Forecast</p>
            <p className="text-gray-400 text-xs mt-0.5">Past 7 days actual · Next 7 days predicted</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-orange-400 inline-block rounded"/>Actual</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-400 inline-block rounded"/>Forecast</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937"/>
            <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false}/>
            <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false}/>
            <Tooltip content={<CustomTooltip/>}/>
            <ReferenceLine x="Sun" stroke="#374151" strokeDasharray="4 4"
              label={{ value: 'Today', fill: '#6b7280', fontSize: 10 }}/>
            <Line type="monotone" dataKey="actual"   name="Actual"   stroke="#f97316" strokeWidth={2} dot={{ fill: '#f97316', r: 4 }} connectNulls={false}/>
            <Line type="monotone" dataKey="forecast" name="Forecast" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" dot={{ fill: '#3b82f6', r: 4 }} connectNulls={false}/>
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top 3 dish forecast bars */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <p className="text-white font-semibold mb-1">Top 3 Dish Forecast — Next 7 Days</p>
        <p className="text-gray-400 text-xs mb-4">Predicted daily units based on historical averages</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937"/>
            <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false}/>
            <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false}/>
            <Tooltip content={<CustomTooltip/>}/>
            <Legend formatter={v => <span className="text-gray-400 text-xs">{v}</span>}/>
            {barKeys.map((key, i) => (
              <Bar key={key} dataKey={key} fill={BAR_COLORS[i]} radius={[3,3,0,0]}/>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Per dish forecast table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <div>
            <p className="text-white font-semibold">Per-Dish Demand Prediction</p>
            <p className="text-gray-400 text-xs mt-0.5">Based on your actual sales history</p>
          </div>
          {ran && (
            <span className="flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-lg">
              <CheckCircle size={12}/> Updated
            </span>
          )}
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 text-xs border-b border-gray-800">
              {['Dish','Avg Daily','Today','Tomorrow','This Week','Confidence','Trend'].map(h => (
                <th key={h} className="text-left px-5 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {forecast.map(row => (
              <tr key={row.dish} className="hover:bg-gray-800/50 transition">
                <td className="px-5 py-3 text-white font-medium">{row.dish}</td>
                <td className="px-5 py-3 text-gray-400">{row.avg_daily} units</td>
                <td className="px-5 py-3 text-gray-300">{row.today} units</td>
                <td className="px-5 py-3 text-white font-semibold">{row.tomorrow} units</td>
                <td className="px-5 py-3 text-gray-300">{row.week} units</td>
                <td className="px-5 py-3"><ConfidenceBar value={row.confidence}/></td>
                <td className="px-5 py-3">
                  <span className={`flex items-center gap-1 text-xs font-semibold ${row.trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {row.trend >= 0
                      ? <TrendingUp size={13}/>
                      : <TrendingDown size={13}/>}
                    {row.trend >= 0 ? '+' : ''}{row.trend}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Smart Reorder */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <div>
            <p className="text-white font-semibold flex items-center gap-2">
              <Package size={16} className="text-orange-400"/> Smart Reorder Recommendations
            </p>
            <p className="text-gray-400 text-xs mt-0.5">Based on predicted demand vs current stock</p>
          </div>
          <div className="text-right">
            <p className="text-gray-400 text-xs">Estimated reorder cost</p>
            <p className="text-orange-400 font-bold text-lg">₹{totalReorderCost.toLocaleString()}</p>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 text-xs border-b border-gray-800">
              {['Ingredient','Current Stock','Stock Needed','Reorder Qty','Est. Cost','Urgency'].map(h => (
                <th key={h} className="text-left px-5 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {reorder.map(row => (
              <tr key={row.ingredient} className="hover:bg-gray-800/50 transition">
                <td className="px-5 py-3 text-white font-medium">{row.ingredient}</td>
                <td className="px-5 py-3 text-gray-400">{row.current}</td>
                <td className="px-5 py-3 text-gray-300">{row.needed}</td>
                <td className="px-5 py-3">
                  <span className={`font-semibold ${row.urgency === 'none' ? 'text-gray-500' : 'text-white'}`}>
                    {row.reorder}
                  </span>
                </td>
                <td className="px-5 py-3">
                  {row.cost > 0
                    ? <span className="text-orange-400 font-semibold">₹{row.cost.toLocaleString()}</span>
                    : <span className="text-gray-600">—</span>}
                </td>
                <td className="px-5 py-3"><UrgencyBadge urgency={row.urgency}/></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* How it works */}
      <div className="bg-gradient-to-r from-orange-500/10 to-blue-500/10 border border-orange-500/20 rounded-2xl p-5">
        <p className="text-white font-semibold mb-3 flex items-center gap-2">
          <Brain size={16} className="text-orange-400"/> How This Works
        </p>
        <div className="grid grid-cols-3 gap-4 text-sm text-gray-300">
          <div className="space-y-1">
            <p className="text-orange-400 font-semibold text-xs uppercase tracking-wide">Input Data</p>
            <p>• Last 30 days real sales</p>
            <p>• Per-dish daily averages</p>
            <p>• Weekend vs weekday patterns</p>
            <p>• Live inventory levels</p>
          </div>
          <div className="space-y-1">
            <p className="text-blue-400 font-semibold text-xs uppercase tracking-wide">Forecast Logic</p>
            <p>• Weighted daily averages</p>
            <p>• Weekend boost factor (1.35×)</p>
            <p>• 7-day rolling window</p>
            <p>• Recipe-based stock deduction</p>
          </div>
          <div className="space-y-1">
            <p className="text-green-400 font-semibold text-xs uppercase tracking-wide">Output</p>
            <p>• Per-dish daily demand</p>
            <p>• Confidence scores</p>
            <p>• Auto reorder triggers</p>
            <p>• Cost estimates</p>
          </div>
        </div>
      </div>
    </div>
  )
}