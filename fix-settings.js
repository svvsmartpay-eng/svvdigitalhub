const fs = require('fs');

let content = fs.readFileSync('apps/web/src/pages/settings/SettingsPage.tsx', 'utf8');

// Inject useBranches
if (!content.includes("useBranches")) {
    content = content.replace("import { useAuthStore } from '@/stores/auth.store';", "import { useAuthStore } from '@/stores/auth.store';\nimport { useBranches } from '@/api/branches.api';");
}

// Replace localBranches state with useBranches query
const localBranchesRegex = /const \[localBranches, setLocalBranches\] = useState<any\[\]>\(\(\) => \{[\s\S]*?\}\);/g;
content = content.replace(localBranchesRegex, "const { data: localBranches = [] } = useBranches();");

fs.writeFileSync('apps/web/src/pages/settings/SettingsPage.tsx', content);
console.log('Fixed SettingsPage.tsx');
