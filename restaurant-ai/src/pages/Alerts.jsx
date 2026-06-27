import { useEffect, useState } from 'react'
import { getAlerts } from '../api'
import {
  Bell, AlertTriangle, XCircle, Clock,
  Package, ThermometerSun, TrendingDown,
  CheckCheck, Trash2, Filter
} from 'lucide-react'

const TYPE_STYLES = {
  critical: { bg: 'bg-red-500/10',    border: 'border-red-500/30',    text: 'text-red-400',    dot: 'bg-red-500',    badge: 'Critical' },
  high:     { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', dot: 'bg-orange-500', badge: 'High'     },
  medium:   { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', dot: 'bg-yellow-500', badge: 'Medium'   },
  low:      { bg: 'bg-blue-500/10',   border: 'border-blue-500/30',   text: 'text-blue-400',   dot: 'bg-blue-400',   badge: 'Low'      },
}

function getIcon(category) {
  if (category === 'stock')  return Package
  if (category === 'expiry') return ThermometerSun
  return TrendingDown
}

export default function Alerts() {
  const [alerts, setAlerts]   = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('all')
  const [catFilter, setCat]   = useState('all')

  useEffect(() => {
    getAlerts()
      .then(res => setAlerts(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  function markRead(id) {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a))
  }

  function dismiss(id) {
    setAlerts(prev => prev.filter(a => a.id !== id))
  }

  function markAllRead() {
    setAlerts(prev => prev.map(a => ({ ...a, read: true })))
  }

  function clearRead() {
    setAlerts(prev => prev.filter(a => !a.read))
  }

  const filtered = alerts.filter(a => {
    const matchType = filter === 'all' || a.type === filter || (filter === 'unread' && !a.read)
    const matchCat  = catFilter === 'all' || a.category === catFilter
    return matchType && matchCat
  })

  const unreadCount   = alerts.filter(a => !a.read).length
  const criticalCount = alerts.filter(a => a.type === 'critical').length
  const expiryCount   = alerts.filter(a => a.category === 'expiry').length
  const stockCount    = alerts.filter(a => a.category === 'stock').length

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-400">Loading alerts...</p>
    </div>
  )

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bell size={22} className="text-orange-400"/> Alerts Center
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {unreadCount} unread · {criticalCount} critical
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={markAllRead}
            className="flex items-center gap-2 bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-300 text-sm px-4 py-2.5 rounded-xl transition">
            <CheckCheck size={15}/> Mark All Read
          </button>
          <button onClick={clearRead}
            className="flex items-center gap-2 bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-300 text-sm px-4 py-2.5 rounded-xl transition">
            <Trash2 size={15}/> Clear Read
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Alerts',  value: alerts.length, color: 'text-white'      },
          { label: 'Critical',      value: criticalCount, color: 'text-red-400'    },
          { label: 'Stock Alerts',  value: stockCount,    color: 'text-orange-400' },
          { label: 'Expiry Alerts', value: expiryCount,   color: 'text-yellow-400' },
        ].map(c => (
          <div key={c.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <p className="text-gray-400 text-xs">{c.label}</p>
            <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex items-center gap-1.5 text-gray-400 text-xs">
          <Filter size={13}/> Filter:
        </div>
        <div className="flex gap-2">
          {['all','unread','critical','high','medium','low'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-xs font-medium px-3 py-2 rounded-xl capitalize transition ${filter === f ? 'bg-orange-500 text-white' : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'}`}>
              {f}
              {f === 'unread' && unreadCount > 0 && (
                <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{unreadCount}</span>
              )}
            </button>
          ))}
        </div>
        <div className="flex gap-2 ml-2">
          {['all','stock','expiry','sales'].map(c => (
            <button key={c} onClick={() => setCat(c)}
              className={`text-xs font-medium px-3 py-2 rounded-xl capitalize transition ${catFilter === c ? 'bg-blue-500 text-white' : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Alert list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            <Bell size={40} className="mx-auto mb-3 opacity-30"/>
            <p>No alerts matching this filter</p>
          </div>
        ) : filtered.map(alert => {
          const s    = TYPE_STYLES[alert.type]
          const Icon = getIcon(alert.category)
          return (
            <div key={alert.id}
              className={`${s.bg} border ${s.border} rounded-2xl p-4 flex items-start gap-4 transition ${!alert.read ? 'opacity-100' : 'opacity-70'}`}>

              {/* Dot */}
              <div className="mt-1.5 shrink-0">
                <div className={`w-2 h-2 rounded-full ${alert.read ? 'bg-gray-600' : s.dot}`}/>
              </div>

              {/* Icon */}
              <div className={`p-2.5 rounded-xl ${s.bg} border ${s.border} shrink-0`}>
                <Icon size={16} className={s.text}/>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className={`text-sm font-semibold ${alert.read ? 'text-gray-300' : 'text-white'}`}>
                    {alert.title}
                  </p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg border ${s.bg} ${s.border} ${s.text}`}>
                    {s.badge}
                  </span>
                  {!alert.read && (
                    <span className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-lg">New</span>
                  )}
                </div>
                <p className="text-gray-400 text-sm">{alert.desc}</p>
                <div className="flex items-center gap-1.5 mt-2 text-gray-500 text-xs">
                  <Clock size={11}/> {alert.time}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 shrink-0">
                {!alert.read && (
                  <button onClick={() => markRead(alert.id)}
                    className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg transition">
                    Mark Read
                  </button>
                )}
                <button onClick={() => dismiss(alert.id)}
                  className="text-gray-500 hover:text-red-400 transition p-1.5">
                  <XCircle size={16}/>
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}