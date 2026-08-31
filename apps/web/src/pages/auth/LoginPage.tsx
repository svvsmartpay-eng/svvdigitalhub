import React, { useState } from 'react';
import { useLogin } from '@/api/auth.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Sparkles, Printer, UserCheck, Key, Lock, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@svvams.com');
  const [password, setPassword] = useState('password123');
  const { mutate: login, isPending, error } = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login({ email: email || 'admin@svvams.com', password: password || 'password123' });
  };

  const handleQuickLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password123');
    login({ email: demoEmail, password: 'password123' });
  };

  return (
    <div className="min-h-screen flex bg-[#F8FAFC]">
      {/* ── LEFT BRAND PANEL (Deep Navy #081B3A) ── */}
      <div className="hidden lg:flex w-1/2 bg-[#081B3A] p-12 text-white flex-col justify-between relative overflow-hidden">
        {/* Background ambient gradient glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#0D6EFD]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#198754]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-[#0D6EFD] flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Printer className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white font-sans">SVV DIGITAL HUB</h1>
              <p className="text-xs font-mono text-[#0D6EFD] tracking-widest uppercase">Print & Asset Management System</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-6 max-w-lg">
          <h2 className="text-3xl font-extrabold tracking-tight text-white leading-tight">
            High-Speed Print Queue, WhatsApp Live Hub & Smart Studio
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Manage live tokens, multi-document cropping, genuine Word & multi-page PDF previews, and instant direct printing with complete workflow efficiency.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-4 text-xs">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#198754] animate-pulse" />
              <span className="font-semibold text-slate-200">WhatsApp Live Sync</span>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0D6EFD]" />
              <span className="font-semibold text-slate-200">Continuous PDF & DOCX</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-[11px] text-slate-400 font-mono">
          © 2026 SVV Communication. All rights reserved.
        </div>
      </div>

      {/* ── RIGHT FORM PANEL ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md bg-[#FFFFFF] p-8 md:p-10 rounded-3xl shadow-xl border border-[#CBD5E1] space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex lg:hidden w-12 h-12 rounded-2xl bg-[#0D6EFD] items-center justify-center shadow-md mb-2">
              <Printer className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-black text-[#081B3A]">Sign In to Portal</h2>
            <p className="text-xs text-[#6B7280]">Enter credentials or use 1-click demo access below</p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs flex items-center gap-2">
              <span>{(error as any)?.response?.data?.message || 'Login failed, using client session'}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-bold text-[#081B3A]">Email Address</Label>
              <Input
                id="email"
                type="email"
                required
                placeholder="admin@svvams.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 rounded-xl bg-[#F8FAFC] border-[#CBD5E1] text-xs focus:ring-2 focus:ring-[#0D6EFD]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-bold text-[#081B3A]">Password</Label>
              <Input
                id="password"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 rounded-xl bg-[#F8FAFC] border-[#CBD5E1] text-xs focus:ring-2 focus:ring-[#0D6EFD]"
              />
            </div>

            <Button
              type="submit"
              loading={isPending}
              className="w-full h-11 rounded-xl bg-[#0D6EFD] hover:bg-[#0b5ed7] text-white font-bold text-xs shadow-md shadow-blue-500/20 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          {/* ── 1-CLICK DEMO ACCESS BAR ── */}
          <div className="pt-4 border-t border-[#E2E8F0] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#FD7E14]" /> Quick 1-Click Access:
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@svvams.com')}
                disabled={isPending}
                className="p-2 rounded-xl bg-[#E7F1FF] hover:bg-[#DBEAFE] text-[#0D6EFD] border border-[#BFDBFE] text-center cursor-pointer transition-colors shadow-2xs"
              >
                <span className="text-xs font-bold block truncate">Super Admin</span>
                <span className="text-[9px] text-[#6B7280] font-mono block">All Modules</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('manager@svvams.com')}
                disabled={isPending}
                className="p-2 rounded-xl bg-[#F0FDF4] hover:bg-[#DCFCE7] text-[#198754] border border-[#BBF7D0] text-center cursor-pointer transition-colors shadow-2xs"
              >
                <span className="text-xs font-bold block truncate">Manager</span>
                <span className="text-[9px] text-[#6B7280] font-mono block">Branch Ops</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('staff@svvams.com')}
                disabled={isPending}
                className="p-2 rounded-xl bg-[#FFF7ED] hover:bg-[#FFEDD5] text-[#EA580C] border border-[#FED7AA] text-center cursor-pointer transition-colors shadow-2xs"
              >
                <span className="text-xs font-bold block truncate">Staff Desk</span>
                <span className="text-[9px] text-[#6B7280] font-mono block">Print & Edit</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
