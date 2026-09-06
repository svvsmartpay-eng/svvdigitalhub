const fs = require('fs');

let auth = fs.readFileSync('apps/web/src/api/auth.api.ts', 'utf8');
auth = auth.replace(/organizationId: 'org-1'/g, "organizationId: 'svv-org-001'");
fs.writeFileSync('apps/web/src/api/auth.api.ts', auth);

console.log('Fixed auth.api.ts');
