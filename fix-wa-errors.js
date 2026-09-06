const fs = require('fs');
let modal = fs.readFileSync('apps/web/src/components/shared/WhatsAppGatewayModal.tsx', 'utf8');

const oldUpsert1 = `await supabase.from('whatsapp_sessions').upsert({`;
const newUpsert1 = `const { error: sessionError } = await supabase.from('whatsapp_sessions').upsert({`;
modal = modal.replace(oldUpsert1, newUpsert1);

const oldSync1 = `}, { onConflict: 'branchId' });

      // Keep config in sync`;
const newSync1 = `}, { onConflict: 'branchId' });
      if (sessionError) throw new Error('Session DB Error: ' + sessionError.message);

      // Keep config in sync`;
modal = modal.replace(oldSync1, newSync1);

const oldUpsert2 = `await supabase.from('branch_whatsapp_configs').upsert({`;
const newUpsert2 = `const { error: configError } = await supabase.from('branch_whatsapp_configs').upsert({`;
modal = modal.replace(oldUpsert2, newUpsert2);

const oldSync2 = `}, { onConflict: 'branchId' });
      
      queryClient.invalidateQueries`;
const newSync2 = `}, { onConflict: 'branchId' });
      if (configError) throw new Error('Config DB Error: ' + configError.message);
      
      queryClient.invalidateQueries`;
modal = modal.replace(oldSync2, newSync2);

fs.writeFileSync('apps/web/src/components/shared/WhatsAppGatewayModal.tsx', modal);
console.log('Fixed WhatsAppGatewayModal.tsx errors');
