import { useEffect, useState } from 'react'
import { getAllUsers, updateUserRole, toggleUserActive, getProfile, updateProfile, exportData, resetOrders } from '../api'
import { useSettings } from '../SettingsContext'
import {
  Settings as SettingsIcon, Bell, Shield,
  Database, Palette, Save, ChefHat, CheckCircle,
  Users, Loader2, Download, AlertTriangle
} from 'lucide-react'

function Toggle({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)}
      className={`w-11 h-6 rounded-full transition-colors ${value ? 'bg-orange-500' : 'bg-gray-700'} relative`}>
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`}/>
    </button>
  )
}

function Section({ icon: Icon, title, subtitle, children }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800">
        <div className="p-2 bg-orange-500/10 rounded-xl">
          <Icon size={16} className="text-orange-400"/>
        </div>
        <div>
          <p className="text-white font-semibold">{title}</p>
          {subtitle && <p className="text-gray-500 text-xs mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  )
}

function Field({ label, sub, children }) {
  return (
    <div className="flex items-center justify-between py-1">
      <div>
        <p className="text-white text-sm font-medium">{label}</p>
        {sub && <p className="text-gray-500 text-xs mt-0.5">{sub}</p>}
      </div>
      {children}
    </div>
  )
}

export default function Settings({ user, setUser }) {
  const { preferences, notifications, thresholds, saveAll } = useSettings()

  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [saveError, setSaveError] = useState(null)

  const [localPrefs, setLocalPrefs]   = useState(preferences)
  const [localNotifs, setLocalNotifs] = useState(notifications)
  const [localThresh, setLocalThresh] = useState(thresholds)

  const [profile, setProfile] = useState({
    restaurantName: '',
    ownerName:      '',
    email:          '',
    phone:          '',
    address:        '',
    gst:            '',
  })

  const [users, setUsers]                   = useState([])
  const [loadingUsers, setLoadingUsers]     = useState(false)
  const [exporting, setExporting]           = useState(false)
  const [resetting, setResetting]           = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [toast, setToast]                   = useState(null)

  // ── Load profile from DB ──
  useEffect(() => {
    if (!user?.id) return
    getProfile(user.id).then(res => {
      setProfile({
        restaurantName: res.data.restaurant_name || '',
        ownerName:      res.data.name            || '',
        email:          res.data.email           || '',
        phone:          res.data.phone           || '',
        address:        res.data.address         || '',
        gst:            res.data.gst             || '',
      })
    }).catch(console.error)
  }, [user?.id])

  // ── Load users (owner only) ──
  useEffect(() => {
    if (user?.role !== 'owner') return
    setLoadingUsers(true)
    getAllUsers()
      .then(res => setUsers(res.data))
      .catch(console.error)
      .finally(() => setLoadingUsers(false))
  }, [user?.role])

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // ── Save everything ──
  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      // Save profile to DB
      const res = await updateProfile(user.id, {
        name:            profile.ownerName,
        restaurant_name: profile.restaurantName,
        phone:           profile.phone,
        address:         profile.address,
        gst:             profile.gst,
      })

      // Update user in localStorage + state so topbar reflects immediately
      const updatedUser = {
        ...user,
        name:            res.data.name,
        restaurant_name: res.data.restaurant_name,
        phone:           res.data.phone,
        address:         res.data.address,
        gst:             res.data.gst,
      }
      localStorage.setItem('user', JSON.stringify(updatedUser))
      setUser(updatedUser)

      // Save preferences to context + localStorage
      saveAll(localPrefs, localNotifs, localThresh)

      setSaved(true)
      showToast('✅ All settings saved successfully!')
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setSaveError('Failed to save. Please try again.')
      showToast('❌ Failed to save settings', 'error')
    }
    setSaving(false)
  }

  // ── Export real data ──
  async function handleExport() {
    setExporting(true)
    try {
      const res  = await exportData()
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `restaurant-backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      showToast('✅ Data exported successfully!')
    } catch { showToast('❌ Export failed', 'error') }
    setExporting(false)
  }

  // ── Reset orders ──
  async function handleReset() {
    setResetting(true)
    try {
      await resetOrders()
      setShowResetConfirm(false)
      showToast('✅ All orders cleared from database!')
    } catch { showToast('❌ Reset failed', 'error') }
    setResetting(false)
  }

  async function handleRoleChange(id, role) {
    try {
      await updateUserRole(id, role)
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u))
      showToast('✅ Role updated!')
    } catch { showToast('❌ Failed to update role', 'error') }
  }

  async function handleToggleActive(id) {
    try {
      await toggleUserActive(id)
      setUsers(prev => prev.map(u => u.id === id ? { ...u, is_active: !u.is_active } : u))
    } catch { showToast('❌ Failed to update status', 'error') }
  }

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-xl transition ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
          {toast.msg}
        </div>
      )}

      {/* Reset Confirm Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-red-500/30 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-xl">
                <AlertTriangle size={20} className="text-red-400"/>
              </div>
              <p className="text-white font-bold">Confirm Reset</p>
            </div>
            <p className="text-gray-400 text-sm">This will permanently delete all orders from PostgreSQL. Menu, inventory and reviews will NOT be affected. This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-gray-800 text-gray-400 text-sm font-medium hover:bg-gray-700 transition">
                Cancel
              </button>
              <button onClick={handleReset} disabled={resetting}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white text-sm font-semibold transition flex items-center justify-center gap-2">
                {resetting ? <><Loader2 size={14} className="animate-spin"/> Resetting...</> : 'Yes, Reset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <SettingsIcon size={22} className="text-orange-400"/> Settings
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Signed in as <span className="text-orange-400 font-medium">{user?.name}</span>
            <span className={`ml-2 text-xs px-2 py-0.5 rounded-lg border capitalize ${
              user?.role === 'owner'   ? 'text-orange-400 bg-orange-500/10 border-orange-500/20' :
              user?.role === 'manager' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' :
              'text-green-400 bg-green-500/10 border-green-500/20'
            }`}>{user?.role}</span>
          </p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition">
          {saving
            ? <><Loader2 size={15} className="animate-spin"/> Saving to DB...</>
            : saved
            ? <><CheckCircle size={15}/> Saved!</>
            : <><Save size={15}/> Save Changes</>}
        </button>
      </div>

      {saveError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl">
          {saveError}
        </div>
      )}

      {/* Restaurant Profile */}
      <Section icon={ChefHat} title="Restaurant Profile" subtitle="Saved to PostgreSQL database">
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Restaurant Name', key: 'restaurantName', placeholder: 'e.g. Spice Garden' },
            { label: 'Owner Name',      key: 'ownerName',      placeholder: 'Your full name'     },
            { label: 'Email',           key: 'email',          placeholder: 'your@email.com'     },
            { label: 'Phone',           key: 'phone',          placeholder: '+91 98765 43210'    },
            { label: 'GST Number',      key: 'gst',            placeholder: '06ABCDE1234F1Z5'    },
          ].map(f => (
            <div key={f.key}>
              <label className="text-gray-400 text-xs mb-1 block">{f.label}</label>
              <input
                value={profile[f.key]}
                onChange={e => setProfile(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                disabled={f.key === 'email'}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          ))}
          <div className="col-span-2">
            <label className="text-gray-400 text-xs mb-1 block">Address</label>
            <input value={profile.address}
              onChange={e => setProfile(p => ({ ...p, address: e.target.value }))}
              placeholder="Restaurant address"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500 transition"/>
          </div>
        </div>
      </Section>

      {/* Notifications */}
      <Section icon={Bell} title="Notification Preferences" subtitle="Saved locally — controls what alerts are shown">
        {[
          { key: 'lowStock',        label: 'Low Stock Alerts',       sub: 'Show alerts when ingredients fall below minimum stock' },
          { key: 'expiryAlerts',    label: 'Expiry Alerts',          sub: 'Show alerts when ingredients are about to expire'      },
          { key: 'dailyReport',     label: 'Daily Summary Banner',   sub: 'Show daily revenue summary on the dashboard'          },
          { key: 'orderUpdates',    label: 'Order Status Updates',   sub: 'Show toast when order status changes'                  },
          { key: 'aiInsights',      label: 'AI Insights Panel',      sub: 'Show AI insights section on Sales page'               },
          { key: 'weeklyAnalytics', label: 'Weekly Analytics Badge', sub: 'Show weekly comparison badges on Dashboard'            },
        ].map(n => (
          <Field key={n.key} label={n.label} sub={n.sub}>
            <Toggle
              value={localNotifs[n.key]}
              onChange={v => setLocalNotifs(p => ({ ...p, [n.key]: v }))}
            />
          </Field>
        ))}
      </Section>

      {/* AI Thresholds */}
      <Section icon={Database} title="AI & Alert Thresholds" subtitle="Saved locally — affects forecast and alert sensitivity">
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Low Stock Warning (days)',  key: 'lowStockDays',   sub: 'Days of stock remaining to trigger a warning'  },
            { label: 'Expiry Warning (days)',     key: 'expiryWarnDays', sub: 'Days before expiry to show a warning'          },
            { label: 'Minimum Margin (%)',        key: 'minMarginPct',   sub: 'AI pricing will not go below this margin'      },
            { label: 'Reorder Buffer (×)',        key: 'reorderBuffer',  sub: 'Multiplier over min stock when recommending'   },
          ].map(f => (
            <div key={f.key}>
              <label className="text-gray-400 text-xs mb-1 block">{f.label}</label>
              <p className="text-gray-500 text-xs mb-1">{f.sub}</p>
              <input type="number" value={localThresh[f.key]}
                onChange={e => setLocalThresh(p => ({ ...p, [f.key]: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500 transition"/>
            </div>
          ))}
        </div>
      </Section>

      {/* Preferences */}
      <Section icon={Palette} title="App Preferences" subtitle="Saved locally — changes apply immediately across the app">
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Currency',    key: 'currency',   options: ['₹ INR', '$ USD', '€ EUR']                      },
            { label: 'Timezone',    key: 'timezone',   options: ['Asia/Kolkata', 'UTC', 'America/New_York']        },
            { label: 'Date Format', key: 'dateFormat', options: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']         },
            { label: 'Language',    key: 'language',   options: ['English', 'Hindi']                              },
          ].map(f => (
            <div key={f.key}>
              <label className="text-gray-400 text-xs mb-1 block">{f.label}</label>
              <select value={localPrefs[f.key]}
                onChange={e => setLocalPrefs(p => ({ ...p, [f.key]: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500 transition">
                {f.options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </div>
        {/* Live preview */}
        <div className="mt-2 bg-gray-800 rounded-xl p-3 flex gap-6 text-xs text-gray-400">
          <span>Currency preview: <span className="text-white font-semibold">{localPrefs.currency.split(' ')[0]}1,234</span></span>
          <span>Date preview: <span className="text-white font-semibold">
            {localPrefs.dateFormat === 'DD/MM/YYYY' ? '10/06/2026'
              : localPrefs.dateFormat === 'MM/DD/YYYY' ? '06/10/2026'
              : '2026-06-10'}
          </span></span>
        </div>
      </Section>

      {/* User Management */}
      {user?.role === 'owner' && (
        <Section icon={Users} title="User Management" subtitle="Role changes save to database instantly">
          {loadingUsers ? (
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <Loader2 size={14} className="animate-spin"/> Loading users...
            </div>
          ) : users.length === 0 ? (
            <p className="text-gray-600 text-sm">No users yet. Have team members register with their role.</p>
          ) : (
            <div className="space-y-3">
              {users.map(u => (
                <div key={u.id} className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${u.id === user.id ? 'bg-orange-500' : 'bg-gray-600'}`}>
                      {u.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-white text-sm font-medium">{u.name}</p>
                        {u.id === user.id && (
                          <span className="text-xs text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded">You</span>
                        )}
                      </div>
                      <p className="text-gray-400 text-xs">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <select value={u.role}
                      onChange={e => handleRoleChange(u.id, e.target.value)}
                      disabled={u.id === user.id}
                      className="bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-orange-500 disabled:opacity-50">
                      <option value="owner">Owner</option>
                      <option value="manager">Manager</option>
                      <option value="staff">Staff</option>
                      <option value="kitchen">Kitchen</option>
                    </select>
                    <button onClick={() => handleToggleActive(u.id)}
                      disabled={u.id === user.id}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition disabled:opacity-50 ${
                        u.is_active
                          ? 'text-green-400 bg-green-500/10 border-green-500/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20'
                          : 'text-red-400 bg-red-500/10 border-red-500/20 hover:bg-green-500/10 hover:text-green-400 hover:border-green-500/20'
                      }`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* Danger Zone */}
      <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5 space-y-4">
        <p className="text-red-400 font-semibold flex items-center gap-2">
          <Shield size={16}/> Danger Zone
        </p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white text-sm font-medium">Reset All Orders</p>
            <p className="text-gray-500 text-xs">Permanently deletes all orders from PostgreSQL. Menu and inventory are unaffected.</p>
          </div>
          <button onClick={() => setShowResetConfirm(true)}
            className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-4 py-2 rounded-xl transition">
            Reset Orders
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white text-sm font-medium">Export All Data</p>
            <p className="text-gray-500 text-xs">Downloads menu, inventory, orders and reviews as a dated JSON backup.</p>
          </div>
          <button onClick={handleExport} disabled={exporting}
            className="flex items-center gap-2 text-xs bg-gray-800 hover:bg-gray-700 disabled:opacity-60 text-gray-300 border border-gray-700 px-4 py-2 rounded-xl transition">
            {exporting
              ? <><Loader2 size={12} className="animate-spin"/> Exporting...</>
              : <><Download size={12}/> Export JSON</>}
          </button>
        </div>
      </div>

    </div>
  )
}