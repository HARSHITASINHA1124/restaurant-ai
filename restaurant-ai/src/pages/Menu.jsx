import { useEffect, useState } from 'react'
import { getMenu, createMenuItem, updateMenuItem, deleteMenuItem, toggleMenuItem, getInventory, getRecipe, saveRecipe } from '../api'
import { Plus, Search, Edit2, Trash2, ToggleLeft, ToggleRight, IndianRupee, Clock, TrendingUp, Package, X } from 'lucide-react'

const CATEGORIES = ['All', 'Main Course', 'Snacks', 'Beverages', 'Desserts']
const EMPTY_FORM = { name: '', category: 'Main Course', price: '', cost: '', prepTime: '' }

function margin(price, cost) {
  return Math.round(((price - cost) / price) * 100)
}

function MarginBadge({ pct }) {
  const color = pct >= 50 ? 'text-green-400 bg-green-500/10 border-green-500/20'
              : pct >= 35 ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
              :              'text-red-400 bg-red-500/10 border-red-500/20'
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg border ${color}`}>
      {pct}% margin
    </span>
  )
}

export default function Menu({ user }) {
  const [dishes, setDishes]           = useState([])
  const [ingredients, setIngredients] = useState([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [activeCategory, setCategory] = useState('All')
  const [showModal, setShowModal]     = useState(false)
  const [editDish, setEditDish]       = useState(null)
  const [form, setForm]               = useState(EMPTY_FORM)
  const [recipeItems, setRecipeItems] = useState([])
  const [selectedIng, setSelectedIng] = useState('')
  const [selectedQty, setSelectedQty] = useState('')
  const [loadingRecipe, setLoadingRecipe] = useState(false)

  useEffect(() => {
    Promise.all([getMenu(), getInventory()])
      .then(([m, i]) => {
        setDishes(m.data)
        setIngredients(i.data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = dishes.filter(d => {
    const matchCat    = activeCategory === 'All' || d.category === activeCategory
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  async function toggleAvail(id) {
    const res = await toggleMenuItem(id)
    setDishes(prev => prev.map(d => d.id === id ? { ...d, available: res.data.available } : d))
  }

  function openAdd() {
    setEditDish(null)
    setForm(EMPTY_FORM)
    setRecipeItems([])
    setSelectedIng('')
    setSelectedQty('')
    setShowModal(true)
  }

  async function openEdit(dish) {
    setEditDish(dish)
    setForm({
      name:     dish.name,
      category: dish.category,
      price:    dish.price,
      cost:     dish.cost,
      prepTime: dish.prep_time,
    })
    setSelectedIng('')
    setSelectedQty('')
    setLoadingRecipe(true)
    setShowModal(true)
    try {
      const res = await getRecipe(dish.id)
      setRecipeItems(res.data.map(r => ({
        ingredient_id: r.ingredient_id,
        name:          r.name,
        quantity:      r.quantity,
        unit:          r.unit,
      })))
    } catch { setRecipeItems([]) }
    setLoadingRecipe(false)
  }

  function addIngredientToRecipe() {
    if (!selectedIng || !selectedQty) return
    const ing = ingredients.find(i => i.id === Number(selectedIng))
    if (!ing) return
    if (recipeItems.find(r => r.ingredient_id === ing.id)) return
    setRecipeItems(prev => [...prev, {
      ingredient_id: ing.id,
      name:          ing.name,
      quantity:      Number(selectedQty),
      unit:          ing.unit,
    }])
    setSelectedIng('')
    setSelectedQty('')
  }

  function removeIngredient(id) {
    setRecipeItems(prev => prev.filter(r => r.ingredient_id !== id))
  }

  async function handleSave() {
    if (!form.name || !form.price || !form.cost) return
    const entry = {
      name:      form.name,
      category:  form.category,
      price:     Number(form.price),
      cost:      Number(form.cost),
      prep_time: Number(form.prepTime),
      available: editDish ? editDish.available : true,
    }

    let savedDish
    if (editDish) {
      const res = await updateMenuItem(editDish.id, entry)
      setDishes(prev => prev.map(d => d.id === editDish.id ? res.data : d))
      savedDish = res.data
    } else {
      const res = await createMenuItem(entry)
      setDishes(prev => [...prev, res.data])
      savedDish = res.data
    }

    // Save recipe to DB
    if (recipeItems.length > 0) {
      await saveRecipe({
        menu_item_id: savedDish.id,
        ingredients:  recipeItems.map(r => ({
          ingredient_id: r.ingredient_id,
          quantity:      r.quantity,
        }))
      })
    }

    setShowModal(false)
  }

  async function handleDelete(id) {
    await deleteMenuItem(id)
    setDishes(prev => prev.filter(d => d.id !== id))
  }

  const canEdit = !user || user.role === 'owner' || user.role === 'manager'

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-400">Loading menu...</p>
    </div>
  )

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Menu Management</h1>
          <p className="text-gray-400 text-sm mt-1">
            {dishes.length} dishes · {dishes.filter(d => d.available).length} available
          </p>
        </div>
        {canEdit && (
          <button onClick={openAdd}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition">
            <Plus size={16}/> Add Dish
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Dishes',      value: dishes.length,                                                                                          color: 'text-white'      },
          { label: 'Available',         value: dishes.filter(d => d.available).length,                                                                 color: 'text-green-400'  },
          { label: 'Avg Profit Margin', value: dishes.length ? Math.round(dishes.reduce((a,d) => a + margin(d.price,d.cost), 0) / dishes.length) + '%' : '0%', color: 'text-orange-400' },
          { label: 'Avg Price',         value: dishes.length ? '₹' + Math.round(dishes.reduce((a,d) => a + d.price, 0) / dishes.length) : '₹0',       color: 'text-blue-400'   },
        ].map(c => (
          <div key={c.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <p className="text-gray-400 text-xs mb-1">{c.label}</p>
            <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 w-64">
          <Search size={15} className="text-gray-400"/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search dishes..."
            className="bg-transparent text-sm text-white placeholder-gray-500 outline-none w-full"/>
        </div>
        <div className="flex gap-2">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)}
              className={`text-xs font-medium px-4 py-2 rounded-xl transition ${
                activeCategory === cat ? 'bg-orange-500 text-white' : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'
              }`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Dish Grid */}
      <div className="grid grid-cols-3 gap-4">
        {filtered.map(dish => (
          <div key={dish.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col gap-3 hover:border-gray-700 transition">

            <div className="flex items-start justify-between">
              <div>
                <p className="text-white font-semibold text-sm">{dish.name}</p>
                <p className="text-gray-500 text-xs mt-0.5">{dish.category}</p>
              </div>
              {canEdit && (
                <button onClick={() => toggleAvail(dish.id)}>
                  {dish.available
                    ? <ToggleRight size={24} className="text-green-400"/>
                    : <ToggleLeft  size={24} className="text-gray-600"/>}
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-white font-bold text-lg">
                <IndianRupee size={14} className="text-orange-400"/>{dish.price}
              </div>
              <span className="text-gray-600 text-xs">cost ₹{dish.cost}</span>
              <MarginBadge pct={margin(dish.price, dish.cost)}/>
            </div>

            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1"><Clock size={12}/>{dish.prep_time} min</span>
              <span className="flex items-center gap-1"><TrendingUp size={12}/>₹{dish.price - dish.cost} profit</span>
            </div>

            {canEdit && (
              <div className="flex gap-2 mt-1">
                <button onClick={() => openEdit(dish)}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-xl transition">
                  <Edit2 size={13}/> Edit & Recipe
                </button>
                <button onClick={() => handleDelete(dish.id)}
                  className="flex items-center justify-center gap-1.5 text-xs font-medium bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-2 rounded-xl transition">
                  <Trash2 size={13}/>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-white font-bold text-lg">{editDish ? 'Edit Dish' : 'Add New Dish'}</h2>

            {/* Basic fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-gray-400 text-xs mb-1 block">Dish Name</label>
                <input type="text" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Hot Chocolate"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-orange-500 transition"/>
              </div>
              {[
                { label: 'Price (₹)',       key: 'price',    placeholder: '220' },
                { label: 'Cost (₹)',        key: 'cost',     placeholder: '95'  },
                { label: 'Prep Time (min)', key: 'prepTime', placeholder: '10'  },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-gray-400 text-xs mb-1 block">{f.label}</label>
                  <input type="number" value={form[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-orange-500 transition"/>
                </div>
              ))}
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Category</label>
                <select value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500 transition">
                  {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Margin preview */}
            {form.price && form.cost && Number(form.price) > 0 && Number(form.cost) > 0 && (
              <div className="bg-gray-800 rounded-xl px-4 py-2.5 flex items-center justify-between">
                <span className="text-gray-400 text-xs">Profit margin preview</span>
                <MarginBadge pct={margin(Number(form.price), Number(form.cost))}/>
              </div>
            )}

            {/* Recipe Builder */}
            <div className="border border-gray-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Package size={15} className="text-orange-400"/>
                <p className="text-white text-sm font-semibold">Recipe Builder</p>
                <span className="text-gray-500 text-xs">(links dish to inventory)</span>
              </div>

              {loadingRecipe ? (
                <p className="text-gray-500 text-xs">Loading existing recipe...</p>
              ) : (
                <>
                  {/* Existing recipe items */}
                  {recipeItems.length > 0 && (
                    <div className="space-y-2">
                      {recipeItems.map(item => (
                        <div key={item.ingredient_id} className="flex items-center justify-between bg-gray-800 rounded-xl px-3 py-2">
                          <div className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-orange-400"/>
                            <span className="text-white text-xs font-medium">{item.name}</span>
                            <span className="text-gray-400 text-xs">{item.quantity} {item.unit} per serving</span>
                          </div>
                          <button onClick={() => removeIngredient(item.ingredient_id)}
                            className="text-gray-500 hover:text-red-400 transition p-1">
                            <X size={13}/>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add ingredient row */}
                  <div className="flex gap-2">
                    <select value={selectedIng}
                      onChange={e => setSelectedIng(e.target.value)}
                      className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-orange-500">
                      <option value="">Select ingredient...</option>
                      {ingredients
                        .filter(i => !recipeItems.find(r => r.ingredient_id === i.id))
                        .map(i => (
                          <option key={i.id} value={i.id}>
                            {i.name} ({i.current_stock} {i.unit} in stock)
                          </option>
                        ))}
                    </select>
                    <input type="number" value={selectedQty}
                      onChange={e => setSelectedQty(e.target.value)}
                      placeholder="Qty"
                      className="w-20 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-orange-500"/>
                    <button onClick={addIngredientToRecipe}
                      disabled={!selectedIng || !selectedQty}
                      className="bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white px-3 py-2 rounded-xl transition">
                      <Plus size={16}/>
                    </button>
                  </div>

                  {recipeItems.length === 0 && (
                    <p className="text-gray-600 text-xs">
                      ⚠️ No ingredients linked — inventory won't auto-deduct when this dish is ordered.
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-gray-800 text-gray-400 text-sm font-medium hover:bg-gray-700 transition">
                Cancel
              </button>
              <button onClick={handleSave}
                className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition">
                {editDish ? 'Save Changes' : 'Add Dish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}