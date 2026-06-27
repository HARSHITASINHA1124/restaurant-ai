import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import Dashboard from './pages/Dashboard'
import Menu from './pages/Menu'
import Inventory from './pages/Inventory'
import Orders from './pages/Orders'
import Sales from './pages/Sales'
import Forecast from './pages/Forecast'
import Reviews from './pages/Reviews'
import Pricing from './pages/Pricing'
import Alerts from './pages/Alerts'
import Settings from './pages/Settings'
import Login from './pages/Login'
import { canAccess } from './permissions'
import { getProfile } from './api'

function ProtectedRoute({ user, path, children }) {
  if (!canAccess(user?.role, path)) return <Navigate to="/orders" replace/>
  return children
}

function AppLayout({ user, setUser, onLogout }) {
  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      <Sidebar user={user}/>
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar user={user} onLogout={onLogout}/>
        <main className="flex-1 overflow-y-auto p-6 bg-gray-950">
          <Routes>
            <Route path="/" element={
              <ProtectedRoute user={user} path="/"><Dashboard/></ProtectedRoute>
            }/>
            <Route path="/menu" element={
              <ProtectedRoute user={user} path="/menu"><Menu user={user}/></ProtectedRoute>
            }/>
            <Route path="/inventory" element={
              <ProtectedRoute user={user} path="/inventory"><Inventory/></ProtectedRoute>
            }/>
            <Route path="/orders" element={
              <ProtectedRoute user={user} path="/orders"><Orders/></ProtectedRoute>
            }/>
            <Route path="/sales" element={
              <ProtectedRoute user={user} path="/sales"><Sales/></ProtectedRoute>
            }/>
            <Route path="/forecast" element={
              <ProtectedRoute user={user} path="/forecast"><Forecast/></ProtectedRoute>
            }/>
            <Route path="/reviews" element={
              <ProtectedRoute user={user} path="/reviews"><Reviews/></ProtectedRoute>
            }/>
            <Route path="/pricing" element={
              <ProtectedRoute user={user} path="/pricing"><Pricing/></ProtectedRoute>
            }/>
            <Route path="/alerts" element={
              <ProtectedRoute user={user} path="/alerts"><Alerts/></ProtectedRoute>
            }/>
            <Route path="/settings" element={
              <ProtectedRoute user={user} path="/settings">
                <Settings user={user} setUser={setUser}/>
              </ProtectedRoute>
            }/>
            <Route path="*" element={<Navigate to="/orders" replace/>}/>
          </Routes>
        </main>
      </div>
    </div>
  )
}

function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user')
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })

  async function handleLogin(userData) {
    // Always fetch fresh profile from DB on login
    try {
      const res      = await getProfile(userData.id)
      const fullUser = { ...userData, ...res.data }
      localStorage.setItem('user', JSON.stringify(fullUser))
      setUser(fullUser)
    } catch {
      localStorage.setItem('user', JSON.stringify(userData))
      setUser(userData)
    }
  }

  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  if (!user) return <Login onLogin={handleLogin}/>

  return (
    <BrowserRouter>
      <AppLayout user={user} setUser={setUser} onLogout={handleLogout}/>
    </BrowserRouter>
  )
}

export default App