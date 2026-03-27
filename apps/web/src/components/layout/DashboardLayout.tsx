// apps/web/src/components/layout/DashboardLayout.tsx
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/auth.store'
import { supabase } from '../../lib/supabase'
import { Workflow, Key, Activity, Settings, LogOut, Hexagon } from 'lucide-react'

export function DashboardLayout() {
  const { user } = useAuthStore()
  const location = useLocation()

  // Ensure user metadata exists
  const fullName = user?.user_metadata?.full_name || 'User'
  const initials = fullName.slice(0, 2).toUpperCase()

  const navItems = [
    { name: 'Workflows', path: '/', icon: Workflow },
    { name: 'Credentials', path: '/credentials', icon: Key },
    { name: 'Executions', path: '/executions', icon: Activity },
    { name: 'Settings', path: '/settings', icon: Settings },
  ]

  const handleSignOut = () => {
    supabase.auth.signOut()
  }

  return (
    <div className="flex h-screen w-full bg-stitch-dark text-gray-200 overflow-hidden font-sans">
      
      {/* Sidebar - glassmorphism Stitch aesthetic */}
      <aside className="w-64 flex-shrink-0 border-r border-white/5 bg-stitch-purple-900/80 backdrop-blur-xl flex flex-col relative z-20">
        {/* Glow effect in sidebar */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-stitch-blue-accent/10 rounded-full blur-[80px] pointer-events-none" />

        {/* Logo area */}
        <div className="h-16 flex items-center px-6 border-b border-white/5">
          <Link to="/" className="flex items-center gap-3 font-semibold text-lg tracking-tight text-white group">
            <div className="relative flex items-center justify-center">
              <Hexagon className="text-stitch-blue-accent fill-stitch-blue-accent/20 transition-transform group-hover:scale-110" size={26} strokeWidth={2} />
              <div className="absolute w-2 h-2 bg-white rounded-full shadow-[0_0_10px_#fff]" />
            </div>
            AutoFlow
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-1 z-10">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || 
                             (item.path !== '/' && location.pathname.startsWith(item.path))
            const Icon = item.icon

            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? 'bg-stitch-blue-accent/15 text-white shadow-[inset_3px_0_0_0_#2b6ef5]' 
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-stitch-blue-accent' : 'text-gray-500'} strokeWidth={isActive ? 2.5 : 2} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* User profile / Logout bottom pinned */}
        <div className="p-4 border-t border-white/5 bg-white/[0.02] z-10">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-stitch-blue-accent to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-stitch-blue-accent/20 ring-2 ring-white/10">
              {initials}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-medium text-white truncate">{fullName}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium text-gray-400 hover:bg-red-500/10 hover:text-red-400 rounded-md transition-colors"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto relative bg-stitch-dark">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-stitch-purple-800/20 via-stitch-dark to-stitch-dark pointer-events-none" />
        <div className="relative z-10 h-full">
          <Outlet />
        </div>
      </main>

    </div>
  )
}
