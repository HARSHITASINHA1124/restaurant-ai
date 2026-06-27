import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, UtensilsCrossed, Package,
  ShoppingCart, BarChart2, Brain, Star,
  Tag, Bell, Settings, ChefHat
} from 'lucide-react'
import { canAccess, ROLE_PERMISSIONS } from '../permissions'

const ALL_NAV_ITEMS = [
  { label: 'Dashboard',   icon: LayoutDashboard, path: '/'          },
  { label: 'Menu',        icon: UtensilsCrossed, path: '/menu'       },
  { label: 'Inventory',   icon: Package,         path: '/inventory'  },
  { label: 'Orders',      icon: ShoppingCart,    path: '/orders'     },
  { label: 'Sales',       icon: BarChart2,       path: '/sales'      },
  { label: 'AI Forecast', icon: Brain,           path: '/forecast'   },
  { label: 'Reviews',     icon: Star,            path: '/reviews'    },
  { label: 'Pricing',     icon: Tag,             path: '/pricing'    },
  { label: 'Alerts',      icon: Bell,            path: '/alerts'     },
  { label: 'Settings',    icon: Settings,        path: '/settings'   },
]

export default function Sidebar({ user }) {
  const role     = user?.role || 'staff'
  const perms    = ROLE_PERMISSIONS[role]
  const navItems = ALL_NAV_ITEMS.filter(item => canAccess(role, item.path))

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-800">
        <div className="bg-orange-500 p-2 rounded-xl">
          <ChefHat size={22} className="text-white"/>
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-tight">
            {user?.restaurant_name || 'RestaurantAI'}
          </p>
          <p className="text-gray-400 text-xs">Intelligence Platform</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ label, icon: Icon, path }) => (
          <NavLink key={path} to={path} end={path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`
            }>
            <Icon size={18}/>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Role badge + user */}
      <div className="px-4 py-4 border-t border-gray-800 space-y-3">
        <div className={`text-xs font-semibold px-3 py-1.5 rounded-lg border text-center ${perms?.color}`}>
          {perms?.label} Access
        </div>

        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-800">
          <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>

          <div>
            <p className="text-white text-xs font-semibold">{user?.name || 'User'}</p>
            <p className="text-gray-400 text-xs capitalize">{role}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}