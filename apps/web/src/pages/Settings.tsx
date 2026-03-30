// apps/web/src/pages/Settings.tsx
import { motion } from 'framer-motion'
import { Settings as SettingsIcon, Globe, Cpu, Shield, Zap } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Switch } from '../components/ui/Switch'

export default function Settings() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  }

  return (
    <div className="p-8 space-y-10 max-w-5xl mx-auto font-body">
      {/* Header section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-semibold font-headline tracking-tighter text-on-surface flex items-center gap-3">
            <div className="p-2 bg-surface-container-highest rounded-xl text-primary">
              <SettingsIcon size={28} strokeWidth={2.5} />
            </div>
            System Settings
          </h1>
          <p className="text-on-surface-variant mt-2 tracking-wide font-medium">Manage your Stitch instance and orchestration engine.</p>
        </div>
        <Button className="px-6 font-semibold">
          Save Changes
        </Button>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 gap-8"
      >
        {/* API & Webhooks */}
        <motion.div variants={itemVariants} className="group relative overflow-hidden rounded-[2rem] bg-surface-container p-8 transition-all hover:bg-surface-container-high shadow-[0_12px_24px_rgba(0,0,0,0.3)] hover:shadow-[0_24px_48px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <Globe className="h-6 w-6 text-primary" strokeWidth={2} />
            </div>
            <h2 className="text-xl font-semibold font-headline text-on-surface">API Configuration</h2>
          </div>
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Webhook Base URL</label>
              <div className="relative group/input">
                <input 
                  disabled
                  value="https://api.stitch.cloud/v1/webhook-receiver"
                  className="w-full bg-surface-container-lowest border border-outline rounded-xl p-4 text-sm font-mono text-on-surface-variant cursor-not-allowed"
                />
                <div className="absolute inset-0 bg-transparent" /> {/* Overlay to prevent interaction */}
              </div>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="space-y-1">
                <p className="text-base font-semibold text-on-surface">Enable CORS</p>
                <p className="text-sm text-on-surface-variant">Allow cross-origin requests from specific domains.</p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </motion.div>

        {/* Execution Engine */}
        <motion.div variants={itemVariants} className="group relative overflow-hidden rounded-[2rem] bg-surface-container p-8 transition-all hover:bg-surface-container-high shadow-[0_12px_24px_rgba(0,0,0,0.3)] hover:shadow-[0_24px_48px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-amber-500/10 rounded-2xl">
              <Cpu className="h-6 w-6 text-amber-500" strokeWidth={2} />
            </div>
            <h2 className="text-xl font-semibold font-headline text-on-surface">Execution Engine</h2>
          </div>
          <div className="space-y-6">
            <div className="flex items-center justify-between py-2 border-b border-outline-variant pb-6">
              <div className="space-y-1">
                <p className="text-base font-semibold text-on-surface">Parallel Processing</p>
                <p className="text-sm text-on-surface-variant">Run multiple branch nodes simultaneously.</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="space-y-3 pt-2">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Concurrency Limit</label>
              <input 
                type="number"
                defaultValue={10}
                className="w-full bg-surface-container-lowest border-b-2 border-outline-variant hover:bg-surface-container-highest focus:bg-surface-container-lowest focus:border-primary rounded-t-xl rounded-b-none p-4 text-base font-semibold text-on-surface outline-none transition-all"
              />
            </div>
          </div>
        </motion.div>

        {/* Security */}
        <motion.div variants={itemVariants} className="group relative overflow-hidden rounded-[2rem] bg-surface-container p-8 transition-all hover:bg-surface-container-high shadow-[0_12px_24px_rgba(0,0,0,0.3)] hover:shadow-[0_24px_48px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-emerald-500/10 rounded-2xl">
              <Shield className="h-6 w-6 text-emerald-500" strokeWidth={2} />
            </div>
            <h2 className="text-xl font-semibold font-headline text-on-surface">Security & Auth</h2>
          </div>
          <div className="space-y-6">
            <div className="flex items-center justify-between py-2">
              <div className="space-y-1">
                <p className="text-base font-semibold text-on-surface">Two-Factor Authentication</p>
                <p className="text-sm text-on-surface-variant">Secure your account with an extra layer of protection.</p>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="space-y-1">
                <p className="text-base font-semibold text-on-surface">Audit Logging</p>
                <p className="text-sm text-on-surface-variant">Record all system events for compliance tracking.</p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </motion.div>

        {/* Performance */}
        <motion.div variants={itemVariants} className="group relative overflow-hidden rounded-[2rem] bg-surface-container p-8 transition-all hover:bg-surface-container-high shadow-[0_12px_24px_rgba(0,0,0,0.3)] hover:shadow-[0_24px_48px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-indigo-500/10 rounded-2xl">
              <Zap className="h-6 w-6 text-indigo-500" strokeWidth={2} />
            </div>
            <h2 className="text-xl font-semibold font-headline text-on-surface">Instance Optimization</h2>
          </div>
          <div className="space-y-6">
            <div className="flex items-center justify-between py-2">
              <div className="space-y-1">
                <p className="text-base font-semibold text-on-surface">Auto-Pruning</p>
                <p className="text-sm text-on-surface-variant">Automatically delete execution logs older than 30 days.</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="space-y-1">
                <p className="text-base font-semibold text-on-surface">High Performance Mode</p>
                <p className="text-sm text-on-surface-variant">Prioritize CPU resources for active workflows.</p>
              </div>
              <Switch />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
