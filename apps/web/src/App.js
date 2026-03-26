import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// apps/web/src/App.tsx
import { useEffect } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { useAuthStore } from './store/auth.store';
import { DashboardLayout } from './components/layout/DashboardLayout';
import Workflows from './pages/Workflows';
import Credentials from './pages/Credentials';
import Executions from './pages/Executions';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Register from './pages/Register';
// Placeholder for future task
function EditorPage() {
    return _jsx("div", { className: "p-8 text-2xl font-medium", children: "Editor \u2014 coming soon" });
}
// Protected route wrapper
function RequireAuth() {
    const { user, isLoading } = useAuthStore();
    if (isLoading) {
        return (_jsx("div", { className: "flex min-h-screen items-center justify-center bg-[hsl(var(--background))]", children: _jsx("div", { className: "h-8 w-8 animate-spin rounded-full border-4 border-[hsl(var(--primary))] border-t-transparent" }) }));
    }
    if (!user) {
        return _jsx(Navigate, { to: "/login", replace: true });
    }
    return _jsx(Outlet, {});
}
// Redirect authenticated users away from login/register
function RequireGuest() {
    const { user, isLoading } = useAuthStore();
    if (isLoading) {
        return (_jsx("div", { className: "flex min-h-screen items-center justify-center bg-[hsl(var(--background))]", children: _jsx("div", { className: "h-8 w-8 animate-spin rounded-full border-4 border-[hsl(var(--primary))] border-t-transparent" }) }));
    }
    if (user) {
        return _jsx(Navigate, { to: "/", replace: true });
    }
    return _jsx(Outlet, {});
}
export default function App() {
    const { setUser, setLoading } = useAuthStore();
    // Set up auth state listener on mount
    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });
        // Listen for auth changes (login, logout, token refresh)
        const { data: { subscription }, } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });
        return () => subscription.unsubscribe();
    }, [setUser, setLoading]);
    return (_jsxs(Routes, { children: [_jsxs(Route, { element: _jsx(RequireGuest, {}), children: [_jsx(Route, { path: "/login", element: _jsx(Login, {}) }), _jsx(Route, { path: "/register", element: _jsx(Register, {}) })] }), _jsxs(Route, { element: _jsx(RequireAuth, {}), children: [_jsxs(Route, { element: _jsx(DashboardLayout, {}), children: [_jsx(Route, { path: "/", element: _jsx(Workflows, {}) }), _jsx(Route, { path: "/credentials", element: _jsx(Credentials, {}) }), _jsx(Route, { path: "/executions", element: _jsx(Executions, {}) }), _jsx(Route, { path: "/settings", element: _jsx(Settings, {}) })] }), _jsx(Route, { path: "/workflow/:id", element: _jsx(EditorPage, {}) })] })] }));
}
