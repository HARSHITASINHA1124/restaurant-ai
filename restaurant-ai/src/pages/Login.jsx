import { useState } from 'react'
import { ChefHat, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react'
import { login, register } from '../api'

const ROLE_DESCRIPTIONS = {
  owner:   'Full access to everything',
  manager: 'All pages except Settings',
  staff:   'Orders + Menu view only',
  kitchen: 'Orders page only',
}

export default function Login({ onLogin }) {
  const [mode, setMode]       = useState('login')
  const [form, setForm]       = useState({ name: '', email: '', password: '', role: 'owner' })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  async function handleSubmit() {
    if (!form.email || !form.password) return
    setLoading(true)
    setError(null)
    try {
      const res = mode === 'login'
        ? await login({ email: form.email, password: form.password })
        : await register({ name: form.name, email: form.email, password: form.password, role: form.role })

      localStorage.setItem('token', res.data.access_token)
      localStorage.setItem('user',  JSON.stringify(res.data.user))
      onLogin(res.data.user)
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">

        {/* Logo */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500 rounded-2xl mb-4">
            <ChefHat size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">RestaurantAI</h1>
          <p className="text-gray-400 mt-2">Intelligence Platform</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 space-y-6">

          {/* Tabs */}
          <div className="flex bg-gray-800 rounded-xl p-1">
            {['login', 'register'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(null) }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition ${mode === m ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white'}`}>
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          {/* Fields */}
          <div className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Full Name</label>
                <input value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Rajesh Kumar"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-orange-500 transition" />
              </div>
            )}

            <div>
              <label className="text-gray-400 text-xs mb-1 block">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-3.5 text-gray-500" />
                <input value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="you@restaurant.com" type="email"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-orange-500 transition" />
              </div>
            </div>

            <div>
              <label className="text-gray-400 text-xs mb-1 block">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-3.5 text-gray-500" />
                <input value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="••••••••" type={showPwd ? 'text' : 'password'}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-orange-500 transition" />
                <button onClick={() => setShowPwd(p => !p)}
                  className="absolute right-3 top-3.5 text-gray-500 hover:text-gray-300">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Role selector — only on register */}
            {mode === 'register' && (
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Role</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(ROLE_DESCRIPTIONS).map(([role, desc]) => (
                    <button key={role} onClick={() => setForm(p => ({ ...p, role }))}
                      className={`text-left px-3 py-2.5 rounded-xl border transition ${
                        form.role === role
                          ? 'bg-orange-500/10 border-orange-500/40 text-white'
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                      }`}>
                      <p className="text-xs font-semibold capitalize">{role}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button onClick={handleSubmit} disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2">
            {loading
              ? <><Loader2 size={16} className="animate-spin" /> Please wait...</>
              : mode === 'login' ? 'Sign In' : 'Create Account'
            }
          </button>
        </div>

        {/* Role reference card — shown on register */}
        {mode === 'register' ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-2">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide">Role Access Guide</p>
            {Object.entries(ROLE_DESCRIPTIONS).map(([role, desc]) => (
              <div key={role} className="flex items-center justify-between">
                <span className="text-gray-300 text-xs capitalize font-medium">{role}</span>
                <span className="text-gray-500 text-xs">{desc}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
            <p className="text-gray-400 text-xs mb-2">First time?</p>
            <p className="text-gray-300 text-xs">Click Register and create your account to get started</p>
          </div>
        )}
      </div>
    </div>
  )
}