// apps/web/src/components/layout/DashboardLayout.tsx
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/auth.store'
import { supabase } from '../../lib/supabase'

export function DashboardLayout() {
  const { user } = useAuthStore()
  const location = useLocation()

  // Ensure user metadata exists
  const fullName = user?.user_metadata?.full_name || 'User'
  const initials = fullName.slice(0, 2).toUpperCase()

  const navItems = [
    { name: 'Workflows', path: '/', icon: 'workflow' },
    { name: 'Credentials', path: '/credentials', icon: 'key' },
    { name: 'Executions', path: '/executions', icon: 'activity' },
    { name: 'Settings', path: '/settings', icon: 'settings' },
  ]

  const handleSignOut = () => {
    supabase.auth.signOut()
  }

  return (
    <div className="flex h-screen w-full bg-[hsl(var(--background))] overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.3)] flex flex-col">
        {/* Logo area */}
        <div className="h-16 flex items-center px-6 border-b border-[hsl(var(--border))]">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg tracking-tight text-[hsl(var(--foreground))]">
            <div className="h-6 w-6 rounded bg-[hsl(var(--primary))] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-[hsl(var(--primary-foreground))]">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            </div>
            AutoFlow
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || 
                             (item.path !== '/' && location.pathname.startsWith(item.path))

            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]' 
                    : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]'
                }`}
              >
                {/* Minimal icons (placeholders) */}
                <div className="h-4 w-4 opacity-70">
                  {item.icon === 'workflow' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" y1="9" x2="6" y2="21"/></svg>}
                  {item.icon === 'key' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>}
                  {item.icon === 'activity' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
                  {item.icon === 'settings' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>}
                </div>
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* User profile / Logout bottom pinned */}
        <div className="p-4 border-t border-[hsl(var(--border))]">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="h-8 w-8 rounded-full bg-[hsl(var(--primary)/0.2)] text-[hsl(var(--primary))] flex items-center justify-center text-xs font-bold">
              {initials}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate">{fullName}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">{user?.email}</p>
            </div>
          </div>
          
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--destructive)/0.1)] hover:text-[hsl(var(--destructive))] rounded-md transition-colors"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Outlet />
      </main>

    </div>
  )
}
