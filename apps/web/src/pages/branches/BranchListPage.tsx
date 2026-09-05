import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { apiClient } from '@/lib/api';
import { useCurrentUser } from '@/api/auth.api';
import { useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import WhatsAppGatewayModal from '@/components/shared/WhatsAppGatewayModal';
import {
  Building2, Plus, Phone, MapPin, Smartphone, Users, Box,
  Printer, CheckCircle2, AlertCircle, Edit3, Trash2, Search,
  X, RefreshCw
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface BranchItem {
  id: string;
  name: string;
  code: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  whatsappNumber?: string;
  managerName?: string;
  status?: string;
  sessionStatus?: string;
  lastSeen?: string;
  connectedAt?: string;
  createdAt?: string;
  staffCount?: number;
  assetsCount?: number;
  ordersCount?: number;
}

export default function BranchListPage() {
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedBranchForWhatsApp, setSelectedBranchForWhatsApp] = useState<string | null>(null);
  
  // Modal Form State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingBranch, setEditingBranch] = useState<BranchItem | null>(null);
  const [formName, setFormName] = useState<string>('');
  const [formCode, setFormCode] = useState<string>('');
  const [formAddress, setFormAddress] = useState<string>('');
  const [formCity, setFormCity] = useState<string>('Hyderabad');
  const [formState, setFormState] = useState<string>('Telangana');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formWhatsApp, setFormWhatsApp] = useState<string>('');
  const [formManager, setFormManager] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadBranches = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('branches')
        .select(`
          *,
          whatsapp:branch_whatsapp_configs(status, whatsappNumber),
          sessions:whatsapp_sessions(status, connectedAt, lastSeen),
          users:user_branches(count),
          assets:assets(count),
          orders:print_orders(count)
        `)
        .eq('isActive', true)
        .order('createdAt', { ascending: true });

      if (error) throw error;

      if (data) {
        const enriched: BranchItem[] = data.map((b: any) => ({
          id: b.id,
          name: b.name,
          code: b.code,
          address: b.address,
          city: b.city,
          state: b.state,
          phone: b.phone,
          email: b.email,
          whatsappNumber: b.whatsapp?.[0]?.whatsappNumber || b.whatsappNumber || '',
          sessionStatus: (() => {
            // Supabase returns sessions as object (not array) for 1-to-1 UNIQUE relations
            const sess = Array.isArray(b.sessions) ? b.sessions?.[0] : b.sessions;
            const cfgStatus = b.whatsapp?.[0]?.status;
            return (sess?.status === 'CONNECTED' || cfgStatus === 'CONNECTED') ? 'CONNECTED' : 'DISCONNECTED';
          })(),
          lastSeen: (() => { const s = Array.isArray(b.sessions) ? b.sessions?.[0] : b.sessions; return s?.lastSeen || null; })(),
          connectedAt: (() => { const s = Array.isArray(b.sessions) ? b.sessions?.[0] : b.sessions; return s?.connectedAt || null; })(),
          managerName: b.managerId || '', // Just a string for now
          staffCount: b.users?.[0]?.count || 0,
          assetsCount: b.assets?.[0]?.count || 0,
          ordersCount: b.orders?.[0]?.count || 0,
          status: 'ACTIVE'
        }));
        setBranches(enriched);
      }
    } catch (err: any) {
      console.error('Failed to load branches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  const handleOpenCreate = () => {
    setEditingBranch(null);
    setFormName('');
    setFormCode('');
    setFormAddress('');
    setFormCity('Hyderabad');
    setFormState('Telangana');
    setFormPhone('');
    setFormEmail('');
    setFormWhatsApp('');
    setFormManager('');
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (b: BranchItem) => {
    setEditingBranch(b);
    setFormName(b.name);
    setFormCode(b.code);
    setFormAddress(b.address || '');
    setFormCity(b.city || 'Hyderabad');
    setFormState(b.state || 'Telangana');
    setFormPhone(b.phone || '');
    setFormEmail(b.email || '');
    setFormWhatsApp(b.whatsappNumber || '');
    setFormManager(b.managerName || '');
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formCode) {
      setErrorMsg('Branch Name and Code are required.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    const now = new Date().toISOString();
    const branchId = editingBranch?.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `branch-${Date.now()}`);
    const orgId = (currentUser?.organizationId === 'org-1' ? 'svv-org-001' : currentUser?.organizationId) || 'svv-org-001';

    const payload: any = {
      id: branchId,
      organizationId: orgId,
      name: formName.trim(),
      code: formCode.toUpperCase().trim(),
      address: formAddress.trim(),
      city: formCity.trim(),
      state: formState.trim(),
      phone: formPhone.trim() || null,
      email: formEmail.trim() || null,
      managerId: formManager.trim() || null,
      isActive: true,
      updatedAt: now,
    };

    if (!editingBranch) {
      payload.createdAt = now;
    }

    try {
      const { error: branchError } = await supabase.from('branches').upsert(payload, { onConflict: 'id' });
      if (branchError) throw new Error(`Failed to save branch: ${branchError.message}`);

      if (formWhatsApp.trim()) {
        // Fetch existing config to get ID
        const { data: existingWa } = await supabase.from('branch_whatsapp_configs').select('id').eq('branchId', branchId).single();
        
        const waPayload = {
          id: existingWa?.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `wa-${Date.now()}`),
          branchId,
          organizationId: orgId,
          whatsappNumber: formWhatsApp.trim(),
          displayName: `${formName} (${formCode})`,
          updatedAt: now,
        };

        const { error: waError } = await supabase.from('branch_whatsapp_configs').upsert(waPayload, { onConflict: 'branchId' });
        if (waError) throw new Error(`Failed to save WhatsApp Number: ${waError.message}`);
      }

      // Verification Step:
      const { data: verifyBranch, error: verifyError } = await supabase.from('branches').select('name').eq('id', branchId).single();
      if (verifyError || !verifyBranch) {
         throw new Error('Verification failed: Could not read back the saved branch from the database.');
      }

      await loadBranches();
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      
      setIsModalOpen(false);
      alert('Branch updated successfully in database.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Database connection error.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBranch = async (branchId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete branch "${name}"? This will remove the branch from operations.`)) return;
    
    try {
      const { error } = await supabase.from('branches').update({ isActive: false }).eq('id', branchId);
      if (error) throw error;
      
      await loadBranches();
      queryClient.invalidateQueries({ queryKey: ['branches'] });
    } catch (err: any) {
      alert('Failed to delete branch: ' + err.message);
    }
  };

  const filtered = branches.filter(b => 
    b.name?.toLowerCase().includes(search.toLowerCase()) ||
    b.code?.toLowerCase().includes(search.toLowerCase()) ||
    b.city?.toLowerCase().includes(search.toLowerCase()) ||
    b.whatsappNumber?.includes(search)
  );

  return (
    <div className="space-y-6 pb-12 font-sans">
      <PageHeader
        title="Branch Operations & Multi-Desk Management"
        subtitle="Configure physical centers, operational desks, linked WhatsApp business numbers, and assigned personnel."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadBranches}
              disabled={loading}
              className="text-xs font-semibold h-9 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button
              size="sm"
              onClick={handleOpenCreate}
              className="bg-[#081B3A] hover:bg-[#0f2952] text-white text-xs font-bold h-9 px-4 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Add New Branch
            </Button>
          </div>
        }
      />

      
      {/* Temporary Diagnostics Panel (Step 9) */}
      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl mb-4 shadow-sm">
        <h4 className="font-bold text-yellow-800 text-xs mb-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> DEBUG: WhatsApp Session Status (Admin Only)
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[10px] text-gray-700">
            <thead>
              <tr className="border-b border-yellow-200">
                <th className="pb-1 font-bold">Branch ID</th>
                <th className="pb-1 font-bold">Name</th>
                <th className="pb-1 font-bold">Configured WA #</th>
                <th className="pb-1 font-bold">Session State</th>
                <th className="pb-1 font-bold">Last Sync (Seen)</th>
              </tr>
            </thead>
            <tbody>
              {branches.map(b => (
                <tr key={'debug-'+b.id} className="border-b border-yellow-100/50">
                  <td className="py-1 font-mono text-gray-500">{b.id.substring(0,8)}...</td>
                  <td className="py-1">{b.name}</td>
                  <td className="py-1 font-mono">{b.whatsappNumber || <span className="text-red-400 italic">Missing</span>}</td>
                  <td className="py-1">
                    <span className={`px-1.5 py-0.5 rounded ${b.sessionStatus === 'CONNECTED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {b.sessionStatus || 'NONE'}
                    </span>
                  </td>
                  <td className="py-1 font-mono text-gray-500">{b.lastSeen ? new Date(b.lastSeen).toLocaleString() : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex flex-col justify-center">
          <div className="text-gray-500 text-xs font-bold uppercase mb-1 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" /> Active Branches
          </div>
          <div className="text-2xl font-black text-[#081B3A]">{branches.length}</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex flex-col justify-center">
          <div className="text-gray-500 text-xs font-bold uppercase mb-1 flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5" /> WhatsApp Desks
          </div>
          <div className="text-2xl font-black text-[#081B3A]">
            {branches.filter(b => b.whatsappNumber).length}
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex flex-col justify-center">
          <div className="text-gray-500 text-xs font-bold uppercase mb-1 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> Total Staff
          </div>
          <div className="text-2xl font-black text-[#081B3A]">
            {branches.reduce((sum, b) => sum + (b.staffCount || 0), 0)}
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex flex-col justify-center">
          <div className="text-gray-500 text-xs font-bold uppercase mb-1 flex items-center gap-1.5">
            <Box className="w-3.5 h-3.5" /> Total Assets
          </div>
          <div className="text-2xl font-black text-[#081B3A]">
            {branches.reduce((sum, b) => sum + (b.assetsCount || 0), 0)}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-xs flex items-center">
        <div className="pl-3 pr-2 text-gray-400"><Search className="w-4 h-4" /></div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search branches by name, code, city, or phone..."
          className="flex-1 bg-transparent border-none focus:outline-none text-sm py-2 px-1"
        />
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-gray-300 p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">No Branches Found</h3>
          <p className="text-gray-500 text-sm max-w-sm mx-auto mb-6">
            There are no branches matching your criteria. Create a new branch to assign staff and assets.
          </p>
          <Button onClick={handleOpenCreate} className="bg-[#081B3A] hover:bg-[#0f2952] text-white font-bold rounded-xl h-11 px-6 cursor-pointer shadow-md">
            <Plus className="w-4 h-4 mr-2" /> Set Up First Branch
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filtered.map(b => (
            <div key={b.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col">
              {/* Card Header */}
              <div className="p-5 border-b border-gray-50 flex items-start justify-between bg-gradient-to-r from-gray-50/50 to-white">
                <div className="flex gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 shadow-inner">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-gray-900 mb-0.5">{b.name}</h3>
                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                      <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-md">{b.code}</span>
                      <span className="flex items-center"><MapPin className="w-3 h-3 mr-0.5" /> {b.city || 'Hyderabad'}, {b.state || 'TS'}</span>
                    </div>
                  </div>
                </div>
                

                <div className="flex flex-col items-end gap-1">
                  {b.whatsappNumber ? (
                    b.sessionStatus === 'CONNECTED' ? (
                      <>
                        <div className="bg-green-50 text-green-700 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 uppercase tracking-wider border border-green-200">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                          WhatsApp Connected
                        </div>
                        {b.lastSeen && <span className="text-[9px] text-gray-400 font-medium">Last seen: {new Date(b.lastSeen).toLocaleTimeString()}</span>}
                      </>
                    ) : (
                      <div className="bg-amber-50 text-amber-700 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 uppercase tracking-wider border border-amber-200">
                        WhatsApp Disconnected
                      </div>
                    )
                  ) : (
                    <div className="bg-gray-100 text-gray-500 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 uppercase tracking-wider border border-gray-200">
                      Not Configured
                    </div>
                  )}
                </div>

              </div>

              {/* Card Body (Stats & Info) */}
              <div className="p-5 flex-1">
                {b.address && (
                  <p className="text-xs text-gray-500 mb-4 line-clamp-2 leading-relaxed">{b.address}</p>
                )}
                
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Staff</div>
                    <div className="text-lg font-black text-gray-800">{b.staffCount || 0}</div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Assets</div>
                    <div className="text-lg font-black text-gray-800">{b.assetsCount || 0}</div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Orders</div>
                    <div className="text-lg font-black text-gray-800">{b.ordersCount || 0}</div>
                  </div>
                </div>

                {(b.phone || b.email) && (
                  <div className="flex items-center gap-4 text-xs font-semibold text-gray-600 mb-3 bg-gray-50/50 p-2 rounded-lg">
                    {b.phone ? <span>?? {b.phone}</span> : <span className="text-gray-400 italic">No Mobile Number Configured</span>}
                    {b.email ? <span>?? {b.email}</span> : <span className="text-gray-400 italic">No Email Configured</span>}
                  </div>
                )}
              </div>

              {/* Card Footer (Actions) */}
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
                
                {b.whatsappNumber ? (
                  b.sessionStatus === 'CONNECTED' ? (
                    <div className="flex-1 bg-green-100 text-green-800 font-mono font-bold text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-2 border border-green-200">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      {b.whatsappNumber}
                    </div>
                  ) : (
                    <div className="flex-1 flex gap-2">
                      <div className="flex-1 bg-amber-50 text-amber-800 font-mono font-bold text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 border border-amber-200">
                        <Smartphone className="w-3.5 h-3.5" />
                        {b.whatsappNumber}
                      </div>
                      <button 
                        onClick={() => setSelectedBranchForWhatsApp(b.id)}
                        className="bg-[#081B3A] hover:bg-[#0f2952] text-white text-xs font-bold py-2 px-4 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Scan QR
                      </button>
                    </div>
                  )
                ) : (
                  <div className="flex-1 bg-gray-50 text-gray-400 font-mono font-bold text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 border border-gray-200">
                    <Smartphone className="w-3.5 h-3.5" />
                    Configure WA First
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 pt-1">
                  <Link
                    to={`/print-hub/qr`}
                    className="flex-1 text-center py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5 text-gray-600" />
                    <span>Desk QR</span>
                  </Link>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenEdit(b)}
                    className="text-xs font-bold text-gray-700 h-9 px-3 rounded-xl cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteBranch(b.id, b.name)}
                    className="text-xs font-bold text-red-600 hover:bg-red-50 border-red-200 h-9 px-3 rounded-xl cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Branch Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in select-none">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-[#081B3A] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold">
                  {editingBranch ? `Edit Branch (${editingBranch.code})` : 'Add New Branch Center'}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="bg-red-600 text-white px-5 py-2.5 text-xs font-bold flex items-center justify-between">
                <span>{errorMsg}</span>
                <button onClick={() => setErrorMsg(null)}><X className="w-4 h-4" /></button>
              </div>
            )}

            <form onSubmit={handleSaveBranch} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="font-bold text-gray-700 block mb-1">Branch Name *</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Hyderabad Main Print Center"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-600 text-xs font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Code *</label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="SVV-1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-600 text-xs font-mono font-bold uppercase"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Full Physical Address</label>
                <textarea
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="Plot 42, Main Road, Near Metro Pillar 104..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-600 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">City</label>
                  <input
                    type="text"
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    placeholder="Hyderabad"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-600 text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">State</label>
                  <input
                    type="text"
                    value={formState}
                    onChange={(e) => setFormState(e.target.value)}
                    placeholder="Telangana"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-600 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Mobile Number</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+91 99999 99999"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-600 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-600 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">WhatsApp Business Number</label>
                  <input
                    type="text"
                    value={formWhatsApp}
                    onChange={(e) => setFormWhatsApp(e.target.value)}
                    placeholder="+91 99999 99999"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-600 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Branch Manager / Contact</label>
                  <input
                    type="text"
                    value={formManager}
                    onChange={(e) => setFormManager(e.target.value)}
                    placeholder="Manager Name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-600 text-xs"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-3">
                <Button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-[#081B3A] hover:bg-[#0f2952] text-white font-bold text-xs py-2.5 rounded-xl cursor-pointer"
                >
                  {saving ? 'Saving Branch...' : editingBranch ? 'Update Branch' : 'Create Branch'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="text-xs font-bold text-gray-700 py-2.5 rounded-xl cursor-pointer"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp Gateway Modal for specific branch */}
      {selectedBranchForWhatsApp && (
        <WhatsAppGatewayModal
          open={Boolean(selectedBranchForWhatsApp)}
          onClose={() => setSelectedBranchForWhatsApp(null)}
          branchId={selectedBranchForWhatsApp}
          onOrderCreated={loadBranches}
        />
      )}
    </div>
  );
}
