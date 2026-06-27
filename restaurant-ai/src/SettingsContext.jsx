import { createContext, useContext, useEffect, useState } from 'react'

const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  const [preferences, setPreferences] = useState(() => {
    try {
      const saved = localStorage.getItem('preferences')
      return saved ? JSON.parse(saved) : {
        currency:   '₹ INR',
        timezone:   'Asia/Kolkata',
        dateFormat: 'DD/MM/YYYY',
        language:   'English',
      }
    } catch { return { currency: '₹ INR', timezone: 'Asia/Kolkata', dateFormat: 'DD/MM/YYYY', language: 'English' } }
  })

  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('notifications')
      return saved ? JSON.parse(saved) : {
        lowStock: true, expiryAlerts: true, dailyReport: true,
        orderUpdates: true, aiInsights: true, weeklyAnalytics: false,
      }
    } catch { return { lowStock: true, expiryAlerts: true, dailyReport: true, orderUpdates: true, aiInsights: true, weeklyAnalytics: false } }
  })

  const [thresholds, setThresholds] = useState(() => {
    try {
      const saved = localStorage.getItem('thresholds')
      return saved ? JSON.parse(saved) : { lowStockDays: 3, expiryWarnDays: 2, minMarginPct: 35, reorderBuffer: 1.5 }
    } catch { return { lowStockDays: 3, expiryWarnDays: 2, minMarginPct: 35, reorderBuffer: 1.5 } }
  })

  function saveAll(prefs, notifs, thresh) {
    localStorage.setItem('preferences',  JSON.stringify(prefs))
    localStorage.setItem('notifications', JSON.stringify(notifs))
    localStorage.setItem('thresholds',    JSON.stringify(thresh))
    setPreferences(prefs)
    setNotifications(notifs)
    setThresholds(thresh)
  }

  // Currency symbol helper
  const currencySymbol = preferences.currency.split(' ')[0]

  // Format date based on preference
  function formatDate(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    if (isNaN(d)) return dateStr
    const dd = String(d.getDate()).padStart(2, '0')
    const mm  = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    if (preferences.dateFormat === 'MM/DD/YYYY') return `${mm}/${dd}/${yyyy}`
    if (preferences.dateFormat === 'YYYY-MM-DD') return `${yyyy}-${mm}-${dd}`
    return `${dd}/${mm}/${yyyy}`
  }

  return (
    <SettingsContext.Provider value={{
      preferences, notifications, thresholds,
      currencySymbol, formatDate, saveAll,
      setPreferences, setNotifications, setThresholds,
    }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  return useContext(SettingsContext)
}