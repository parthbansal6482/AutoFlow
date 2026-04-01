// apps/web/src/pages/Register.tsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form' 
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { UserPlus, GitBranch, Mail, ArrowRight, ShieldCheck } from 'lucide-react'
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

    navigate('/')
  }

  const handleSocialLogin = async (provider: 'github' | 'google') => {
    setAuthError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    })

    if (error) {
      setAuthError(error.message)
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background font-body flex items-center justify-center p-4">
      {/* Background Glows (Subtle, Monochromatic) */}
      <div className="absolute top-[-10%] right-[-10%] h-[40%] w-[40%] rounded-full bg-primary/5 blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[-10%] h-[40%] w-[40%] rounded-full bg-surface-variant/20 blur-[120px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[60%] w-[60%] rounded-full bg-primary/5 blur-[160px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative w-full max-w-md"
      >
        {/* Logo / Title Area */}
        <div className="text-center mb-10">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-surface-container-high mb-6 shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-outline-variant/30">
            <UserPlus className="h-8 w-8 text-primary" strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl font-semibold font-headline tracking-tighter text-on-surface">Create Account</h1>
          <p className="mt-3 text-on-surface-variant font-body tracking-wide">Join the next generation of automation</p>
        </div>

        {/* Main Card */}
        <div className="group relative overflow-hidden rounded-[2rem] bg-surface-container p-8 shadow-[0_24px_48px_rgba(0,0,0,0.4)] transition-all duration-500">
          
          <form onSubmit={handleSubmit(onSubmit)} className="relative space-y-7">
            <div className="space-y-6">
              <Input
                label="Full Name"
                type="text"
                placeholder="Jane Doe"
                {...register('fullName')}
                error={errors.fullName?.message}
              />

              <Input
                label="Email"
                type="email"
                placeholder="name@company.com"
                {...register('email')}
                error={errors.email?.message}
              />

              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
                error={errors.password?.message}
              />
            </div>

            <div className="flex items-center gap-2 px-1 pt-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <p className="text-[10px] text-on-surface-variant leading-tight">
                Passwords are encrypted using AES-256 and never stored in plain text.
              </p>
            </div>

            {authError && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl flex items-center justify-center p-3 text-sm font-medium text-error bg-error-container"
              >
                {authError}
              </motion.div>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold"
              isLoading={isSubmitting}
            >
              <span className="flex items-center justify-center gap-2">
                Register <ArrowRight className="h-4 w-4" />
              </span>
            </Button>

            {/* Divider */}
            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-outline-variant" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-surface-container px-4 text-on-surface-variant tracking-wider font-semibold">Secure Setup</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button 
                type="button" 
                onClick={() => handleSocialLogin('github')}
                className="flex items-center justify-center gap-2 rounded-full border border-outline-variant bg-transparent py-3 text-sm font-medium text-on-surface transition-all hover:bg-surface-container-highest active:scale-95"
              >
                <GitBranch className="h-4 w-4" /> GitHub
              </button>
              <button 
                type="button" 
                onClick={() => handleSocialLogin('google')}
                className="flex items-center justify-center gap-2 rounded-full border border-outline-variant bg-transparent py-3 text-sm font-medium text-on-surface transition-all hover:bg-surface-container-highest active:scale-95"
              >
                <Mail className="h-4 w-4" /> Google
              </button>
            </div>
          </form>
        </div>

        {/* Footer Link */}
        <p className="mt-10 text-center text-sm text-on-surface-variant font-medium">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold text-primary hover:text-primary-container transition-colors"
          >
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
