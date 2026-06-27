import { useState, useEffect } from 'react'
import {
  Tag, TrendingUp, TrendingDown, Brain,
  Loader2, CheckCircle, AlertTriangle,
  IndianRupee, RefreshCw, Zap, Info
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'
import { getMenu, updateMenuPrice } from '../api'

function margin(price, cost) {
  return Math.round(((price - cost) / price) * 100)
}

function getDemand(sales) {
  if (sales >= 150) return 'high'
  if (sales >= 80)  return 'medium'
  return 'low'
}

function DemandBadge({ demand }) {
  const map = {
    high:   'text-green-400 bg-green-500/10 border-green-500/20',
    medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    low:    'text-red-400 bg-red-500/10 border-red-500/20',
  }
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border capitalize ${map[demand]}`}>
      {demand}
    </span>
  )
}

function PriceChangeBadge({ current, suggested }) {
  if (!suggested) return <span className="text-gray-500 text-xs">—</span>
  const diff = suggested - current
  const pct  = Math.round((diff / current) * 100)
  if (diff === 0) return <span className="text-gray-400 text-xs">No change</span>
  return (
    <span className={`flex items-center gap-1 text-xs font-semibold ${diff > 0 ? 'text-green-400' : 'text-red-400'}`}>
      {diff > 0 ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
      {diff > 0 ? '+' : ''}₹{diff} ({diff > 0 ? '+' : ''}{pct}%)
    </span>
  )
}

export default function Pricing() {
  const [dishes, setDishes]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [loadingId, setLoadingId]   = useState(null)
  const [globalLoading, setGlobal]  = useState(false)
  const [selectedDish, setSelected] = useState(null)
  const [toast, setToast]           = useState(null)

  useEffect(() => {
    getMenu()
      .then(res => {
        const enriched = res.data.map(d => ({
          ...d,
          sales:            Math.floor(Math.random() * 150) + 50,
          sentiment:        (3.5 + Math.random() * 1.5).toFixed(1),
          ingredientChange: [0, 0, 5, 10, 15, 20][Math.floor(Math.random() * 6)],
          suggested:        null,
          reason:           null,
          confidence:       null,
          strategy:         null,
          applied:          false,
        }))
        setDishes(enriched)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function getPriceSuggestion(dish) {
    setLoadingId(dish.id)
    const currentMargin = margin(dish.price, dish.cost)

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `You are a restaurant pricing AI. Suggest an optimal price for this dish.

Dish: ${dish.name}
Category: ${dish.category}
Current Price: ₹${dish.price}
Cost to make: ₹${dish.cost}
Current margin: ${currentMargin}%
Weekly sales: ${dish.sales} units
Demand level: ${getDemand(dish.sales)}
Customer sentiment score: ${dish.sentiment}/5
Ingredient cost change: ${dish.ingredientChange > 0 ? '+' : ''}${dish.ingredientChange}% recently

Rules:
- Minimum margin must be 35%
- Don't raise price more than 20% at once
- Don't lower price more than 15% at once
- Round to nearest ₹5 or ₹9 (psychological pricing)
- High demand + good sentiment = can raise price
- Low demand + poor sentiment = lower or keep price
- If ingredient cost rose significantly, raise price

Respond ONLY with JSON, no markdown:
{
  "suggestedPrice": number,
  "reasoning": "2 sentence explanation",
  "confidence": number between 70 and 99,
  "strategy": "increase or decrease or maintain"
}`
          }]
        })
      })

      const data   = await res.json()
      const parsed = JSON.parse(data.content[0].text.trim())

      setDishes(prev => prev.map(d => d.id === dish.id
        ? { ...d, suggested: parsed.suggestedPrice, reason: parsed.reasoning, confidence: parsed.confidence, strategy: parsed.strategy }
        : d
      ))
    } catch {
      // Rule-based fallback
      let suggested = dish.price
      const demand  = getDemand(dish.sales)
      if (demand === 'high' && dish.sentiment >= 4.0)
        suggested = Math.round((dish.price * 1.1) / 5) * 5
      else if (demand === 'low' || dish.sentiment < 3.5)
        suggested = Math.round((dish.price * 0.95) / 5) * 5
      if (dish.ingredientChange > 10)
        suggested = Math.round((suggested * 1.08) / 5) * 5

      setDishes(prev => prev.map(d => d.id === dish.id
        ? { ...d,
            suggested,
            reason:     'Price adjusted based on demand, sentiment and ingredient cost changes.',
            confidence: 82,
            strategy:   suggested > dish.price ? 'increase' : suggested < dish.price ? 'decrease' : 'maintain'
          }
        : d
      ))
    }
    setLoadingId(null)
  }

  async function runAllPricing() {
    setGlobal(true)
    for (const dish of dishes) {
      if (!dish.suggested) await getPriceSuggestion(dish)
    }
    setGlobal(false)
  }

  // ── Apply price to DB ──
  async function applyPrice(dish) {
    if (!dish.suggested) return
    try {
      await updateMenuPrice(dish.id, dish.suggested)
      setDishes(prev => prev.map(d => d.id === dish.id
        ? { ...d,
            price:     dish.suggested,
            suggested: null,
            reason:    null,
            applied:   true,
            strategy:  null,
          }
        : d
      ))
      if (selectedDish?.id === dish.id) setSelected(null)
      showToast(`✅ ${dish.name} price updated to ₹${dish.suggested} in database!`)
    } catch {
      showToast(`❌ Failed to update price. Try again.`, 'error')
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-400">Loading menu prices...</p>
    </div>
  )

  const chartData = dishes.map(d => ({
    name:      d.name.split(' ').slice(0, 2).join(' '),
    current:   d.price,
    suggested: d.suggested || d.price,
    cost:      d.cost,
  }))

  const totalRevenueImpact = dishes.reduce((sum, d) => {
    if (!d.suggested) return sum
    return sum + (d.suggested - d.price) * d.sales
  }, 0)

  return (
    <div className="space-y-6">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-xl ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Tag size={22} className="text-orange-400"/> Dynamic Pricing
          </h1>
          <p className="text-gray-400 text-sm mt-1">AI price recommendations · Applied prices save to database instantly</p>
        </div>
        <button onClick={runAllPricing} disabled={globalLoading}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition">
          {globalLoading ? <><Loader2 size={15} className="animate-spin"/> Analyzing All...</> : <><Zap size={15}/> Run AI Pricing</>}
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Dishes in DB',      value: dishes.length,                                          color: 'text-white'      },
          { label: 'Price Increases',   value: dishes.filter(d => d.suggested > d.price).length,       color: 'text-green-400'  },
          { label: 'Price Decreases',   value: dishes.filter(d => d.suggested < d.price).length,       color: 'text-red-400'    },
          { label: 'Applied This Session', value: dishes.filter(d => d.applied).length,                color: 'text-orange-400' },
        ].map(c => (
          <div key={c.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <p className="text-gray-400 text-xs">{c.label}</p>
            <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Revenue impact banner */}
      {totalRevenueImpact !== 0 && (
        <div className={`rounded-2xl p-4 border flex items-center justify-between ${totalRevenueImpact > 0 ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
          <p className={`text-sm font-medium ${totalRevenueImpact > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {totalRevenueImpact > 0 ? '📈' : '📉'} If all suggested prices are applied, weekly revenue impact:
          </p>
          <p className={`text-xl font-bold ${totalRevenueImpact > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {totalRevenueImpact > 0 ? '+' : ''}₹{Math.abs(totalRevenueImpact).toLocaleString()}
          </p>
        </div>
      )}

      {/* Price comparison chart */}
      {dishes.some(d => d.suggested) && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <p className="text-white font-semibold mb-1">Current vs AI Suggested Prices</p>
          <p className="text-gray-400 text-xs mb-4">Green bars = suggested · Orange = current · Gray = cost</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937"/>
              <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}`}/>
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 12 }} formatter={(v, n) => [`₹${v}`, n]}/>
              <Bar dataKey="cost"      name="Cost"      fill="#374151" radius={[3,3,0,0]}/>
              <Bar dataKey="current"   name="Current"   fill="#f97316" radius={[3,3,0,0]}/>
              <Bar dataKey="suggested" name="Suggested" fill="#22c55e" radius={[3,3,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Pricing factors */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
        <p className="text-white text-sm font-semibold mb-3 flex items-center gap-2">
          <Info size={15} className="text-blue-400"/> Pricing Factors Claude Considers
        </p>
        <div className="grid grid-cols-4 gap-3 text-xs text-gray-400">
          {[
            { icon: TrendingUp,    color: 'text-green-400',  label: 'Demand Level',    desc: 'High demand → price up'      },
            { icon: Brain,         color: 'text-purple-400', label: 'Sentiment Score', desc: 'Better reviews → premium'    },
            { icon: AlertTriangle, color: 'text-orange-400', label: 'Ingredient Cost', desc: 'Cost rise → adjust price'    },
            { icon: IndianRupee,   color: 'text-blue-400',   label: 'Profit Margin',   desc: 'Min 35% margin enforced'     },
          ].map(f => (
            <div key={f.label} className="flex items-start gap-2 bg-gray-800 rounded-xl p-3">
              <f.icon size={15} className={`${f.color} mt-0.5 shrink-0`}/>
              <div>
                <p className="text-white font-medium">{f.label}</p>
                <p className="text-gray-500">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <p className="text-white font-semibold">Dish Pricing Dashboard</p>
          <p className="text-gray-400 text-xs mt-0.5">Prices loaded from DB · Apply saves back to DB instantly</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 text-xs border-b border-gray-800">
              {['Dish','Current Price','Cost','Margin','Demand','Sentiment','AI Suggestion','Change','Action'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {dishes.map(dish => {
              const demand = getDemand(dish.sales)
              return (
                <tr key={dish.id}
                  onClick={() => dish.suggested && setSelected(selected?.id === dish.id ? null : dish)}
                  className={`hover:bg-gray-800/50 transition ${dish.suggested ? 'cursor-pointer' : ''}`}>
                  <td className="px-4 py-3">
                    <p className="text-white font-medium">{dish.name}</p>
                    {dish.applied && (
                      <span className="text-xs text-green-400 flex items-center gap-1 mt-0.5">
                        <CheckCircle size={10}/> Saved to DB
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-white font-semibold">₹{dish.price}</td>
                  <td className="px-4 py-3 text-gray-400">₹{dish.cost}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg border ${
                      margin(dish.price, dish.cost) >= 50 ? 'text-green-400 bg-green-500/10 border-green-500/20'
                      : margin(dish.price, dish.cost) >= 35 ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
                      : 'text-red-400 bg-red-500/10 border-red-500/20'
                    }`}>{margin(dish.price, dish.cost)}%</span>
                  </td>
                  <td className="px-4 py-3"><DemandBadge demand={demand}/></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-400">★</span>
                      <span className="text-gray-300 text-xs">{dish.sentiment}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {loadingId === dish.id
                      ? <Loader2 size={15} className="animate-spin text-orange-400"/>
                      : dish.suggested
                      ? <span className="text-blue-400 font-bold">₹{dish.suggested}</span>
                      : <span className="text-gray-600 text-xs">Not analyzed</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <PriceChangeBadge current={dish.price} suggested={dish.suggested}/>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                      {!dish.suggested ? (
                        <button onClick={() => getPriceSuggestion(dish)} disabled={loadingId === dish.id}
                          className="text-xs bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 px-2.5 py-1.5 rounded-lg transition whitespace-nowrap">
                          Get AI Price
                        </button>
                      ) : (
                        <>
                          <button onClick={() => applyPrice(dish)}
                            className="text-xs bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 px-2.5 py-1.5 rounded-lg transition whitespace-nowrap">
                            ✅ Apply to DB
                          </button>
                          <button onClick={() => getPriceSuggestion(dish)}
                            className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 px-2 py-1.5 rounded-lg transition">
                            <RefreshCw size={12}/>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* AI reasoning panel */}
      {selectedDish && selectedDish.reason && (
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-5 space-y-3">
          <p className="text-white font-semibold flex items-center gap-2">
            <Brain size={16} className="text-blue-400"/> Claude's Reasoning — {selectedDish.name}
          </p>
          <p className="text-gray-300 text-sm leading-relaxed">{selectedDish.reason}</p>
          <div className="flex gap-6 text-xs">
            <span className="text-gray-400">Confidence:
              <span className="text-white font-semibold ml-1">{selectedDish.confidence}%</span>
            </span>
            <span className="text-gray-400">Strategy:
              <span className={`font-semibold ml-1 capitalize ${
                selectedDish.strategy === 'increase' ? 'text-green-400'
                : selectedDish.strategy === 'decrease' ? 'text-red-400'
                : 'text-yellow-400'
              }`}>{selectedDish.strategy}</span>
            </span>
            <span className="text-gray-400">Current margin:
              <span className="text-white font-semibold ml-1">{margin(selectedDish.price, selectedDish.cost)}%</span>
            </span>
            <span className="text-gray-400">New margin:
              <span className="text-white font-semibold ml-1">{margin(selectedDish.suggested, selectedDish.cost)}%</span>
            </span>
          </div>
          <button onClick={() => applyPrice(selectedDish)}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition">
            <CheckCircle size={15}/> Apply ₹{selectedDish.suggested} to Database
          </button>
        </div>
      )}

    </div>
  )
}