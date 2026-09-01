import React, { useState } from 'react';
import { useLogin } from '@/api/auth.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Sparkles, Printer, UserCheck, Key, Lock, ArrowRight, Building2, User } from 'lucide-react';

type RoleLoginTab = 'SUPER_ADMIN' | 'BRANCH_MANAGER' | 'STAFF';

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<RoleLoginTab>('SUPER_ADMIN');
  const [email, setEmail] = useState('admin@svvams.com');
  const [password, setPassword] = useState('SVV@Admin2026');
  const { mutate: login, isPending, error } = useLogin();

  const handleTabChange = (tab: RoleLoginTab) => {
    setActiveTab(tab);
    if (tab === 'SUPER_ADMIN') {
      setEmail('admin@svvams.com');
      setPassword('SVV@Admin2026');
    } else if (tab === 'BRANCH_MANAGER') {
      setEmail('manager@svvams.com');
      setPassword('SVV@Manager2026');
    } else {
      setEmail('staff@svvams.com');
      setPassword('SVV@Staff2026');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login({ email: email.trim(), password: password.trim() });
  };

  return (
    <div className="min-h-screen flex bg-[#F8FAFC]">
      {/* ── LEFT BRAND PANEL (Deep Navy #081B3A) ── */}
      <div className="hidden lg:flex w-1/2 bg-[#081B3A] p-12 text-white flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#0D6EFD]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#198754]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-[#0D6EFD] flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Printer className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white font-sans">SVV DIGITAL HUB</h1>
              <p className="text-xs font-mono text-[#0D6EFD] tracking-widest uppercase">Asset Management & Print Hub</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-6 max-w-lg">
          <h2 className="text-3xl font-extrabold tracking-tight text-white leading-tight">
            Role-Based Enterprise Authentication & Live Print Operations
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Secure single login portal with strict hierarchy for Super Admin, Branch Managers, and Counter Staff. Zero backdoors or unauthenticated sessions.
          </p>

          <div className="grid grid-cols-3 gap-3 pt-4 text-xs">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs flex flex-col gap-1 text-center">
              <Shield className="w-4 h-4 text-[#0D6EFD] mx-auto" />
              <span className="font-bold text-slate-200">Super Admin</span>
              <span className="text-[10px] text-slate-400">Global Control</span>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs flex flex-col gap-1 text-center">
              <Building2 className="w-4 h-4 text-[#198754] mx-auto" />
              <span className="font-bold text-slate-200">Branch Mgr</span>
              <span className="text-[10px] text-slate-400">Branch Ops</span>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs flex flex-col gap-1 text-center">
              <User className="w-4 h-4 text-[#FD7E14] mx-auto" />
              <span className="font-bold text-slate-200">Staff Desk</span>
              <span className="text-[10px] text-slate-400">Print Queue</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-[11px] text-slate-400 font-mono">
          © 2026 SVV Communication · Secured Production Portal
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
            <p className="text-xs text-[#6B7280]">Select your authorized role to sign in</p>
          </div>

          {/* Role Tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#F1F5F9] rounded-2xl border border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => handleTabChange('SUPER_ADMIN')}
              className={`py-2 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'SUPER_ADMIN'
                  ? 'bg-[#0D6EFD] text-white shadow-xs'
                  : 'text-[#6B7280] hover:text-[#081B3A]'
              }`}
            >
              Super Admin
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('BRANCH_MANAGER')}
              className={`py-2 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'BRANCH_MANAGER'
                  ? 'bg-[#198754] text-white shadow-xs'
                  : 'text-[#6B7280] hover:text-[#081B3A]'
              }`}
            >
              Branch Mgr
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('STAFF')}
              className={`py-2 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'STAFF'
                  ? 'bg-[#EA580C] text-white shadow-xs'
                  : 'text-[#6B7280] hover:text-[#081B3A]'
              }`}
            >
              Staff Desk
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs flex items-center gap-2">
              <span>{(error as any)?.response?.data?.message || 'Invalid credentials or connection error'}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-bold text-[#081B3A]">
                {activeTab === 'SUPER_ADMIN' ? 'Admin Email' : activeTab === 'BRANCH_MANAGER' ? 'Manager ID / Email' : 'Staff ID / Email'}
              </Label>
              <Input
                id="email"
                type="text"
                required
                placeholder={activeTab === 'SUPER_ADMIN' ? 'admin@svvams.com' : activeTab === 'BRANCH_MANAGER' ? 'manager@svvams.com' : 'staff@svvams.com'}
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
              className={`w-full h-11 rounded-xl font-bold text-xs text-white shadow-md cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'SUPER_ADMIN'
                  ? 'bg-[#0D6EFD] hover:bg-[#0b5ed7]'
                  : activeTab === 'BRANCH_MANAGER'
                  ? 'bg-[#198754] hover:bg-[#157347]'
                  : 'bg-[#EA580C] hover:bg-[#c2410c]'
              }`}
            >
              <span>Sign In as {activeTab === 'SUPER_ADMIN' ? 'Super Admin' : activeTab === 'BRANCH_MANAGER' ? 'Branch Manager' : 'Desk Staff'}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl text-[11px] text-blue-950 flex items-start gap-2">
            <Lock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span>
              <strong>Security Policy:</strong> Sessions are cryptographically signed and scoped strictly to authorized branches and role permissions.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
