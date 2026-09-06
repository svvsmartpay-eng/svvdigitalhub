const fs = require('fs');
let c = fs.readFileSync('apps/web/src/components/layout/AppShell.tsx', 'utf8');

c = c.replace(
  /import GlobalFilters from '@\/components\/shared\/GlobalFilters';/,
  "import GlobalFilters from '@/components/shared/GlobalFilters';\nimport GlobalBranchWizardModal from '@/components/branches/GlobalBranchWizardModal';\nimport { useBranchWizardStore } from '@/store/branchWizardStore';\nimport { Plus } from 'lucide-react';"
);

c = c.replace(
  /export default function AppShell\(\) {/,
  "export default function AppShell() {\n  const { openWizard } = useBranchWizardStore();"
);

c = c.replace(
  /              <GlobalFilters \/>/,
  `              <button
                onClick={() => openWizard()}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-[#0D6EFD] hover:bg-[#0b5ed7] text-white rounded-lg text-xs font-bold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Branch
              </button>
              <GlobalFilters />`
);

c = c.replace(
  /<Outlet \/>\r?\n\s*<\/main>/,
  "<Outlet />\n            <GlobalBranchWizardModal />\n          </main>"
);

fs.writeFileSync('apps/web/src/components/layout/AppShell.tsx', c);
