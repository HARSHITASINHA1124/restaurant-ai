import { useState, useEffect, useRef } from 'react'
import { Bell, Search, LogOut, UtensilsCrossed, Package, ShoppingCart, X, AlertTriangle, ThermometerSun, TrendingDown, CheckCheck } from 'lucide-react'
import { getMenu, getInventory, getOrders, getAlerts } from '../api'
import { useNavigate } from 'react-router-dom'

export default function Topbar({ user, onLogout }) {
  const [query, setQuery]           = useState('')
  const [results, setResults]       = useState([])
  const [allData, setAllData]       = useState({ menu: [], inventory: [], orders: [] })
  const [showDrop, setShowDrop]     = useState(false)
  const [showBell, setShowBell]     = useState(false)
  const [alerts, setAlerts]         = useState([])
  const [readIds, setReadIds]       = useState(() => {
    try { return JSON.parse(localStorage.getItem('readAlerts') || '[]') } catch { return [] }
  })
  const navigate    = useNavigate()
  const searchRef   = useRef(null)
  const bellRef     = useRef(null)

  // Load searchable data
  useEffect(() => {
    Promise.all([getMenu(), getInventory(), getOrders()])
      .then(([m, i, o]) => setAllData({ menu: m.data, inventory: i.data, orders: o.data }))
      .catch(console.error)
  }, [])

  // Load alerts
  useEffect(() => {
    getAlerts()
      .then(res => setAlerts(res.data))
      .catch(console.error)
  }, [])

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDrop(false)
      }
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setShowBell(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Search logic
  useEffect(() => {
    const q = query.trim().toLowerCase()
    if (!q) { setResults([]); setShowDrop(false); return }

    const menuResults = allData.menu
      .filter(d => d.name.toLowerCase().includes(q) || d.category.toLowerCase().includes(q))
      .slice(0, 3)
      .map(d => ({
        id: `menu-${d.id}`, type: 'Menu', icon: UtensilsCrossed,
        label: d.name, sub: `${d.category} · ₹${d.price}`,
        path: '/menu', color: 'text-orange-400', bg: 'bg-orange-500/10',
      }))

    const invResults = allData.inventory
      .filter(i => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q))
      .slice(0, 3)
      .map(i => ({
        id: `inv-${i.id}`, type: 'Inventory', icon: Package,
        label: i.name, sub: `${i.category} · ${i.current_stock} ${i.unit} in stock`,
        path: '/inventory', color: 'text-blue-400', bg: 'bg-blue-500/10',
      }))

    const orderResults = allData.orders
      .filter(o =>
        String(o.id).includes(q) ||
        o.table_no?.toLowerCase().includes(q) ||
        o.status?.toLowerCase().includes(q)
      )
      .slice(0, 2)
      .map(o => ({
        id: `ord-${o.id}`, type: 'Order', icon: ShoppingCart,
        label: `Order #${o.id} — ${o.table_no}`,
        sub: `${o.status} · ₹${o.total}`,
        path: '/orders', color: 'text-green-400', bg: 'bg-green-500/10',
      }))

    const all = [...menuResults, ...invResults, ...orderResults]
    setResults(all)
    setShowDrop(all.length > 0)
  }, [query, allData])

  function handleSelect(result) {
    navigate(result.path)
    setQuery('')
    setShowDrop(false)
  }

  function clearSearch() {
    setQuery('')
    setResults([])
    setShowDrop(false)
  }

  function markAllRead() {
    const allIds = alerts.map(a => a.id)
    setReadIds(allIds)
    localStorage.setItem('readAlerts', JSON.stringify(allIds))
  }

  function markOneRead(id) {
    const updated = [...new Set([...readIds, id])]
    setReadIds(updated)
    localStorage.setItem('readAlerts', JSON.stringify(updated))
  }

  function getAlertIcon(category) {
    if (category === 'stock')  return AlertTriangle
    if (category === 'expiry') return ThermometerSun
    return TrendingDown
  }

  function getAlertColor(type) {
    if (type === 'critical') return { text: 'text-red-400',    bg: 'bg-red-500/10',    dot: 'bg-red-500'    }
    if (type === 'high')     return { text: 'text-orange-400', bg: 'bg-orange-500/10', dot: 'bg-orange-500' }
    if (type === 'medium')   return { text: 'text-yellow-400', bg: 'bg-yellow-500/10', dot: 'bg-yellow-500' }
    return                          { text: 'text-blue-400',   bg: 'bg-blue-500/10',   dot: 'bg-blue-400'   }
  }

  const unreadCount    = alerts.filter(a => !readIds.includes(a.id)).length
  const criticalAlerts = alerts.filter(a => a.type === 'critical')
  const topAlerts      = alerts.slice(0, 8)

  return (
    <header className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 shrink-0 z-40 relative">

      {/* Search */}
      <div ref={searchRef} className="relative w-80">
        <div className="flex items-center gap-2 bg-gray-800 rounded-xl px-4 py-2 border border-transparent focus-within:border-orange-500/40 transition">
          <Search size={15} className="text-gray-400 shrink-0"/>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setShowDrop(true)}
            placeholder="Search menu, inventory, orders..."
            className="bg-transparent text-sm text-white placeholder-gray-500 outline-none w-full"
          />
          {query && (
            <button onClick={clearSearch}>
              <X size={14} className="text-gray-500 hover:text-gray-300 transition"/>
            </button>
          )}
        </div>

        {/* Search Dropdown */}
        {showDrop && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden z-50">
            {['Menu', 'Inventory', 'Order'].map(type => {
              const group = results.filter(r => r.type === type)
              if (!group.length) return null
              return (
                <div key={type}>
                  <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide px-4 py-2 border-b border-gray-800">
                    {type}
                  </p>
                  {group.map(result => (
                    <button key={result.id} onClick={() => handleSelect(result)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800 transition text-left">
                      <div className={`p-1.5 rounded-lg ${result.bg}`}>
                        <result.icon size={14} className={result.color}/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{result.label}</p>
                        <p className="text-gray-400 text-xs truncate">{result.sub}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )
            })}
            {results.length === 0 && query && (
              <div className="px-4 py-6 text-center text-gray-500 text-sm">
                No results for "{query}"
              </div>
            )}
            <div className="px-4 py-2 border-t border-gray-800">
              <span className="text-gray-600 text-xs">Click a result to navigate</span>
            </div>
          </div>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">

        {/* Bell */}
        <div ref={bellRef} className="relative">
          <button
            onClick={() => setShowBell(p => !p)}
            className="relative p-2 rounded-xl bg-gray-800 hover:bg-gray-700 transition">
            <Bell size={18} className={unreadCount > 0 ? 'text-orange-400' : 'text-gray-400'}/>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Bell Dropdown */}
          {showBell && (
            <div className="absolute top-full right-0 mt-2 w-96 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden z-50">

              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                <div>
                  <p className="text-white font-semibold text-sm">Notifications</p>
                  <p className="text-gray-400 text-xs">{unreadCount} unread · {alerts.length} total</p>
                </div>
                <div className="flex gap-2">
                  {unreadCount > 0 && (
                    <button onClick={markAllRead}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-2.5 py-1.5 rounded-lg transition">
                      <CheckCheck size={12}/> All read
                    </button>
                  )}
                  <button
                    onClick={() => { navigate('/alerts'); setShowBell(false) }}
                    className="text-xs text-orange-400 hover:text-orange-300 bg-orange-500/10 px-2.5 py-1.5 rounded-lg transition">
                    View all
                  </button>
                </div>
              </div>

              {/* Critical banner */}
              {criticalAlerts.length > 0 && (
                <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 flex items-center gap-2">
                  <AlertTriangle size={13} className="text-red-400 shrink-0"/>
                  <p className="text-red-400 text-xs font-medium">
                    {criticalAlerts.length} critical alert{criticalAlerts.length > 1 ? 's' : ''} need immediate attention
                  </p>
                </div>
              )}

              {/* Alert list */}
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-800">
                {topAlerts.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Bell size={28} className="mx-auto mb-2 text-gray-700"/>
                    <p className="text-gray-500 text-sm">All clear! No alerts right now.</p>
                  </div>
                ) : topAlerts.map(alert => {
                  const isRead  = readIds.includes(alert.id)
                  const colors  = getAlertColor(alert.type)
                  const Icon    = getAlertIcon(alert.category)
                  return (
                    <div
                      key={alert.id}
                      onClick={() => markOneRead(alert.id)}
                      className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-800/50 transition cursor-pointer ${isRead ? 'opacity-60' : ''}`}>

                      {/* Unread dot */}
                      <div className="mt-1.5 shrink-0">
                        <div className={`w-2 h-2 rounded-full ${isRead ? 'bg-gray-700' : colors.dot}`}/>
                      </div>

                      {/* Icon */}
                      <div className={`p-1.5 rounded-lg ${colors.bg} shrink-0 mt-0.5`}>
                        <Icon size={13} className={colors.text}/>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className={`text-xs font-semibold truncate ${isRead ? 'text-gray-400' : 'text-white'}`}>
                            {alert.title}
                          </p>
                          <span className={`text-xs px-1.5 py-0.5 rounded border shrink-0 ${colors.bg} ${colors.text} border-current border-opacity-30`}>
                            {alert.type}
                          </span>
                        </div>
                        <p className="text-gray-400 text-xs leading-relaxed line-clamp-2">{alert.desc}</p>
                        <p className="text-gray-600 text-xs mt-1">{alert.time}</p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-gray-800 bg-gray-900">
                <button
                  onClick={() => { navigate('/alerts'); setShowBell(false) }}
                  className="w-full text-center text-xs text-orange-400 hover:text-orange-300 font-medium transition">
                  View all {alerts.length} alerts →
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-gray-400 text-sm">
          {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
        </p>

        {user && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold">
              {user.name?.[0]?.toUpperCase()}
            </div>
            <div className="text-right">
              <p className="text-white text-xs font-semibold">{user.name}</p>
              <p className="text-gray-500 text-xs capitalize">{user.role}</p>
            </div>
            <button onClick={onLogout}
              className="p-2 rounded-xl bg-gray-800 hover:bg-red-500/20 hover:text-red-400 text-gray-400 transition">
              <LogOut size={16}/>
            </button>
          </div>
        )}
      </div>
    </header>
  )
}