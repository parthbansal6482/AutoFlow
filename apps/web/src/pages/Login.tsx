// apps/web/src/pages/Login.tsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { LogIn, GitBranch, Mail, ArrowRight } from 'lucide-react'
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
    <div className="relative min-h-screen w-full overflow-hidden bg-stitch-dark font-sans flex items-center justify-center p-4">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] h-[40%] w-[40%] rounded-full bg-stitch-blue-accent/20 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[40%] w-[40%] rounded-full bg-purple-600/10 blur-[120px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[60%] w-[60%] rounded-full bg-stitch-blue-accent/5 blur-[160px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative w-full max-w-md"
      >
        {/* Logo / Title Area */}
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-stitch-blue-accent to-blue-400 p-0.5 shadow-lg shadow-stitch-blue-accent/20 mb-4">
            <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-stitch-dark">
              <LogIn className="h-6 w-6 text-stitch-blue-accent" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Welcome back</h1>
          <p className="mt-2 text-zinc-400 italic">Access your automation engine</p>
        </div>

        {/* Main Card */}
        <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-stitch-purple-800/40 p-8 backdrop-blur-xl shadow-glass transition-all duration-500 hover:border-stitch-blue-accent/30">
          {/* Subtle line glow on hover */}
          <div className="absolute inset-0 bg-gradient-to-tr from-stitch-blue-accent/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          
          <form onSubmit={handleSubmit(onSubmit)} className="relative space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Input
                  label="Email"
                  type="email"
                  placeholder="name@company.com"
                  {...register('email')}
                  error={errors.email?.message}
                  className="bg-stitch-dark/50 border-white/5 focus:border-stitch-blue-accent/50 transition-all"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-zinc-400">Password</label>
                  <Link to="#" className="text-xs text-stitch-blue-accent hover:underline">Forgot?</Link>
                </div>
                <Input
                  type="password"
                  placeholder="••••••••"
                  {...register('password')}
                  error={errors.password?.message}
                  className="bg-stitch-dark/50 border-white/5 focus:border-stitch-blue-accent/50 transition-all"
                />
              </div>
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
                Sign in <ArrowRight className="h-4 w-4" />
              </span>
            </Button>

            {/* Divider */}
            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/5" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-transparent px-2 text-zinc-500">Or continue with</span>
              </div>
            </div>

            {/* Social Auth (Mock) */}
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
          Don&apos;t have an account?{' '}
          <Link
            to="/register"
            className="font-semibold text-stitch-blue-accent hover:text-blue-400 transition-colors"
          >
            Create one now
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
