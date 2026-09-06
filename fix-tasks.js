const fs = require('fs');
let content = fs.readFileSync('task.md', 'utf8');

content = content.replace(/- \[\/\] 1\. \*\*Eradicate Local Storage Caches \(SSOT\)\*\*/g, '- [x] 1. **Eradicate Local Storage Caches (SSOT)**');
content = content.replace(/  - \[ \] `apps\/web\/src\/api\/branches\.api\.ts`/g, '  - [x] `apps/web/src/api/branches.api.ts`');
content = content.replace(/  - \[ \] `apps\/web\/src\/api\/printHub\.api\.ts`/g, '  - [x] `apps/web/src/api/printHub.api.ts`');
content = content.replace(/  - \[ \] `apps\/web\/src\/components\/branches\/GlobalBranchWizardModal\.tsx`/g, '  - [x] `apps/web/src/components/branches/GlobalBranchWizardModal.tsx`');
content = content.replace(/  - \[ \] `apps\/web\/src\/components\/shared\/WhatsAppGatewayModal\.tsx`/g, '  - [x] `apps/web/src/components/shared/WhatsAppGatewayModal.tsx`');
content = content.replace(/  - \[ \] `apps\/web\/src\/pages\/branches\/BranchListPage\.tsx`/g, '  - [x] `apps/web/src/pages/branches/BranchListPage.tsx`');
content = content.replace(/  - \[ \] `apps\/web\/src\/pages\/settings\/SettingsPage\.tsx`/g, '  - [x] `apps/web/src/pages/settings/SettingsPage.tsx`');
content = content.replace(/- \[ \] 2\. \*\*Global Context & Branch Filtering\*\*/g, '- [/] 2. **Global Context & Branch Filtering**');

fs.writeFileSync('task.md', content);
