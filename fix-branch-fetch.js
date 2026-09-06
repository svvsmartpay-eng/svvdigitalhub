const fs = require('fs');
let bl = fs.readFileSync('apps/web/src/pages/branches/BranchListPage.tsx', 'utf8');

// Update Supabase query
bl = bl.replace('whatsapp:branch_whatsapp_configs(status, whatsappNumber),', 'whatsapp:branch_whatsapp_configs(status, whatsappNumber),\n          sessions:whatsapp_sessions(status, connectedAt, lastSeen),');

// Update enriched mapping
const oldMapping = `whatsappNumber: b.whatsapp?.[0]?.whatsappNumber || b.whatsappNumber || '',
          sessionStatus: b.whatsapp?.[0]?.status === 'ACTIVE' ? 'CONNECTED' : (b.whatsapp?.[0]?.status === 'QR_SCAN_REQUIRED' ? 'QR_REQUIRED' : 'OFFLINE'),`;
const newMapping = `whatsappNumber: b.whatsapp?.[0]?.whatsappNumber || b.whatsappNumber || '',
          sessionStatus: b.sessions?.[0]?.status === 'CONNECTED' ? 'CONNECTED' : 'DISCONNECTED',
          lastSeen: b.sessions?.[0]?.lastSeen || null,
          connectedAt: b.sessions?.[0]?.connectedAt || null,`;
bl = bl.replace(oldMapping, newMapping);

fs.writeFileSync('apps/web/src/pages/branches/BranchListPage.tsx', bl);
console.log('Fixed BranchListPage fetch mapping');
