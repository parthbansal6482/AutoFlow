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

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-stitch-dark font-sans flex items-center justify-center p-4">
      {/* Background Glows */}
      <div className="absolute top-[-10%] right-[-10%] h-[40%] w-[40%] rounded-full bg-stitch-blue-accent/20 blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[-10%] h-[40%] w-[40%] rounded-full bg-purple-600/10 blur-[120px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[60%] w-[60%] rounded-full bg-stitch-blue-accent/5 blur-[160px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative w-full max-w-md"
      >
        {/* Logo / Title Area */}
        <div className="text-center mb-6">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-stitch-blue-accent to-blue-400 p-0.5 shadow-lg shadow-stitch-blue-accent/20 mb-4">
            <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-stitch-dark">
              <UserPlus className="h-6 w-6 text-stitch-blue-accent" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Create Account</h1>
          <p className="mt-2 text-zinc-400 italic">Join the next generation of automation</p>
        </div>

        {/* Main Card */}
        <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-stitch-purple-800/40 p-8 backdrop-blur-xl shadow-glass transition-all duration-500 hover:border-stitch-blue-accent/30">
          {/* Subtle line glow on hover */}
          <div className="absolute inset-0 bg-gradient-to-tr from-stitch-blue-accent/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          
          <form onSubmit={handleSubmit(onSubmit)} className="relative space-y-5">
            <div className="space-y-4">
              <Input
                label="Full Name"
                type="text"
                placeholder="Jane Doe"
                {...register('fullName')}
                error={errors.fullName?.message}
                className="bg-stitch-dark/50 border-white/5 focus:border-stitch-blue-accent/50 transition-all"
              />

              <Input
                label="Email"
                type="email"
                placeholder="name@company.com"
                {...register('email')}
                error={errors.email?.message}
                className="bg-stitch-dark/50 border-white/5 focus:border-stitch-blue-accent/50 transition-all"
              />

              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
                error={errors.password?.message}
                className="bg-stitch-dark/50 border-white/5 focus:border-stitch-blue-accent/50 transition-all"
              />
            </div>

            <div className="flex items-center gap-2 px-1">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <p className="text-[10px] text-zinc-500 leading-tight">
                Passwords are encrypted using AES-256 and never stored in plain text.
              </p>
            </div>

            {authError && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl bg-red-500/10 p-3 border border-red-500/20"
              >
                <p className="text-sm text-red-400 text-center font-medium">
                  {authError}
                </p>
              </motion.div>
            )}

            <Button
              type="submit"
              className="w-full h-12 bg-stitch-blue-accent hover:bg-blue-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-stitch-blue-accent/20 active:scale-[0.98]"
              isLoading={isSubmitting}
            >
              <span className="flex items-center justify-center gap-2">
                Register <ArrowRight className="h-4 w-4" />
              </span>
            </Button>

            {/* Divider */}
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/5" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-stitch-purple-900/0 px-2 text-zinc-600">Secure Setup</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button type="button" className="flex items-center justify-center gap-2 rounded-xl border border-white/5 bg-stitch-dark/40 py-2.5 text-sm font-medium text-white transition-all hover:bg-white/5 active:scale-95">
                <GitBranch className="h-4 w-4" /> GitHub
              </button>
              <button type="button" className="flex items-center justify-center gap-2 rounded-xl border border-white/5 bg-stitch-dark/40 py-2.5 text-sm font-medium text-white transition-all hover:bg-white/5 active:scale-95">
                <Mail className="h-4 w-4" /> Google
              </button>
            </div>
          </form>
        </div>

        {/* Footer Link */}
        <p className="mt-8 text-center text-sm text-zinc-500">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold text-stitch-blue-accent hover:text-blue-400 transition-colors"
          >
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
