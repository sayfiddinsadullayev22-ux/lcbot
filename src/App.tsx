import { useState, useEffect } from 'react';
import { Shield, Users, CheckCircle, ExternalLink, MessageSquare } from 'lucide-react';
import { motion } from 'motion/react';

export default function App() {
  const [status, setStatus] = useState<{ status: string; bot: string } | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setStatus(data))
      .catch(err => console.error('Failed to fetch health status:', err));
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-emerald-500/30">
      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
      </div>

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-12"
        >
          {/* Header */}
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium uppercase tracking-wider">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              System Online
            </div>
            <h1 className="text-6xl font-bold tracking-tight bg-gradient-to-br from-white to-white/50 bg-clip-text text-transparent">
              Telegram Referral <br /> Management System
            </h1>
            <p className="text-xl text-zinc-400 max-w-2xl leading-relaxed">
              A robust backend infrastructure for managing Telegram referrals, 
              verifying channel subscriptions, and handling user access to your platform.
            </p>
          </div>

          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div 
              whileHover={{ y: -4 }}
              className="p-8 rounded-3xl bg-zinc-900/50 border border-white/5 backdrop-blur-xl space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <Shield size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Bot Status</h3>
                <p className="text-zinc-400 text-sm">
                  {status ? `Bot is currently ${status.bot}. Connected to Telegram API.` : 'Checking bot status...'}
                </p>
              </div>
            </motion.div>

            <motion.div 
              whileHover={{ y: -4 }}
              className="p-8 rounded-3xl bg-zinc-900/50 border border-white/5 backdrop-blur-xl space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                <Users size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Referral Engine</h3>
                <p className="text-zinc-400 text-sm">
                  Referral tracking and verification system is active and monitoring events.
                </p>
              </div>
            </motion.div>
          </div>

          {/* Features List */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Core Capabilities</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: <CheckCircle size={18} />, text: "Automated Channel Subscription Check" },
                { icon: <MessageSquare size={18} />, text: "Interactive Telegram Menu System" },
                { icon: <Users size={18} />, text: "Referral Link Generation & Tracking" },
                { icon: <ExternalLink size={18} />, text: "Platform Access Verification" }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 text-zinc-300">
                  <span className="text-emerald-400">{item.icon}</span>
                  <span className="text-sm font-medium">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Info */}
          <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-zinc-500 text-sm">
            <p>© 2026 Telegram Bot Infrastructure. All rights reserved.</p>
            <div className="flex gap-8">
              <a href="https://t.me/BotFather" className="hover:text-white transition-colors">BotFather</a>
              <a href="https://railway.app" className="hover:text-white transition-colors">Railway Deployment</a>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
