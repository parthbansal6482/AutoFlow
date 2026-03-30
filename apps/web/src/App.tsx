// apps/web/src/App.tsx
import { useEffect } from 'react'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { useAuthStore } from './store/auth.store'

import { DashboardLayout } from './components/layout/DashboardLayout'
import Workflows from './pages/Workflows'
import Credentials from './pages/Credentials'
import Executions from './pages/Executions'
import Settings from './pages/Settings'
import Login from './pages/Login'
import Register from './pages/Register'
import Editor from './pages/Editor'

// Custom n8n-clone Editor
function EditorPage() {
  return <Editor />
}

// Protected route wrapper
function RequireAuth() {
  const { user, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[hsl(var(--primary))] border-t-transparent" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

// Redirect authenticated users away from login/register
function RequireGuest() {
  const { user, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[hsl(var(--primary))] border-t-transparent" />
      </div>
    )
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

export default function App() {
  const { setUser, setLoading } = useAuthStore()

  // Set up auth state listener on mount
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [setUser, setLoading])

  return (
    <Routes>
      {/* Public / Guest Routes */}
      <Route element={<RequireGuest />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* Protected Routes — inside DashboardLayout */}
      <Route element={<RequireAuth />}>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<Workflows />} />
          <Route path="/credentials" element={<Credentials />} />
          <Route path="/executions" element={<Executions />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        
        {/* Editor works outside the layout (fullscreen) */}
        <Route path="/workflow/:id" element={<EditorPage />} />
      </Route>
    </Routes>
  )
}
