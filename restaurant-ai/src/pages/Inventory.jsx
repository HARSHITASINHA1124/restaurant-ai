import { useEffect, useState } from 'react'
import { getInventory, createIngredient, updateIngredient, deleteIngredient, restockIngredient } from '../api'
import { Plus, Search, Edit2, Trash2, AlertTriangle, CheckCircle, XCircle, Package } from 'lucide-react'

const CATEGORIES = ['All', 'Dairy', 'Vegetables', 'Grains', 'Beverages', 'Spices', 'Other']
const EMPTY_FORM = { name: '', category: 'Dairy', current: '', unit: 'kg', minStock: '', costPerUnit: '', supplier: '', expiry: '' }

function getStatus(item) {
  const today     = new Date()
  const expDate   = new Date(item.expiry_date)
  const daysToExp = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24))
  if (item.current_stock <= 0) return 'out'
  if (item.current_stock < item.min_stock) return daysToExp <= 2 ? 'expiring' : 'low'
  if (daysToExp <= 2) return 'expiring'
  return 'safe'
}

function StatusBadge({ status }) {
  const map = {
    safe:     { label: 'Safe',     class: 'text-green-400 bg-green-500/10 border-green-500/20' },
    low:      { label: 'Low',      class: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
    out:      { label: 'Out',      class: 'text-red-400 bg-red-500/10 border-red-500/20' },
    expiring: { label: 'Expiring', class: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  }
  const s = map[status]
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${s.class}`}>{s.label}</span>
}

function StockBar({ current, minStock }) {
  const pct   = Math.min((current / (minStock * 2)) * 100, 100)
  const color = pct < 30 ? 'bg-red-500' : pct < 60 ? 'bg-yellow-500' : 'bg-green-500'
  return (
    <div className="w-full bg-gray-800 rounded-full h-1.5 mt-1">
      <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export default function Inventory() {
  const [items, setItems]             = useState([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [activeCategory, setCategory] = useState('All')
  const [activeStatus, setStatus]     = useState('All')
  const [showModal, setShowModal]     = useState(false)
  const [editItem, setEditItem]       = useState(null)
  const [form, setForm]               = useState(EMPTY_FORM)

  useEffect(() => {
    getInventory()
      .then(res => setItems(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = items.filter(item => {
    const status      = getStatus(item)
    const matchCat    = activeCategory === 'All' || item.category === activeCategory
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase())
    const matchStatus = activeStatus === 'All' || status === activeStatus.toLowerCase()
    return matchCat && matchSearch && matchStatus
  })

  const counts = {
    total:    items.length,
    safe:     items.filter(i => getStatus(i) === 'safe').length,
    low:      items.filter(i => getStatus(i) === 'low').length,
    out:      items.filter(i => getStatus(i) === 'out').length,
    expiring: items.filter(i => getStatus(i) === 'expiring').length,
  }

  function openAdd() {
    setEditItem(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  function openEdit(item) {
    setEditItem(item)
    setForm({
      name:        item.name,
      category:    item.category,
      current:     item.current_stock,
      unit:        item.unit,
      minStock:    item.min_stock,
      costPerUnit: item.cost_per_unit,
      supplier:    item.supplier || '',
      expiry:      item.expiry_date || '',
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name || !form.current || !form.minStock) return
    const entry = {
      name:          form.name,
      category:      form.category,
      current_stock: Number(form.current),
      unit:          form.unit,
      min_stock:     Number(form.minStock),
      cost_per_unit: Number(form.costPerUnit),
      supplier:      form.supplier,
      expiry_date:   form.expiry || null,
    }
    if (editItem) {
      const res = await updateIngredient(editItem.id, entry)
      setItems(prev => prev.map(i => i.id === editItem.id ? res.data : i))
    } else {
      const res = await createIngredient(entry)
      setItems(prev => [...prev, res.data])
    }
    setShowModal(false)
  }

  async function handleDelete(id) {
    await deleteIngredient(id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  async function handleRestock(id) {
    const res = await restockIngredient(id)
    setItems(prev => prev.map(i => i.id === id ? { ...i, current_stock: res.data.current_stock } : i))
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-400">Loading inventory...</p>
    </div>
  )

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Ingredient Inventory</h1>
          <p className="text-gray-400 text-sm mt-1">{items.length} ingredients tracked</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition">
          <Plus size={16} /> Add Ingredient
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Items',   value: counts.total,              icon: Package,       color: 'text-white',        bg: 'bg-gray-800'        },
          { label: 'Safe Stock',    value: counts.safe,               icon: CheckCircle,   color: 'text-green-400',    bg: 'bg-green-500/10'    },
          { label: 'Low / Out',     value: counts.low + counts.out,   icon: AlertTriangle, color: 'text-yellow-400',   bg: 'bg-yellow-500/10'   },
          { label: 'Expiring Soon', value: counts.expiring,           icon: XCircle,       color: 'text-orange-400',   bg: 'bg-orange-500/10'   },
        ].map(c => (
          <div key={c.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center gap-4">
            <div className={`${c.bg} p-3 rounded-xl`}>
              <c.icon size={20} className={c.color} />
            </div>
            <div>
              <p className="text-gray-400 text-xs">{c.label}</p>
              <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 w-60">
          <Search size={15} className="text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search ingredients..."
            className="bg-transparent text-sm text-white placeholder-gray-500 outline-none w-full" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)}
              className={`text-xs font-medium px-3 py-2 rounded-xl transition ${activeCategory === cat ? 'bg-orange-500 text-white' : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'}`}>
              {cat}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {['All', 'Safe', 'Low', 'Out', 'Expiring'].map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className={`text-xs font-medium px-3 py-2 rounded-xl transition ${activeStatus === s ? 'bg-blue-500 text-white' : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400 text-xs">
              {['Ingredient','Category','Stock Level','Current / Min','Cost/Unit','Supplier','Expiry','Status','Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {filtered.map(item => {
              const status    = getStatus(item)
              const daysToExp = item.expiry_date
                ? Math.ceil((new Date(item.expiry_date) - new Date()) / (1000 * 60 * 60 * 24))
                : 999
              return (
                <tr key={item.id} className="hover:bg-gray-800/50 transition">
                  <td className="px-4 py-3 font-medium text-white">{item.name}</td>
                  <td className="px-4 py-3 text-gray-400">{item.category}</td>
                  <td className="px-4 py-3 w-32">
                    <StockBar current={item.current_stock} minStock={item.min_stock} />
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    <span className={item.current_stock < item.min_stock ? 'text-red-400 font-semibold' : 'text-white'}>
                      {item.current_stock}
                    </span>
                    <span className="text-gray-600"> / {item.min_stock} {item.unit}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-300">₹{item.cost_per_unit}/{item.unit}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{item.supplier}</td>
                  <td className="px-4 py-3 text-xs">
                    <span className={daysToExp <= 2 ? 'text-orange-400 font-semibold' : 'text-gray-400'}>
                      {item.expiry_date} {daysToExp <= 2 && `(${daysToExp}d)`}
                    </span>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleRestock(item.id)}
                        className="text-xs bg-green-500/10 hover:bg-green-500/20 text-green-400 px-2 py-1 rounded-lg transition">
                        Restock
                      </button>
                      <button onClick={() => openEdit(item)}
                        className="text-gray-400 hover:text-white transition"><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(item.id)}
                        className="text-red-400 hover:text-red-300 transition"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-white font-bold text-lg">{editItem ? 'Edit Ingredient' : 'Add Ingredient'}</h2>
            {[
              { label: 'Name',            key: 'name',        type: 'text',   placeholder: 'e.g. Paneer'    },
              { label: 'Current Stock',   key: 'current',     type: 'number', placeholder: 'e.g. 5'         },
              { label: 'Unit',            key: 'unit',        type: 'text',   placeholder: 'kg / L / pcs'   },
              { label: 'Min Stock',       key: 'minStock',    type: 'number', placeholder: 'e.g. 3'         },
              { label: 'Cost per Unit ₹', key: 'costPerUnit', type: 'number', placeholder: 'e.g. 280'       },
              { label: 'Supplier',        key: 'supplier',    type: 'text',   placeholder: 'Supplier name'  },
              { label: 'Expiry Date',     key: 'expiry',      type: 'date',   placeholder: ''               },
            ].map(f => (
              <div key={f.key}>
                <label className="text-gray-400 text-xs mb-1 block">{f.label}</label>
                <input type={f.type} value={form[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-orange-500 transition" />
              </div>
            ))}
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Category</label>
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500 transition">
                {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-gray-800 text-gray-400 text-sm font-medium hover:bg-gray-700 transition">
                Cancel
              </button>
              <button onClick={handleSave}
                className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition">
                {editItem ? 'Save Changes' : 'Add Ingredient'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}