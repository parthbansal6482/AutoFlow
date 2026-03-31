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

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const [, payload] = token.split('.')
    if (!payload) return null
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const normalized = base64.padEnd(base64.length + (4 - (base64.length % 4 || 4)) % 4, '=')
    return JSON.parse(atob(normalized)) as Record<string, unknown>
  } catch {
    return null
  }
}

function isSessionFromCurrentProject(accessToken: string | undefined, supabaseUrl: string): boolean {
  if (!accessToken) return false
  const payload = decodeJwtPayload(accessToken)
  const issuer = typeof payload?.iss === 'string' ? payload.iss : ''
  if (!issuer) return false

  const parsedUrl = new URL(supabaseUrl)
  const host = parsedUrl.host
  const isHostedProject = host.endsWith('.supabase.co')

  if (!isHostedProject) {
    // Local Supabase JWT issuer may be either "supabase-demo" (older/default anon tokens)
    // or "http://127.0.0.1:54321/auth/v1" style values.
    const localIssuerPrefix = `${parsedUrl.origin}/auth/v1`
    return issuer.includes('supabase-demo') || issuer.startsWith(localIssuerPrefix)
  }

  const projectRef = host.split('.')[0]
  return issuer.includes(`https://${projectRef}.supabase.co/auth/v1`)
}

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
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string

  // Set up auth state listener on mount
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.access_token && !isSessionFromCurrentProject(session.access_token, supabaseUrl)) {
        await supabase.auth.signOut()
        setUser(null)
        setLoading(false)
        return
      }

      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.access_token && !isSessionFromCurrentProject(session.access_token, supabaseUrl)) {
        await supabase.auth.signOut()
        setUser(null)
        setLoading(false)
        return
      }

      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [setUser, setLoading, supabaseUrl])

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
