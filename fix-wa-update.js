const fs = require('fs');
let modal = fs.readFileSync('apps/web/src/components/shared/WhatsAppGatewayModal.tsx', 'utf8');

const oldConfigSync = `      // Keep config in sync
      const { error: configError } = await supabase.from('branch_whatsapp_configs').upsert({
        branchId,
        organizationId: 'svv-org-001',
        status: 'CONNECTED',
        whatsappNumber: branchPhone,
        updatedAt: now,
      }, { onConflict: 'branchId' });`;

const newConfigSync = `      // Keep config in sync
      const { error: configError } = await supabase.from('branch_whatsapp_configs').update({
        status: 'CONNECTED',
        updatedAt: now,
      }).eq('branchId', branchId);`;

modal = modal.replace(oldConfigSync, newConfigSync);
fs.writeFileSync('apps/web/src/components/shared/WhatsAppGatewayModal.tsx', modal);
console.log('Fixed config error in Force Connect');
