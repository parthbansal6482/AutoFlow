// apps/web/src/components/layout/DashboardLayout.tsx
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../features/auth/store/auth.store'
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
    <div className="flex h-screen w-full bg-surface text-on-surface overflow-hidden font-body">
      
      {/* Sidebar - Solid container */}
      <aside className="w-64 flex-shrink-0 bg-surface-container flex flex-col relative z-20">
        
        {/* Glow effect in sidebar (Subtle) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />

        {/* Logo area */}
        <div className="h-16 flex items-center px-6">
          <Link to="/" className="flex items-center gap-3 font-semibold font-headline tracking-tight text-on-surface group">
            <div className="relative flex items-center justify-center">
              <Hexagon className="text-primary fill-primary/10 transition-transform group-hover:scale-110" size={26} strokeWidth={2} />
              <div className="absolute w-2 h-2 bg-on-surface rounded-full shadow-[0_0_10px_var(--color-on-surface)]" />
            </div>
            AutoFlow
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-2 z-10">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || 
                             (item.path !== '/' && location.pathname.startsWith(item.path))
            const Icon = item.icon

            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? 'bg-surface-container-highest text-primary' 
                    : 'text-on-surface-variant hover:bg-surface-container-lowest hover:text-on-surface'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-primary' : 'text-on-surface-variant'} strokeWidth={isActive ? 2.5 : 2} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* User profile / Logout bottom pinned */}
        <div className="p-4 bg-surface z-10 mx-2 mb-2 rounded-[1.5rem]">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="h-9 w-9 rounded-[1rem] bg-surface-container-highest flex items-center justify-center text-xs font-bold text-primary">
              {initials}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-medium text-on-surface truncate">{fullName}</p>
              <p className="text-xs text-on-surface-variant truncate">{user?.email}</p>
            </div>
          </div>
          
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium text-on-surface-variant hover:bg-error-container hover:text-on-error-container rounded-md transition-colors"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto relative bg-background">
        <div className="relative z-10 h-full">
          <Outlet />
        </div>
      </main>

    </div>
  )
}
