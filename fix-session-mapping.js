const fs = require('fs');
let bl = fs.readFileSync('apps/web/src/pages/branches/BranchListPage.tsx', 'utf8');

// sessions is returned as object (not array) from Supabase since branchId is UNIQUE
// Fix: handle both array and object shapes, and also fallback to whatsapp config status
bl = bl.replace(
  `sessionStatus: b.sessions?.[0]?.status === 'CONNECTED' ? 'CONNECTED' : 'DISCONNECTED',
            lastSeen: b.sessions?.[0]?.lastSeen || null,
            connectedAt: b.sessions?.[0]?.connectedAt || null,`,
  `sessionStatus: (() => {
              const sessArr = Array.isArray(b.sessions) ? b.sessions?.[0] : b.sessions;
              const cfgStatus = b.whatsapp?.[0]?.status;
              return (sessArr?.status === 'CONNECTED' || cfgStatus === 'CONNECTED') ? 'CONNECTED' : 'DISCONNECTED';
            })(),
            lastSeen: (Array.isArray(b.sessions) ? b.sessions?.[0] : b.sessions)?.lastSeen || null,
            connectedAt: (Array.isArray(b.sessions) ? b.sessions?.[0] : b.sessions)?.connectedAt || null,`
);

fs.writeFileSync('apps/web/src/pages/branches/BranchListPage.tsx', bl);
console.log('Fixed sessionStatus mapping');
