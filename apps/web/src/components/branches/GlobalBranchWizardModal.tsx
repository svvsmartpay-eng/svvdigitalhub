import React, { useState, useEffect } from 'react';
import { useBranchWizardStore } from '@/store/branchWizardStore';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { apiClient } from '@/lib/api';
import { X, CheckCircle2, ChevronRight, ChevronLeft, Building2, MessageSquare, Wrench } from 'lucide-react';

export default function GlobalBranchWizardModal() {
  const queryClient = useQueryClient();
  const { isOpen, editingBranchId, closeWizard } = useBranchWizardStore();
  
  const [activeTab, setActiveTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Tab 1: Basic Info
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formState, setFormState] = useState('');
  const [formPhone, setFormPhone] = useState(''); // Maps to mobile_no / phone
  const [formEmail, setFormEmail] = useState('');
  const [formManager, setFormManager] = useState(''); // Maps to manager_name / managerId

  // Tab 2: WhatsApp & Print Hub
  const [waNumber, setWaNumber] = useState('');
  const [waDisplayName, setWaDisplayName] = useState('');
  const [waWelcomeMessage, setWaWelcomeMessage] = useState('Welcome to SVV Print Hub! Send your files to print.');
  const [waAutoPrint, setWaAutoPrint] = useState(false);

  // Tab 3: Modules & Features
  const [modulePrintHub, setModulePrintHub] = useState(true);
  const [moduleAssets, setModuleAssets] = useState(true);
  const [moduleTasks, setModuleTasks] = useState(true);

  useEffect(() => {
    if (isOpen) {
      if (!editingBranchId) {
        setFormName('');
        setFormCode('');
        setFormAddress('');
        setFormCity('');
        setFormState('');
        setFormPhone('');
        setFormEmail('');
        setFormManager('');
        setWaNumber('');
        setWaDisplayName('');
        setWaWelcomeMessage('Welcome to SVV Print Hub! Send your files to print.');
        setWaAutoPrint(false);
        setModulePrintHub(true);
        setModuleAssets(true);
        setModuleTasks(true);
        setActiveTab(0);
        setErrorMsg(null);
      } else {
        // Fetch existing branch data to edit
        const loadBranch = async () => {
          try {
            // Read from localStorage cache first for instant UI
            const local = localStorage.getItem('svv_branches_store');
            let branchData = null;
            if (local) {
              const list = JSON.parse(local);
              branchData = list.find((b: any) => b.id === editingBranchId);
            }
            
            // If we have local data, populate immediately
            if (branchData) {
              setFormName(branchData.name || '');
              setFormCode(branchData.code || '');
              setFormAddress(branchData.address || '');
              setFormCity(branchData.city || '');
              setFormState(branchData.state || '');
              setFormPhone(branchData.phone || '');
              setFormEmail(branchData.email || '');
              setFormManager(branchData.managerId || branchData.managerName || '');
              
              setWaNumber(branchData.whatsappNumber || '');
            }

            // Also query Supabase to get the exact latest and the WhatsApp config
            const { data: bData } = await supabase.from('branches').select('*').eq('id', editingBranchId).single();
            if (bData) {
              setFormName(bData.name || '');
              setFormCode(bData.code || '');
              setFormAddress(bData.address || '');
              setFormCity(bData.city || '');
              setFormState(bData.state || '');
              setFormPhone(bData.phone || '');
              setFormEmail(bData.email || '');
              setFormManager(bData.managerId || '');
            }

            const { data: waData } = await supabase.from('branch_whatsapp_configs').select('*').eq('branchId', editingBranchId).single();
            if (waData) {
              setWaNumber(waData.whatsappNumber || '');
              setWaDisplayName(waData.displayName || '');
              setWaWelcomeMessage(waData.welcomeMessage || 'Welcome to SVV Print Hub! Send your files to print.');
              setWaAutoPrint(waData.autoPrint || false);
            }
          } catch (err) {
            console.error("Error loading branch details", err);
          }
        };
        loadBranch();
        setActiveTab(0);
        setErrorMsg(null);
      }
    }
  }, [isOpen, editingBranchId]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!formName || !formCode) {
      setErrorMsg('Branch Name and Code are required on Basic Info tab.');
      setActiveTab(0);
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    const now = new Date().toISOString();
    const branchId = editingBranchId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `branch-${Date.now()}`);

    try {
      const branchPayload: any = {
        id: branchId,
        organizationId: 'svv-org-001',
        name: formName.trim(),
        code: formCode.toUpperCase().trim(),
        address: formAddress.trim(),
        city: formCity.trim(),
        state: formState.trim(),
        phone: formPhone.trim(),
        email: formEmail.trim(),
        managerId: formManager.trim(),
        isActive: true,
        updatedAt: now,
      };
      if (!editingBranchId) branchPayload.createdAt = now;

      // 1. Update Supabase branches table
      const { error: branchError } = await supabase.from('branches').upsert(branchPayload, { onConflict: 'id' });
      if (branchError) throw new Error(branchError.message || 'Error saving branch');

      // 2. Update Supabase WhatsApp config
      if (waNumber.trim()) {
        const { error: waError } = await supabase.from('branch_whatsapp_configs').upsert({
          branchId,
          organizationId: 'svv-org-001',
          whatsappNumber: waNumber.trim(),
          displayName: waDisplayName.trim() || `${formName} Print Desk`,
          welcomeMessage: waWelcomeMessage,
          autoPrint: waAutoPrint,
          status: 'QR_SCAN_REQUIRED',
          updatedAt: now,
        }, { onConflict: 'branchId' });
        if (waError) throw new Error(waError.message || 'Error saving WhatsApp config');
      }

      // 3. Fallback to API if deployed (best effort sync)
      try {
        if (editingBranchId) {
          await apiClient.put(`/branches/${branchId}`, branchPayload);
        } else {
          await apiClient.post('/branches', branchPayload);
        }
      } catch {}

      // 4. Update Local Storage for Instant UI feedback
      try {
        const local = localStorage.getItem('svv_branches_store');
        let prev = local ? JSON.parse(local) : [];
        const item = { 
          ...branchPayload, 
          managerName: formManager.trim(), 
          whatsappNumber: waNumber.trim(),
          assetsCount: 0, 
          ordersCount: 0 
        };
        const exists = prev.some((b: any) => b.id === branchId);
        
        // When mapping, preserve counts if it exists
        const updated = exists ? prev.map((b: any) => b.id === branchId ? { ...b, ...item, assetsCount: b.assetsCount, ordersCount: b.ordersCount, staffCount: b.staffCount } : b) : [...prev, item];
        localStorage.setItem('svv_branches_store', JSON.stringify(updated));
        
        // Dispatch storage event so BranchListPage updates instantly
        window.dispatchEvent(new Event('storage'));
      } catch (err) {
        console.error('Local storage update failed', err);
      }

      closeWizard();
    } catch (err: any) {
      setErrorMsg(`Failed to save branch: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 0, title: 'Basic Info', icon: <Building2 className="w-4 h-4" /> },
    { id: 1, title: 'WhatsApp & Print Hub', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 2, title: 'Modules & Features', icon: <Wrench className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-[#081B3A] px-6 py-4 flex items-center justify-between text-white shrink-0">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-400" />
              {editingBranchId ? 'Edit Branch Configurations' : 'New Branch Setup Wizard'}
            </h2>
            <p className="text-xs text-blue-200 mt-0.5">Provision a branch center and configure integrated modules.</p>
          </div>
          <button onClick={closeWizard} className="text-gray-300 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b bg-gray-50 px-2 pt-2 shrink-0 overflow-x-auto no-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 font-bold text-sm whitespace-nowrap transition-colors ${
                activeTab === tab.id 
                  ? 'border-blue-600 text-blue-700 bg-blue-50/50' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              {tab.icon}
              {tab.title}
            </button>
          ))}
        </div>

        {/* Form Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-white">
          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-bold">
              {errorMsg}
            </div>
          )}

          {activeTab === 0 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-gray-700 block mb-1.5 text-xs">Branch Name (branch_name) *</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Hyderabad Main Print Center"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-600 text-sm font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1.5 text-xs">Branch Code *</label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="SVV-1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-600 text-sm font-mono font-bold uppercase"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="font-bold text-gray-700 block mb-1.5 text-xs">Full Physical Address</label>
                <textarea
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="Plot 42, Main Road, Near Metro Pillar 104..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-600 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-gray-700 block mb-1.5 text-xs">Mobile Number (mobile_no)</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+91..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1.5 text-xs">Email Address (email)</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="branch@svvams.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-gray-700 block mb-1.5 text-xs">City</label>
                  <input
                    type="text"
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1.5 text-xs">Manager Name (manager_name)</label>
                  <input
                    type="text"
                    value={formManager}
                    onChange={(e) => setFormManager(e.target.value)}
                    placeholder="Manager Name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mb-4">
                <p className="text-xs text-blue-800 font-medium">
                  Configuring this section will automatically register this branch in the SVV Print & WhatsApp Hub. A unique QR code will be generated for customers to scan and send documents.
                </p>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1.5 text-xs">Dedicated WhatsApp Number (whatsapp_number)</label>
                <input
                  type="text"
                  value={waNumber}
                  onChange={(e) => setWaNumber(e.target.value)}
                  placeholder="e.g. +91 9876543210"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:border-green-600 text-sm font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1.5 text-xs">Bot Display Name</label>
                <input
                  type="text"
                  value={waDisplayName}
                  onChange={(e) => setWaDisplayName(e.target.value)}
                  placeholder={`e.g. ${formName || 'SVV Print Desk'}`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:border-green-600 text-sm"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1.5 text-xs">Custom Welcome Message (Auto-Reply)</label>
                <textarea
                  value={waWelcomeMessage}
                  onChange={(e) => setWaWelcomeMessage(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:border-green-600 text-sm bg-gray-50"
                />
              </div>

              <label className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-gray-50 mt-2">
                <input 
                  type="checkbox" 
                  checked={waAutoPrint}
                  onChange={(e) => setWaAutoPrint(e.target.checked)}
                  className="w-5 h-5 rounded text-blue-600"
                />
                <div>
                  <div className="font-bold text-gray-800 text-sm">Enable Auto-Print for 1-Page Documents</div>
                  <div className="text-xs text-gray-500">Bypasses manual queue approval for simple text/pdf files.</div>
                </div>
              </label>
            </div>
          )}

          {activeTab === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
               <p className="text-xs text-gray-500 mb-4">Select which SVV AMS modules this branch should have access to.</p>

               <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${modulePrintHub ? 'bg-blue-50/50 border-blue-200' : 'bg-white hover:bg-gray-50'}`}>
                <input type="checkbox" checked={modulePrintHub} onChange={(e) => setModulePrintHub(e.target.checked)} className="w-5 h-5" />
                <div>
                  <div className="font-bold text-gray-800 text-sm">Print & WhatsApp Hub</div>
                  <div className="text-xs text-gray-500">Allow branch to process print orders and receive WhatsApp documents.</div>
                </div>
              </label>

              <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${moduleAssets ? 'bg-blue-50/50 border-blue-200' : 'bg-white hover:bg-gray-50'}`}>
                <input type="checkbox" checked={moduleAssets} onChange={(e) => setModuleAssets(e.target.checked)} className="w-5 h-5" />
                <div>
                  <div className="font-bold text-gray-800 text-sm">Asset & Inventory Management</div>
                  <div className="text-xs text-gray-500">Track hardware, printers, parts, and PM schedules for this branch.</div>
                </div>
              </label>

              <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${moduleTasks ? 'bg-blue-50/50 border-blue-200' : 'bg-white hover:bg-gray-50'}`}>
                <input type="checkbox" checked={moduleTasks} onChange={(e) => setModuleTasks(e.target.checked)} className="w-5 h-5" />
                <div>
                  <div className="font-bold text-gray-800 text-sm">Tasks & Work Orders</div>
                  <div className="text-xs text-gray-500">Enable task assignment, ticketing, and service visits.</div>
                </div>
              </label>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t bg-gray-50 px-6 py-4 flex items-center justify-between shrink-0">
          <button
            onClick={() => setActiveTab(Math.max(0, activeTab - 1))}
            disabled={activeTab === 0}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1 transition-colors ${activeTab === 0 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-200 bg-gray-100'}`}
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>

          {activeTab < 2 ? (
            <button
              onClick={() => setActiveTab(activeTab + 1)}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-sm flex items-center gap-1 transition-colors"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-[#198754] hover:bg-[#157347] text-white rounded-xl text-sm font-bold shadow-sm flex items-center gap-1 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Branch Details'}
              {!saving && <CheckCircle2 className="w-4 h-4 ml-1" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
