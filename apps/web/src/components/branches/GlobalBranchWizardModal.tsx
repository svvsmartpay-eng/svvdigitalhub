import React, { useState, useEffect } from 'react';
import { useBranchWizardStore } from '@/store/branchWizardStore';
import { supabase } from '@/lib/supabase';
import { X, CheckCircle2, ChevronRight, ChevronLeft, Building2, MessageSquare, Wrench } from 'lucide-react';

export default function GlobalBranchWizardModal() {
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
  const [formPhone, setFormPhone] = useState('');
  const [formManager, setFormManager] = useState('');

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
        phone: formPhone,
        isActive: true,
        updatedAt: now,
      };
      if (!editingBranchId) branchPayload.createdAt = now;

      const { error: branchError } = await supabase.from('branches').upsert(branchPayload, { onConflict: 'id' });
      if (branchError) throw new Error(branchError.message || 'Error saving branch');

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
      
      try {
        const local = localStorage.getItem('svv_branches_store');
        let prev = local ? JSON.parse(local) : [];
        const item = { ...branchPayload, managerName: formManager, assetsCount: 0, ordersCount: 0 };
        const exists = prev.some((b: any) => b.id === branchId);
        const updated = exists ? prev.map((b: any) => b.id === branchId ? item : b) : [...prev, item];
        localStorage.setItem('svv_branches_store', JSON.stringify(updated));
        window.dispatchEvent(new Event('storage'));
      } catch {}

      closeWizard();
    } catch (err: any) {
      setErrorMsg(`Provisioning Failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 0, title: 'Basic Info', icon: <Building2 className="w-4 h-4" /> },
    { id: 1, title: 'WhatsApp & Print Hub', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 2, title: 'Modules & Settings', icon: <Wrench className="w-4 h-4" /> }
  ];

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="bg-[#081B3A] px-6 py-4 flex items-center justify-between text-white shrink-0">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-400" />
              {editingBranchId ? 'Edit Branch Configurations' : 'New Branch Setup Wizard'}
            </h2>
            <p className="text-xs text-blue-200 mt-0.5">Provision a new branch center and configure all integrated modules.</p>
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

        {/* Error Message */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-bold flex items-start justify-between">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)}><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          {activeTab === 0 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="font-bold text-gray-700 block mb-1.5 text-xs">Branch Name *</label>
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
                  <label className="font-bold text-gray-700 block mb-1.5 text-xs">Code *</label>
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
                  <label className="font-bold text-gray-700 block mb-1.5 text-xs">City</label>
                  <input
                    type="text"
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1.5 text-xs">State</label>
                  <input
                    type="text"
                    value={formState}
                    onChange={(e) => setFormState(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-gray-700 block mb-1.5 text-xs">Branch Manager</label>
                  <input
                    type="text"
                    value={formManager}
                    onChange={(e) => setFormManager(e.target.value)}
                    placeholder="Manager Name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1.5 text-xs">Contact Phone</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
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
                <label className="font-bold text-gray-700 block mb-1.5 text-xs">Dedicated WhatsApp Business Number</label>
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
              {saving ? 'Provisioning...' : 'Save & Provision Branch'}
              {!saving && <CheckCircle2 className="w-4 h-4 ml-1" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
