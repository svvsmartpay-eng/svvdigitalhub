const fs = require('fs');

let modal = fs.readFileSync('apps/web/src/components/shared/WhatsAppGatewayModal.tsx', 'utf8');

// Replace the handleConfirmLinked block to use whatsapp_sessions
const oldConfirm = `      // Force bypass
      await supabase.from('branch_whatsapp_configs').upsert({
        branchId,
        organizationId: 'svv-org-001',
        status: 'CONNECTED',
        whatsappNumber: branchPhone,
        updatedAt: new Date().toISOString(),
      }, { onConflict: 'branchId' });`;

const newConfirm = `      // Force bypass & store in new whatsapp_sessions table
      const sessionId = 'session_' + Math.random().toString(36).substring(2, 15);
      const now = new Date().toISOString();
      await supabase.from('whatsapp_sessions').upsert({
        branchId,
        phoneNumber: branchPhone,
        sessionId: sessionId,
        status: 'CONNECTED',
        connectedAt: now,
        lastSeen: now,
        updatedAt: now,
      }, { onConflict: 'branchId' });

      // Keep config in sync
      await supabase.from('branch_whatsapp_configs').upsert({
        branchId,
        organizationId: 'svv-org-001',
        status: 'CONNECTED',
        whatsappNumber: branchPhone,
        updatedAt: now,
      }, { onConflict: 'branchId' });`;

modal = modal.replace(oldConfirm, newConfirm);

// Replace handleDisconnect
const oldDisconnect = `      await supabase.from('branch_whatsapp_configs').update({ status: 'OFFLINE' }).eq('branchId', branchId);`;
const newDisconnect = `      await supabase.from('whatsapp_sessions').update({ status: 'DISCONNECTED', lastSeen: new Date().toISOString() }).eq('branchId', branchId);
      await supabase.from('branch_whatsapp_configs').update({ status: 'OFFLINE' }).eq('branchId', branchId);`;
modal = modal.replace(oldDisconnect, newDisconnect);

fs.writeFileSync('apps/web/src/components/shared/WhatsAppGatewayModal.tsx', modal);
console.log('Fixed WhatsAppGatewayModal.tsx');
