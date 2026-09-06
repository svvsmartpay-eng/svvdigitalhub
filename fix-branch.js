const fs = require('fs');

let content = fs.readFileSync('apps/web/src/pages/branches/BranchListPage.tsx', 'utf8');

// Fix the `??` characters
content = content.replace(/\{b\.phone && <span>\?\? \{b\.phone\}<\/span>\}/g, "{b.phone ? <span>?? {b.phone}</span> : <span className=\"text-gray-400 italic\">No Mobile Number Configured</span>}");
content = content.replace(/\{b\.email && <span>\?\? \{b\.email\}<\/span>\}/g, "{b.email ? <span>?? {b.email}</span> : <span className=\"text-gray-400 italic\">No Email Configured</span>}");

// Update handleSaveBranch
const newSave = `const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formCode) {
      setErrorMsg('Branch Name and Code are required.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    const now = new Date().toISOString();
    const branchId = editingBranch?.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : \`branch-\${Date.now()}\`);
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
      if (branchError) throw new Error(\`Failed to save branch: \${branchError.message}\`);

      if (formWhatsApp.trim()) {
        // Fetch existing config to get ID
        const { data: existingWa } = await supabase.from('branch_whatsapp_configs').select('id').eq('branchId', branchId).single();
        
        const waPayload = {
          id: existingWa?.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : \`wa-\${Date.now()}\`),
          branchId,
          organizationId: orgId,
          whatsappNumber: formWhatsApp.trim(),
          displayName: \`\${formName} (\${formCode})\`,
          updatedAt: now,
        };

        const { error: waError } = await supabase.from('branch_whatsapp_configs').upsert(waPayload, { onConflict: 'branchId' });
        if (waError) throw new Error(\`Failed to save WhatsApp Number: \${waError.message}\`);
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
  };`;

content = content.replace(/const handleSaveBranch = async \([\s\S]*?finally \{\s*setSaving\(false\);\s*\}\s*\};/m, newSave);

// Fix "WhatsApp Offline" logic
const offlineLogic = `{b.sessionStatus === 'CONNECTED' ? (
                  <div className="bg-green-50 text-green-700 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 uppercase tracking-wider border border-green-200">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                    WhatsApp Live
                  </div>
                ) : (
                  <div className="bg-red-50 text-red-700 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 uppercase tracking-wider border border-red-200">
                    WhatsApp Offline
                  </div>
                )}`;

const newOfflineLogic = `
                {b.whatsappNumber ? (
                  b.sessionStatus === 'CONNECTED' ? (
                    <div className="bg-green-50 text-green-700 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 uppercase tracking-wider border border-green-200">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                      WhatsApp Connected
                    </div>
                  ) : (
                    <div className="bg-amber-50 text-amber-700 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 uppercase tracking-wider border border-amber-200">
                      WhatsApp Disconnected
                    </div>
                  )
                ) : (
                  <div className="bg-gray-100 text-gray-500 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 uppercase tracking-wider border border-gray-200">
                    Not Configured
                  </div>
                )}`;

content = content.replace(offlineLogic, newOfflineLogic);

// Fix the footer QR button logic to match "Not Configured"
const qrLogic = `{b.sessionStatus === 'CONNECTED' ? (
                  <div className="flex-1 bg-green-100 text-green-800 font-mono font-bold text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-2 border border-green-200">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    {b.whatsappNumber || 'Connected'}
                  </div>
                ) : (
                  <div className="flex-1 flex gap-2">
                    <div className="flex-1 bg-yellow-50 text-yellow-800 font-mono font-bold text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 border border-yellow-200 opacity-60">
                      <Smartphone className="w-3.5 h-3.5" />
                      {b.whatsappNumber || 'No Number'}
                    </div>
                    <button 
                      onClick={() => setSelectedBranchForWhatsApp(b.id)}
                      className="bg-[#081B3A] hover:bg-[#0f2952] text-white text-xs font-bold py-2 px-4 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Scan QR
                    </button>
                  </div>
                )}`;

const newQrLogic = `
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
                )}`;

content = content.replace(qrLogic, newQrLogic);

fs.writeFileSync('apps/web/src/pages/branches/BranchListPage.tsx', content);
console.log('Fixed BranchListPage.tsx');
