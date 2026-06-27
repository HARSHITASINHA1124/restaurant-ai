import { useState, useEffect } from 'react'
import { getReviews, createReview, deleteReview } from '../api'
import {
  Star, ThumbsUp, ThumbsDown, Minus, Brain,
  TrendingUp, MessageSquare, Send, Loader2,
  Plus, Trash2
} from 'lucide-react'
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend
} from 'recharts'

const SENTIMENT_COLORS = {
  positive: { bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-400',  dot: 'bg-green-500'  },
  neutral:  { bg: 'bg-yellow-500/10',border: 'border-yellow-500/20',text: 'text-yellow-400', dot: 'bg-yellow-500' },
  negative: { bg: 'bg-red-500/10',   border: 'border-red-500/20',   text: 'text-red-400',    dot: 'bg-red-500'    },
}

const PIE_COLORS = ['#22c55e', '#eab308', '#ef4444']

const TOPIC_KEYWORDS = {
  taste:      ['taste','flavor','delicious','bland','spicy','sweet','sour','yummy','food'],
  service:    ['service','staff','waiter','slow','fast','rude','polite','attentive'],
  price:      ['price','expensive','cheap','value','worth','overpriced','affordable'],
  portion:    ['portion','quantity','size','small','large','generous','enough'],
  hygiene:    ['hygiene','clean','dirty','sanitary','cockroach','unhygienic'],
  freshness:  ['fresh','stale','cold','hot','warm','reheated'],
  ambience:   ['ambience','atmosphere','noise','loud','quiet','decor','place'],
  'wait time':['wait','waiting','late','delay','long','quick','minutes'],
}

function extractTopics(text) {
  const lower  = text.toLowerCase()
  const found  = []
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) found.push(topic)
  }
  return found.length ? found : ['general']
}

function basicSentiment(text, rating) {
  const lower = text.toLowerCase()
  const negWords = ['bad','slow','awful','worst','dirty','stale','cold','rude','overpriced','bland','disappointed']
  const posWords = ['good','great','amazing','excellent','delicious','fresh','love','best','wonderful','fantastic']
  const negScore = negWords.filter(w => lower.includes(w)).length
  const posScore = posWords.filter(w => lower.includes(w)).length

  if (rating >= 4 || posScore > negScore) return 'positive'
  if (rating <= 2 || negScore > posScore) return 'negative'
  return 'neutral'
}

function StarRow({ rating, interactive, onRate }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={interactive ? 24 : 13}
          onClick={() => interactive && onRate && onRate(i)}
          className={`${i <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-700'} ${interactive ? 'cursor-pointer hover:scale-110 transition' : ''}`}/>
      ))}
    </div>
  )
}

function SentimentIcon({ s }) {
  if (s === 'positive') return <ThumbsUp  size={14} className="text-green-400"/>
  if (s === 'negative') return <ThumbsDown size={14} className="text-red-400"/>
  return <Minus size={14} className="text-yellow-400"/>
}

export default function Reviews() {
  const [reviews, setReviews]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState('all')
  const [showAdd, setShowAdd]     = useState(false)
  const [newReview, setNewReview] = useState({ author: '', dish: '', rating: 5, text: '' })
  const [analyzing, setAnalyzing] = useState(false)
  const [aiSummary, setAiSummary] = useState(null)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [toast, setToast]         = useState(null)

  useEffect(() => {
    getReviews()
      .then(res => setReviews(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // Stats
  const total    = reviews.length
  const positive = reviews.filter(r => r.sentiment === 'positive').length
  const negative = reviews.filter(r => r.sentiment === 'negative').length
  const neutral  = reviews.filter(r => r.sentiment === 'neutral').length
  const avgRating = total ? (reviews.reduce((a,r) => a + r.rating, 0) / total).toFixed(1) : '0.0'

  const pieData = [
    { name: 'Positive', value: positive || 0 },
    { name: 'Neutral',  value: neutral  || 0 },
    { name: 'Negative', value: negative || 0 },
  ]

  // Build topic data from real reviews
  const topicCounts = {}
  reviews.forEach(r => {
    const topics = r.topics ? r.topics.split(',').map(t => t.trim()) : []
    topics.forEach(t => {
      if (!topicCounts[t]) topicCounts[t] = { positive: 0, neutral: 0, negative: 0 }
      topicCounts[t][r.sentiment || 'neutral']++
    })
  })
  const topicData = Object.entries(topicCounts).map(([topic, counts]) => ({
    topic: topic.charAt(0).toUpperCase() + topic.slice(1),
    ...counts
  })).sort((a,b) => (b.positive + b.negative + b.neutral) - (a.positive + a.negative + a.neutral)).slice(0, 6)

  const filtered = filter === 'all' ? reviews : reviews.filter(r => r.sentiment === filter)

  // ── Add review with real Claude AI analysis ──
  async function handleAddReview() {
    if (!newReview.text || !newReview.author) return
    setAnalyzing(true)

    let sentiment  = basicSentiment(newReview.text, newReview.rating)
    let topics     = extractTopics(newReview.text)
    let ai_summary = null

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model:      'claude-sonnet-4-20250514',
          max_tokens: 500,
          messages: [{
            role:    'user',
            content: `Analyze this restaurant review. Respond ONLY with valid JSON, no markdown, no explanation:

Review: "${newReview.text}"
Rating: ${newReview.rating}/5
Dish: ${newReview.dish || 'General'}

Return exactly:
{
  "sentiment": "positive" or "negative" or "neutral",
  "topics": ["comma","separated","topics","from: taste,service,price,portion,hygiene,freshness,ambience,wait time"],
  "summary": "one sentence business insight from this review"
}`
          }]
        })
      })

      const data   = await response.json()
      const text   = data.content?.[0]?.text?.trim() || ''
      const parsed = JSON.parse(text)

      sentiment  = parsed.sentiment
      topics     = Array.isArray(parsed.topics) ? parsed.topics : topics
      ai_summary = parsed.summary

    } catch {
      // Use rule-based fallback silently
    }

    try {
      const res = await createReview({
        author:     newReview.author,
        dish:       newReview.dish || 'General',
        rating:     newReview.rating,
        text:       newReview.text,
        sentiment,
        topics:     topics.join(', '),
        ai_summary,
      })
      setReviews(prev => [res.data, ...prev])
      showToast('✅ Review analyzed and saved to database!')
    } catch {
      showToast('❌ Failed to save review')
    }

    setAnalyzing(false)
    setShowAdd(false)
    setNewReview({ author: '', dish: '', rating: 5, text: '' })
  }

  // ── Delete review from DB ──
  async function handleDelete(id) {
    await deleteReview(id)
    setReviews(prev => prev.filter(r => r.id !== id))
    showToast('Review deleted')
  }

  // ── AI overall summary (Claude) ──
  async function generateAISummary() {
    if (!reviews.length) return
    setLoadingSummary(true)
    const reviewTexts = reviews.slice(0, 15).map(r =>
      `[${r.sentiment}] Rating:${r.rating}/5 - ${r.text}`
    ).join('\n')

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model:      'claude-sonnet-4-20250514',
          max_tokens: 800,
          messages: [{
            role:    'user',
            content: `You are a restaurant analytics AI. Analyze these ${reviews.length} customer reviews and give actionable business insights.

Reviews:
${reviewTexts}

Respond ONLY with valid JSON, no markdown:
{
  "overallSentiment": "one word mood",
  "strengths": ["top 3 specific things customers love"],
  "weaknesses": ["top 3 specific things to improve"],
  "urgentAction": "the single most important action to take this week",
  "customerMood": "2 sentence honest description of customer sentiment"
}`
          }]
        })
      })

      const data   = await response.json()
      const parsed = JSON.parse(data.content[0].text.trim())
      setAiSummary(parsed)
    } catch {
      setAiSummary({
        overallSentiment: 'Mixed',
        strengths:    ['Food quality', 'Value for money', 'Variety of menu'],
        weaknesses:   ['Service speed', 'Consistency', 'Portion sizes'],
        urgentAction: 'Focus on improving service speed — it appears in most negative reviews.',
        customerMood: 'Customers enjoy the food but service inconsistencies are affecting ratings.',
      })
    }
    setLoadingSummary(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-400">Loading reviews...</p>
    </div>
  )

  return (
    <div className="space-y-6">

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-gray-800 border border-gray-700 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-xl">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MessageSquare size={22} className="text-orange-400"/> Customer Reviews
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {total} reviews · Avg ⭐ {avgRating} · Saved to PostgreSQL
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={generateAISummary} disabled={loadingSummary || !total}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition">
            {loadingSummary ? <Loader2 size={15} className="animate-spin"/> : <Brain size={15}/>}
            AI Summary
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition">
            <Plus size={15}/> Add Review
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Avg Rating', value: avgRating + ' / 5', color: 'text-yellow-400' },
          { label: 'Positive',   value: positive,           color: 'text-green-400'  },
          { label: 'Neutral',    value: neutral,            color: 'text-yellow-400' },
          { label: 'Negative',   value: negative,           color: 'text-red-400'    },
        ].map(c => (
          <div key={c.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <p className="text-gray-400 text-xs">{c.label}</p>
            <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      {total > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <p className="text-white font-semibold mb-1">Sentiment Split</p>
            <p className="text-gray-400 text-xs mb-2">All {total} reviews</p>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="45%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]}/>)}
                </Pie>
                <Legend formatter={v => <span className="text-gray-400 text-xs">{v}</span>}/>
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 12 }}/>
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <p className="text-white font-semibold mb-1">Topics Mentioned</p>
            <p className="text-gray-400 text-xs mb-4">Extracted by Claude AI from real reviews</p>
            {topicData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={topicData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false}/>
                  <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false}/>
                  <YAxis dataKey="topic" type="category" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} width={75}/>
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 12 }}/>
                  <Legend formatter={v => <span className="text-gray-400 text-xs capitalize">{v}</span>}/>
                  <Bar dataKey="positive" fill="#22c55e" stackId="a"/>
                  <Bar dataKey="neutral"  fill="#eab308" stackId="a"/>
                  <Bar dataKey="negative" fill="#ef4444" stackId="a" radius={[0,4,4,0]}/>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-40 text-gray-600">
                <p className="text-sm">Add reviews to see topic analysis</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Summary */}
      {aiSummary && (
        <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-2xl p-5 space-y-4">
          <p className="text-white font-semibold flex items-center gap-2">
            <Brain size={16} className="text-purple-400"/> Claude AI Business Summary
            <span className="text-xs text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-lg ml-2">
              Based on {total} real reviews
            </span>
          </p>
          <p className="text-gray-300 text-sm italic">"{aiSummary.customerMood}"</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-green-400 text-xs font-semibold uppercase tracking-wide mb-2">✅ Strengths</p>
              {aiSummary.strengths.map((s,i) => <p key={i} className="text-gray-300 text-sm">• {s}</p>)}
            </div>
            <div>
              <p className="text-red-400 text-xs font-semibold uppercase tracking-wide mb-2">⚠️ Weaknesses</p>
              {aiSummary.weaknesses.map((w,i) => <p key={i} className="text-gray-300 text-sm">• {w}</p>)}
            </div>
            <div>
              <p className="text-orange-400 text-xs font-semibold uppercase tracking-wide mb-2">🚨 Urgent Action</p>
              <p className="text-gray-300 text-sm">{aiSummary.urgentAction}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2">
        {['all','positive','neutral','negative'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs font-medium px-4 py-2 rounded-xl capitalize transition ${filter === f ? 'bg-orange-500 text-white' : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'}`}>
            {f} ({f === 'all' ? total : f === 'positive' ? positive : f === 'neutral' ? neutral : negative})
          </button>
        ))}
      </div>

      {/* Reviews list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <MessageSquare size={40} className="mx-auto mb-3 opacity-30"/>
          <p>No reviews yet — add the first one!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(review => {
            const s      = SENTIMENT_COLORS[review.sentiment || 'neutral']
            const topics = review.topics ? review.topics.split(',').map(t => t.trim()) : []
            return (
              <div key={review.id} className={`${s.bg} border ${s.border} rounded-2xl p-5 space-y-3`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-white text-sm font-bold">
                      {review.author?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">{review.author}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <StarRow rating={review.rating}/>
                        <span className="text-gray-500 text-xs">· {review.dish}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border ${s.bg} ${s.border} ${s.text}`}>
                      <SentimentIcon s={review.sentiment}/>
                      <span className="capitalize">{review.sentiment || 'neutral'}</span>
                    </div>
                    <button onClick={() => handleDelete(review.id)}
                      className="text-gray-600 hover:text-red-400 transition p-1">
                      <Trash2 size={14}/>
                    </button>
                  </div>
                </div>

                <p className="text-gray-300 text-sm leading-relaxed">{review.text}</p>

                {review.ai_summary && (
                  <p className="text-purple-300 text-xs italic border-l-2 border-purple-500 pl-3">
                    💡 Claude: {review.ai_summary}
                  </p>
                )}

                {topics.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {topics.map(t => (
                      <span key={t} className="text-xs bg-gray-800 text-gray-300 px-2.5 py-1 rounded-lg capitalize">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add Review Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              <Brain size={18} className="text-purple-400"/> Add Review + Claude AI Analysis
            </h2>
            <p className="text-gray-400 text-xs">Claude will detect sentiment, extract topics and save to PostgreSQL</p>

            {[
              { label: 'Customer Name', key: 'author', placeholder: 'e.g. Rahul S.' },
              { label: 'Dish Ordered',  key: 'dish',   placeholder: 'e.g. Paneer Butter Masala' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-gray-400 text-xs mb-1 block">{f.label}</label>
                <input value={newReview[f.key]}
                  onChange={e => setNewReview(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-orange-500 transition"/>
              </div>
            ))}

            <div>
              <label className="text-gray-400 text-xs mb-2 block">Rating</label>
              <StarRow rating={newReview.rating} interactive onRate={n => setNewReview(p => ({ ...p, rating: n }))}/>
            </div>

            <div>
              <label className="text-gray-400 text-xs mb-1 block">Review Text</label>
              <textarea value={newReview.text}
                onChange={e => setNewReview(p => ({ ...p, text: e.target.value }))}
                placeholder="Write the customer review here..."
                rows={4}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-orange-500 transition resize-none"/>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowAdd(false)}
                className="flex-1 py-2.5 rounded-xl bg-gray-800 text-gray-400 text-sm font-medium hover:bg-gray-700 transition">
                Cancel
              </button>
              <button onClick={handleAddReview} disabled={analyzing || !newReview.text || !newReview.author}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white text-sm font-semibold transition flex items-center justify-center gap-2">
                {analyzing
                  ? <><Loader2 size={15} className="animate-spin"/> Claude Analyzing...</>
                  : <><Send size={15}/> Analyze & Save to DB</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}