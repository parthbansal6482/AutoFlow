// apps/web/src/pages/Register.tsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form' 
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

const registerSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type RegisterFormValues = z.infer<typeof registerSchema>

export default function Register() {
  const navigate = useNavigate()
  const [authError, setAuthError] = useState<string | null>(null)
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterFormValues) => {
    setAuthError(null)
    
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
        },
      },
    })

    if (error) {
      setAuthError(error.message)
      return
    }

    // Usually signUp automatically logs them in if email confirmation is off,
    // but redirect to root anyway so App.tsx can handle the auth state change.
    navigate('/')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))] px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.5)] p-8 shadow-sm">
        <div>
          <h2 className="text-center text-3xl font-bold tracking-tight text-[hsl(var(--foreground))]">
            Create an account
          </h2>
          <p className="mt-2 text-center text-sm text-[hsl(var(--muted-foreground))]">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-medium text-[hsl(var(--primary))] hover:text-[hsl(var(--primary)/0.8)]"
            >
              Sign in
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <Input
              label="Full Name"
              type="text"
              autoComplete="name"
              placeholder="Jane Doe"
              {...register('fullName')}
              error={errors.fullName?.message}
            />

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
              autoComplete="new-password"
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
              Register
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
