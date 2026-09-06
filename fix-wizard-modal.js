const fs = require('fs');

let content = fs.readFileSync('apps/web/src/components/branches/GlobalBranchWizardModal.tsx', 'utf8');

// Inject useQueryClient
if (!content.includes("useQueryClient")) {
    content = content.replace("import { useBranchWizardStore } from '@/store/branchWizardStore';", "import { useBranchWizardStore } from '@/store/branchWizardStore';\nimport { useQueryClient } from '@tanstack/react-query';");
}

content = content.replace("export default function GlobalBranchWizardModal() {", "export default function GlobalBranchWizardModal() {\n  const queryClient = useQueryClient();");

// Replace localStorage read with supabase query
const readRegex = /\/\/ Read from localStorage cache first for instant UI[\s\S]*?let branchData = null;[\s\S]*?if \(local\) \{[\s\S]*?const list = JSON\.parse\(local\);[\s\S]*?branchData = list\.find\(\(b: any\) => b\.id === editBranchId\);[\s\S]*?\}/g;
content = content.replace(readRegex, `
let branchData = null;
const { data, error } = await supabase.from('branches').select('*').eq('id', editBranchId).single();
if (!error && data) {
    branchData = data;
}
`);

// Replace localStorage write with invalidateQueries
const writeRegex = /\/\/ 4\. Update Local Storage for Instant UI feedback[\s\S]*?window\.dispatchEvent\(new Event\('storage'\)\);[\s\S]*?\} catch \(\) \{\}/g;
content = content.replace(writeRegex, `
// 4. Invalidate React Query Cache for Instant UI feedback
queryClient.invalidateQueries({ queryKey: ['branches'] });
`);

// Fix empty catch block bug `catch () {}` -> `catch (err) {}` if it was there
content = content.replace(/catch \(\) \{\}/g, 'catch (err) {}');

fs.writeFileSync('apps/web/src/components/branches/GlobalBranchWizardModal.tsx', content);
console.log('Fixed GlobalBranchWizardModal.tsx');
