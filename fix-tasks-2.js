const fs = require('fs');

let content = fs.readFileSync('C:\\Users\\vishn\\.gemini\\antigravity\\brain\\aac8f59e-ad00-4027-9e64-268d391ac138\\task.md', 'utf8');

content = content.replace(/- \[\/\] 1\. \*\*Eradicate Local Storage Caches \(SSOT\)\*\*/g, '- [x] 1. **Eradicate Local Storage Caches (SSOT)**');
content = content.replace(/- \[ \] 2\. \*\*Global Context & Branch Filtering\*\*/g, '- [x] 2. **Global Context & Branch Filtering**');
content = content.replace(/- \[ \] `Verify\/Update `stores\/filter.store.ts`/g, '- [x] Verify/Update `stores/filter.store.ts`');
content = content.replace(/- \[ \] `Apply `selectedBranches` filter to all relevant `apiClient` \/ `supabase` queries`/g, '- [x] Apply `selectedBranches` filter to all relevant queries');
content = content.replace(/- \[ \] 3\. \*\*Role-Based Dashboards & Layout\*\*/g, '- [x] 3. **Role-Based Dashboards & Layout**');
content = content.replace(/- \[ \] 4\. \*\*Service Control Panel \/ Network Security\*\*/g, '- [x] 4. **Service Control Panel / Network Security**');
content = content.replace(/- \[ \] 5\. \*\*Verification & Build\*\*/g, '- [x] 5. **Verification & Build**');

fs.writeFileSync('C:\\Users\\vishn\\.gemini\\antigravity\\brain\\aac8f59e-ad00-4027-9e64-268d391ac138\\task.md', content);
