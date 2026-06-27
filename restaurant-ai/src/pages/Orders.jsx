import { useEffect, useState } from 'react'
import { getMenu, getOrders, createOrder, updateOrderStatus } from '../api'
import {
  ShoppingCart, Plus, Minus, Trash2, CheckCircle,
  Clock, ChefHat, XCircle, IndianRupee, Search
} from 'lucide-react'

const STATUS_COLORS = {
  Pending:   'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  Preparing: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  Ready:     'text-green-400 bg-green-500/10 border-green-500/20',
  Served:    'text-gray-400 bg-gray-500/10 border-gray-500/20',
  Cancelled: 'text-red-400 bg-red-500/10 border-red-500/20',
}

const STATUS_FLOW  = ['Pending', 'Preparing', 'Ready', 'Served']
const CATEGORIES   = ['All', 'Main Course', 'Snacks', 'Beverages', 'Desserts']

export default function Orders() {
  const [MENU, setMENU]           = useState([])
  const [orders, setOrders]       = useState([])
  const [cart, setCart]           = useState([])
  const [table, setTable]         = useState('Table 1')
  const [search, setSearch]       = useState('')
  const [filterCat, setFilterCat] = useState('All')
  const [activeTab, setActiveTab] = useState('new')
  const [toast, setToast]         = useState(null)

  useEffect(() => {
    getMenu().then(res => setMENU(res.data.filter(d => d.available)))
    getOrders().then(res => setOrders(res.data))
  }, [])

  function addToCart(dish) {
    setCart(prev => {
      const exists = prev.find(c => c.id === dish.id)
      if (exists) return prev.map(c => c.id === dish.id ? { ...c, qty: c.qty + 1 } : c)
      return [...prev, { ...dish, qty: 1 }]
    })
  }

  function changeQty(id, delta) {
    setCart(prev => prev
      .map(c => c.id === id ? { ...c, qty: c.qty + delta } : c)
      .filter(c => c.qty > 0)
    )
  }

  function cartTotal() {
    return cart.reduce((sum, c) => sum + c.price * c.qty, 0)
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function placeOrder() {
    if (!cart.length) return
    const orderData = {
      table_no: table,
      items: cart.map(c => ({
        menu_item_id: c.id,
        quantity:     c.qty,
        unit_price:   c.price,
      }))
    }
    const res = await createOrder(orderData)
    setOrders(prev => [res.data, ...prev])
    setCart([])
    showToast(`✅ Order #${res.data.id} placed for ${table}!`)
    setActiveTab('live')
  }

  async function advanceStatus(id) {
    const order = orders.find(o => o.id === id)
    const idx   = STATUS_FLOW.indexOf(order.status)
    if (idx < STATUS_FLOW.length - 1) {
      const newStatus = STATUS_FLOW[idx + 1]
      await updateOrderStatus(id, newStatus)
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o))
    }
  }

  async function cancelOrder(id) {
    await updateOrderStatus(id, 'Cancelled')
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'Cancelled' } : o))
  }

  const filteredMenu = MENU.filter(d =>
    (filterCat === 'All' || d.category === filterCat) &&
    d.name.toLowerCase().includes(search.toLowerCase())
  )

  const liveOrders = orders.filter(o => o.status !== 'Served' && o.status !== 'Cancelled')
  const pastOrders = orders.filter(o => o.status === 'Served'  || o.status === 'Cancelled')

  return (
    <div className="space-y-6">

      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-green-500 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-xl animate-bounce">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Orders</h1>
          <p className="text-gray-400 text-sm mt-1">
            {liveOrders.length} active orders · ₹{orders
              .filter(o => {
                if (o.status !== 'Served') return false
                const orderDate = new Date(o.created_at).toDateString()
                const today     = new Date().toDateString()
                return orderDate === today
              })
              .reduce((a, o) => a + o.total, 0)
              .toLocaleString()
            } earned today
          </p>
        </div>
        <div className="flex gap-2">
          {['new', 'live', 'history'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`text-xs font-semibold px-4 py-2 rounded-xl capitalize transition ${activeTab === tab ? 'bg-orange-500 text-white' : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'}`}>
              {tab === 'new' ? '+ New Order' : tab === 'live' ? `Live (${liveOrders.length})` : 'History'}
            </button>
          ))}
        </div>
      </div>

      {/* NEW ORDER TAB */}
      {activeTab === 'new' && (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            <div className="flex gap-3 flex-wrap">
              <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 w-56">
                <Search size={14} className="text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search menu..."
                  className="bg-transparent text-sm text-white placeholder-gray-500 outline-none w-full" />
              </div>
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => setFilterCat(c)}
                  className={`text-xs font-medium px-3 py-2 rounded-xl transition ${filterCat === c ? 'bg-orange-500 text-white' : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'}`}>
                  {c}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {filteredMenu.map(dish => {
                const inCart = cart.find(c => c.id === dish.id)
                return (
                  <div key={dish.id}
                    className="bg-gray-900 border border-gray-800 hover:border-orange-500/40 rounded-2xl p-4 flex items-center justify-between transition cursor-pointer"
                    onClick={() => addToCart(dish)}>
                    <div>
                      <p className="text-white text-sm font-medium">{dish.name}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{dish.category} · {dish.prep_time} min</p>
                      <p className="text-orange-400 font-bold text-sm mt-1">₹{dish.price}</p>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      {inCart ? (
                        <div className="flex items-center gap-2 bg-orange-500 rounded-xl px-2 py-1">
                          <button onClick={e => { e.stopPropagation(); changeQty(dish.id, -1) }}>
                            <Minus size={12} className="text-white" />
                          </button>
                          <span className="text-white text-xs font-bold">{inCart.qty}</span>
                          <button onClick={e => { e.stopPropagation(); changeQty(dish.id, 1) }}>
                            <Plus size={12} className="text-white" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center">
                          <Plus size={14} className="text-gray-400" />
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Cart */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col gap-4 h-fit sticky top-0">
            <div className="flex items-center gap-2">
              <ShoppingCart size={18} className="text-orange-400" />
              <p className="text-white font-semibold">Current Order</p>
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Table</label>
              <select value={table} onChange={e => setTable(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none">
                {Array.from({ length: 10 }, (_, i) => `Table ${i + 1}`).map(t => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            {cart.length === 0 ? (
              <div className="text-center py-8 text-gray-600">
                <ShoppingCart size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Click dishes to add</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map(item => (
                  <div key={item.id} className="flex items-center justify-between bg-gray-800 rounded-xl px-3 py-2.5">
                    <div className="flex-1">
                      <p className="text-white text-xs font-medium">{item.name}</p>
                      <p className="text-gray-400 text-xs">₹{item.price} × {item.qty}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-orange-400 text-xs font-bold">₹{item.price * item.qty}</span>
                      <button onClick={() => changeQty(item.id, -1)}>
                        <Trash2 size={13} className="text-red-400 hover:text-red-300" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {cart.length > 0 && (
              <>
                <div className="border-t border-gray-800 pt-3 flex justify-between">
                  <span className="text-gray-400 text-sm">Total</span>
                  <span className="text-white font-bold text-lg flex items-center gap-1">
                    <IndianRupee size={14} className="text-orange-400" />{cartTotal()}
                  </span>
                </div>
                <button onClick={placeOrder}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2">
                  <CheckCircle size={16} /> Place Order
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* LIVE ORDERS TAB */}
      {activeTab === 'live' && (
        <div className="grid grid-cols-3 gap-4">
          {liveOrders.length === 0 ? (
            <div className="col-span-3 text-center py-16 text-gray-600">
              <ChefHat size={40} className="mx-auto mb-3 opacity-30" />
              <p>No active orders right now</p>
            </div>
          ) : liveOrders.map(order => (
            <div key={order.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-bold">#{order.id}</p>
                  <p className="text-gray-400 text-xs">
                    {order.table_no} · {new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${STATUS_COLORS[order.status]}`}>
                  {order.status}
                </span>
              </div>

              <div className="space-y-1">
                {order.items?.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-300"> 
                      {MENU.find(m => m.id === item.menu_item_id)?.name || `Item #${item.menu_item_id}`} × {item.quantity}
                    </span>
                    <span className="text-gray-400">₹{item.unit_price * item.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-800 pt-2 flex justify-between">
                <span className="text-gray-400 text-sm">Total</span>
                <span className="text-orange-400 font-bold">₹{order.total}</span>
              </div>

              <div className="flex gap-1">
                {STATUS_FLOW.map(s => (
                  <div key={s} className={`h-1 flex-1 rounded-full ${STATUS_FLOW.indexOf(s) <= STATUS_FLOW.indexOf(order.status) ? 'bg-orange-500' : 'bg-gray-700'}`} />
                ))}
              </div>

              <div className="flex gap-2">
                {order.status !== 'Served' && (
                  <button onClick={() => advanceStatus(order.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold py-2 rounded-xl transition">
                    <Clock size={13} />
                    {order.status === 'Pending' ? 'Start Preparing' : order.status === 'Preparing' ? 'Mark Ready' : 'Mark Served'}
                  </button>
                )}
                {order.status !== 'Served' && (
                  <button onClick={() => cancelOrder(order.id)}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-2 rounded-xl transition">
                    <XCircle size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* HISTORY TAB */}
      {activeTab === 'history' && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs">
                {['Order ID', 'Table', 'Total', 'Status', 'Time'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {pastOrders.map(order => (
                <tr key={order.id} className="hover:bg-gray-800/50 transition">
                  <td className="px-4 py-3 text-white font-medium">#{order.id}</td>
                  <td className="px-4 py-3 text-gray-400">{order.table_no}</td>
                  <td className="px-4 py-3 text-orange-400 font-semibold">₹{order.total}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${STATUS_COLORS[order.status]}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}