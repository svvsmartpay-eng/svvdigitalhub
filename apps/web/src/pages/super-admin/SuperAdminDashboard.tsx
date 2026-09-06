
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Shield, Settings, Server, Plus, CheckCircle2, XCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { Navigate } from 'react-router-dom';
import { useTenants, useCreateTenant, useUpdateTenant } from '@/api/tenant.api';
import { Loader2 } from 'lucide-react';

export default function SuperAdminDashboard() {
  const { user } = useAuthStore();

  if (user?.primaryRole !== 'SUPER_ADMIN' && !user?.roles?.includes('SUPER_ADMIN')) {
    return <Navigate to="/dashboard" replace />;
  }

  const { data: tenants, isLoading } = useTenants();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#081B3A] flex items-center gap-2">
            <Server className="w-6 h-6 text-[#0D6EFD]" /> Multi-Tenant SaaS Console
          </h1>
          <p className="text-[#6B7280] text-sm mt-1">Manage global organizations, modules, and subscriptions.</p>
        </div>
        <Button className="bg-[#0D6EFD] hover:bg-[#0b5ed7] text-white">
          <Plus className="w-4 h-4 mr-2" /> Add New Tenant
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-[#6B7280] font-semibold">Active Tenants</p>
              <h3 className="text-2xl font-bold text-[#081B3A]">{tenants?.length || 0}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-[#6B7280] font-semibold">Active Subscriptions</p>
              <h3 className="text-2xl font-bold text-[#081B3A]">{tenants?.length || 0}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Organizations (Tenants)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8FAFC] border-y border-[#E2E8F0]">
                <tr>
                  <th className="py-3 px-4 font-semibold text-[#081B3A]">Tenant Name</th>
                  <th className="py-3 px-4 font-semibold text-[#081B3A]">Custom Domain</th>
                  <th className="py-3 px-4 font-semibold text-[#081B3A]">Plan</th>
                  <th className="py-3 px-4 font-semibold text-[#081B3A]">Enabled Modules</th>
                  <th className="py-3 px-4 font-semibold text-[#081B3A]">Status</th>
                  <th className="py-3 px-4 text-right font-semibold text-[#081B3A]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {isLoading ? (<tr><td colSpan={6} className="text-center py-4"><Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-600"/></td></tr>) : tenants?.map((t: any) => (
                  <tr key={t.id} className="hover:bg-[#F8FAFC]">
                    <td className="py-3 px-4 font-bold text-[#081B3A]">{t.name}</td>
                    <td className="py-3 px-4 text-[#6B7280]">{t.customDomain || 'N/A'}</td>
                    <td className="py-3 px-4">
                      <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold">{t.subscription?.plan?.name || 'Free'}</span>
                    </td>
                    <td className="py-3 px-4 flex gap-1">
                      {t.isPrintHubEnabled && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold">Print Hub</span>}
                      {t.isTasksEnabled && <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">Tasks</span>}
                      {t.isBillingEnabled && <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold">Billing</span>}
                    </td>
                    <td className="py-3 px-4">
                      {t.isActive ? (
                        <span className="flex items-center gap-1 text-emerald-600 text-xs font-bold"><CheckCircle2 className="w-3.5 h-3.5"/> Active</span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-600 text-xs font-bold"><XCircle className="w-3.5 h-3.5"/> Suspended</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button variant="outline" size="sm" className="h-8 text-xs font-semibold">Manage</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
