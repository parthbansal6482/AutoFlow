// apps/web/src/pages/Settings.tsx
import { motion } from 'framer-motion'
import { Settings as SettingsIcon, Globe, Cpu, Shield, Bell, Zap } from 'lucide-react'
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
    <div className="p-8 space-y-8 max-w-5xl mx-auto">
      {/* Header section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <SettingsIcon className="h-8 w-8 text-stitch-blue-accent" />
            System Settings
          </h1>
          <p className="text-zinc-400 mt-2">Manage your Stitch instance and orchestration engine.</p>
        </div>
        <Button className="bg-stitch-blue-accent hover:bg-blue-600 shadow-lg shadow-stitch-blue-accent/20">
          Save Changes
        </Button>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        {/* API & Webhooks */}
        <motion.div variants={itemVariants} className="group relative overflow-hidden rounded-3xl border border-white/5 bg-stitch-purple-800/20 p-6 backdrop-blur-md transition-all hover:bg-stitch-purple-800/30 hover:border-stitch-blue-accent/30 shadow-glass">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-stitch-blue-accent/10 rounded-xl">
              <Globe className="h-5 w-5 text-stitch-blue-accent" />
            </div>
            <h2 className="text-lg font-semibold text-white">API Configuration</h2>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Webhook Base URL</label>
              <div className="relative group/input">
                <input 
                  disabled
                  value="https://api.stitch.cloud/v1/webhook-receiver"
                  className="w-full bg-stitch-dark/50 border border-white/5 rounded-xl p-3 text-sm font-mono text-zinc-400 cursor-not-allowed"
                />
                <div className="absolute inset-0 bg-transparent" /> {/* Overlay to prevent interaction */}
              </div>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-white">Enable CORS</p>
                <p className="text-xs text-zinc-500">Allow cross-origin requests from specific domains.</p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </motion.div>

        {/* Execution Engine */}
        <motion.div variants={itemVariants} className="group relative overflow-hidden rounded-3xl border border-white/5 bg-stitch-purple-800/20 p-6 backdrop-blur-md transition-all hover:bg-stitch-purple-800/30 hover:border-stitch-blue-accent/30 shadow-glass">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-amber-500/10 rounded-xl">
              <Cpu className="h-5 w-5 text-amber-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Execution Engine</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-white/5 pb-4">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-white">Parallel Processing</p>
                <p className="text-xs text-zinc-500">Run multiple branch nodes simultaneously.</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="space-y-2 pt-2">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Concurrency Limit</label>
              <input 
                type="number"
                defaultValue={10}
                className="w-full bg-stitch-dark/50 border border-white/5 rounded-xl p-3 text-sm text-white focus:border-stitch-blue-accent/50 outline-none transition-all"
              />
            </div>
          </div>
        </motion.div>

        {/* Security */}
        <motion.div variants={itemVariants} className="group relative overflow-hidden rounded-3xl border border-white/5 bg-stitch-purple-800/20 p-6 backdrop-blur-md transition-all hover:bg-stitch-purple-800/30 hover:border-stitch-blue-accent/30 shadow-glass">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-500/10 rounded-xl">
              <Shield className="h-5 w-5 text-emerald-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Security & Auth</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-white">Two-Factor Authentication</p>
                <p className="text-xs text-zinc-500">Secure your account with an extra layer of protection.</p>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-white">Audit Logging</p>
                <p className="text-xs text-zinc-500">Record all system events for compliance tracking.</p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </motion.div>

        {/* Performance */}
        <motion.div variants={itemVariants} className="group relative overflow-hidden rounded-3xl border border-white/5 bg-stitch-purple-800/20 p-6 backdrop-blur-md transition-all hover:bg-stitch-purple-800/30 hover:border-stitch-blue-accent/30 shadow-glass">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-500/10 rounded-xl">
              <Zap className="h-5 w-5 text-purple-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Instance Optimization</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-white">Auto-Pruning</p>
                <p className="text-xs text-zinc-500">Automatically delete execution logs older than 30 days.</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-white">High Performance Mode</p>
                <p className="text-xs text-zinc-500">Prioritize CPU resources for active workflows.</p>
              </div>
              <Switch />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
