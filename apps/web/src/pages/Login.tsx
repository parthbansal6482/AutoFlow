// apps/web/src/pages/Login.tsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function Login() {
  const navigate = useNavigate()
  const [authError, setAuthError] = useState<string | null>(null)
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormValues) => {
    setAuthError(null)
    
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      setAuthError(error.message)
      return
    }

    navigate('/')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))] px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.5)] p-8 shadow-sm">
        <div>
          <h2 className="text-center text-3xl font-bold tracking-tight text-[hsl(var(--foreground))]">
            Sign in to AutoFlow
          </h2>
          <p className="mt-2 text-center text-sm text-[hsl(var(--muted-foreground))]">
            Or{' '}
            <Link
              to="/register"
              className="font-medium text-[hsl(var(--primary))] hover:text-[hsl(var(--primary)/0.8)]"
            >
              create a new account
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <Input
              label="Email address"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              {...register('email')}
              error={errors.email?.message}
            />

            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              {...register('password')}
              error={errors.password?.message}
            />
          </div>

          {authError && (
            <div className="rounded-md bg-[hsl(var(--destructive)/0.1)] p-3 border border-[hsl(var(--destructive)/0.2)]">
              <p className="text-sm text-[hsl(var(--destructive))]">
                {authError}
              </p>
            </div>
          )}

          <div>
            <Button
              type="submit"
              className="w-full"
              isLoading={isSubmitting}
            >
              Sign in
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
