import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// apps/web/src/pages/Register.tsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
const registerSchema = z.object({
    fullName: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
});
export default function Register() {
    const navigate = useNavigate();
    const [authError, setAuthError] = useState(null);
    const { register, handleSubmit, formState: { errors, isSubmitting }, } = useForm({
        resolver: zodResolver(registerSchema),
    });
    const onSubmit = async (data) => {
        setAuthError(null);
        const { error } = await supabase.auth.signUp({
            email: data.email,
            password: data.password,
            options: {
                data: {
                    full_name: data.fullName,
                },
            },
        });
        if (error) {
            setAuthError(error.message);
            return;
        }
        // Usually signUp automatically logs them in if email confirmation is off,
        // but redirect to root anyway so App.tsx can handle the auth state change.
        navigate('/');
    };
    return (_jsx("div", { className: "flex min-h-screen items-center justify-center bg-[hsl(var(--background))] px-4 py-12 sm:px-6 lg:px-8", children: _jsxs("div", { className: "w-full max-w-md space-y-8 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.5)] p-8 shadow-sm", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-center text-3xl font-bold tracking-tight text-[hsl(var(--foreground))]", children: "Create an account" }), _jsxs("p", { className: "mt-2 text-center text-sm text-[hsl(var(--muted-foreground))]", children: ["Already have an account?", ' ', _jsx(Link, { to: "/login", className: "font-medium text-[hsl(var(--primary))] hover:text-[hsl(var(--primary)/0.8)]", children: "Sign in" })] })] }), _jsxs("form", { className: "mt-8 space-y-6", onSubmit: handleSubmit(onSubmit), children: [_jsxs("div", { className: "space-y-4", children: [_jsx(Input, { label: "Full Name", type: "text", autoComplete: "name", placeholder: "Jane Doe", ...register('fullName'), error: errors.fullName?.message }), _jsx(Input, { label: "Email address", type: "email", autoComplete: "email", placeholder: "you@example.com", ...register('email'), error: errors.email?.message }), _jsx(Input, { label: "Password", type: "password", autoComplete: "new-password", placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", ...register('password'), error: errors.password?.message })] }), authError && (_jsx("div", { className: "rounded-md bg-[hsl(var(--destructive)/0.1)] p-3 border border-[hsl(var(--destructive)/0.2)]", children: _jsx("p", { className: "text-sm text-[hsl(var(--destructive))]", children: authError }) })), _jsx("div", { children: _jsx(Button, { type: "submit", className: "w-full", isLoading: isSubmitting, children: "Register" }) })] })] }) }));
}
