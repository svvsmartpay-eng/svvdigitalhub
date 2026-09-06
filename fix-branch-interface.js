const fs = require('fs');
let bl = fs.readFileSync('apps/web/src/pages/branches/BranchListPage.tsx', 'utf8');

bl = bl.replace('sessionStatus?: string;', 'sessionStatus?: string;\n  lastSeen?: string;\n  connectedAt?: string;');
fs.writeFileSync('apps/web/src/pages/branches/BranchListPage.tsx', bl);
