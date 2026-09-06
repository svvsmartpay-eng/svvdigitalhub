const fs = require('fs');

let bl = fs.readFileSync('apps/web/src/pages/branches/BranchListPage.tsx', 'utf8');
bl = bl.replace(/organizationId: currentUser\?\.organizationId \|\| 'svv-org-001',/g, "organizationId: (currentUser?.organizationId === 'org-1' ? 'svv-org-001' : currentUser?.organizationId) || 'svv-org-001',");
fs.writeFileSync('apps/web/src/pages/branches/BranchListPage.tsx', bl);

console.log('Fixed BranchListPage.tsx');
