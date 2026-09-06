const fs = require('fs');

let content = fs.readFileSync('apps/web/src/pages/branches/BranchListPage.tsx', 'utf8');

// The file currently uses a `loadBranches` function and local state.
// We should replace it entirely with a simplified React Query version, or just patch out localStorage.

content = content.replace(/let cached: BranchItem\[\] = \[\];[\s\S]*?if \(local\) cached = JSON\.parse\(local\);\n\s*\} catch \{\}/g, '');
content = content.replace(/setBranches\(cached\);/g, '');
content = content.replace(/try \{\n\s*localStorage\.setItem\('svv_branches_store'[^}]+\} catch \{\}/g, '');
content = content.replace(/try \{\n\s*localStorage\.removeItem\('svv_branches_store'\)[^}]+\} catch \{\}/g, '');
content = content.replace(/try \{\n\s*localStorage\.setItem\('svv_branches_store'[^}]+\n\s*window\.dispatchEvent[^}]+\} catch \{\}/g, '');

fs.writeFileSync('apps/web/src/pages/branches/BranchListPage.tsx', content);
console.log('Removed localStorage from BranchListPage.tsx');
