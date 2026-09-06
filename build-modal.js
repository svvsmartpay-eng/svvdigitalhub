const fs = require('fs');
const file = 'apps/web/src/pages/super-admin/SuperAdminDashboard.tsx';
let code = `
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Shield, Server, Plus, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { Navigate } from 'react-router-dom';
import { useTenants, useCreateTenant, useUpdateTenant, useDeleteTenant } from '@/api/tenant.api';

export default function SuperAdminDashboard() {
  const { user } = useAuthStore();
  const { data: tenants, isLoading } = useTenants();
  const createMutation = useCreateTenant();
  const updateMutation = useUpdateTenant();
  const deleteMutation = useDeleteTenant();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    customDomain: '',
    themeColor: '#0D6EFD',
    modules: { print: true, tasks: true, assets: true, billing: false, reports: true }
  });

  if (user?.primaryRole !== 'SUPER_ADMIN' && !user?.roles?.includes('SUPER_ADMIN')) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleOpenModal = (tenant?: any) => {
    if (tenant) {
      setEditingTenant(tenant);
      setFormData({
        name: tenant.name || '',
        customDomain: tenant.customDomain || '',
        themeColor: tenant.themeColor || '#0D6EFD',
        modules: {
          print: tenant.isPrintHubEnabled ?? true,
          tasks: tenant.isTasksEnabled ?? true,
          assets: tenant.isAssetsEnabled ?? true,
          billing: tenant.isBillingEnabled ?? false,
          reports: tenant.isReportsEnabled ?? true,
        }
      });
    } else {
      setEditingTenant(null);
      setFormData({
        name: '', customDomain: '', themeColor: '#0D6EFD',
        modules: { print: true, tasks: true, assets: true, billing: false, reports: true }
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTenant) {
      await updateMutation.mutateAsync({ id: editingTenant.id, data: formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to permanently delete this tenant?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#081B3A] flex items-center gap-2">
            <Server className="w-6 h-6 text-[#0D6EFD]" /> Multi-Tenant SaaS Console
          </h1>
          <p className="text-[#6B7280] text-sm mt-1">Manage global organizations, modules, and subscriptions.</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="bg-[#0D6EFD] hover:bg-[#0b5ed7] text-white cursor-pointer">
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
              <h3 className="text-2xl font-bold text-[#081B3A]">{tenants?.filter((t: any) => t.subscription)?.length || 0}</h3>
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
            <table className="w-full text-left text-sm whitespace-nowrap">
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
                {isLoading ? (
                  <tr><td colSpan={6} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600"/></td></tr>
                ) : tenants?.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-[#6B7280]">No tenants found. Click "Add New Tenant" to get started.</td></tr>
                ) : tenants?.map((t: any) => (
                  <tr key={t.id} className="hover:bg-[#F8FAFC]">
                    <td className="py-3 px-4 font-bold text-[#081B3A]">{t.name}</td>
                    <td className="py-3 px-4 text-[#6B7280]">{t.customDomain || 'N/A'}</td>
                    <td className="py-3 px-4">
                      <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold">
                        {t.subscription?.plan?.name || 'Free'}
                      </span>
                    </td>
                    <td className="py-3 px-4 flex gap-1 flex-wrap">
                      {t.isPrintHubEnabled && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold">Print Hub</span>}
                      {t.isTasksEnabled && <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">Tasks</span>}
                      {t.isBillingEnabled && <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold">Billing</span>}
                    </td>
                    <td className="py-3 px-4">
                      {t.isActive !== false ? (
                        <span className="flex items-center gap-1 text-emerald-600 text-xs font-bold"><CheckCircle2 className="w-3.5 h-3.5"/> Active</span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-600 text-xs font-bold"><XCircle className="w-3.5 h-3.5"/> Suspended</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button onClick={() => handleOpenModal(t)} variant="outline" size="sm" className="h-8 text-xs font-semibold mr-2 cursor-pointer">Edit</Button>
                      <Button onClick={() => handleDelete(t.id)} variant="destructive" size="sm" className="h-8 text-xs font-semibold cursor-pointer">Delete</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* TENANT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-[#081B3A] mb-4">
              {editingTenant ? 'Edit Tenant' : 'Add New Tenant'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#081B3A] mb-1">Organization Name</label>
                <input 
                  type="text" required 
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm" placeholder="e.g. Acme Corp"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-[#081B3A] mb-1">Custom Domain (Optional)</label>
                <input 
                  type="text" 
                  value={formData.customDomain} onChange={e => setFormData({...formData, customDomain: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm" placeholder="e.g. portal.acmecorp.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#081B3A] mb-1">Brand Theme Color</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="color" 
                    value={formData.themeColor} onChange={e => setFormData({...formData, themeColor: e.target.value})}
                    className="w-10 h-10 rounded cursor-pointer border-0"
                  />
                  <span className="text-sm font-mono text-gray-500">{formData.themeColor}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#081B3A] mb-2">Enabled Modules</label>
                <div className="space-y-2">
                  {Object.entries(formData.modules).map(([mod, isEnabled]) => (
                    <label key={mod} className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={isEnabled} 
                        onChange={e => setFormData({
                          ...formData, 
                          modules: { ...formData.modules, [mod]: e.target.checked }
                        })}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                      <span className="text-sm font-medium capitalize">{mod}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t mt-4">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-[#0D6EFD] text-white" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Tenant'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
`;
fs.writeFileSync(file, code, 'utf8');
