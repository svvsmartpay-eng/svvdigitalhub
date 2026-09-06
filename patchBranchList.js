const fs = require('fs');
let c = fs.readFileSync('apps/web/src/pages/branches/BranchListPage.tsx', 'utf8');

// Replace imports
c = c.replace(
  /import { Building2, Search, Plus, MapPin, Phone, Users, Shield, Database, X, Check, ArrowRight, Save, Store, Truck, LayoutDashboard, Calendar, Wrench, Package } from 'lucide-react';/,
  "import { Building2, Search, Plus, MapPin, Phone, Users, Shield, Database, X, Check, ArrowRight, Save, Store, Truck, LayoutDashboard, Calendar, Wrench, Package } from 'lucide-react';\nimport { useBranchWizardStore } from '@/store/branchWizardStore';"
);

// Replace state
c = c.replace(
  /const \[isModalOpen, setIsModalOpen\] = useState\(false\);/,
  "const { openWizard } = useBranchWizardStore();"
);

// We need to carefully remove all modal state logic from handleSaveBranch
// Since the wizard now handles it, we don't need the form state variables or handleSaveBranch in this file!
// But wait, removing them all using regex is risky. Let's just swap the Add button behavior and remove the modal rendering.

c = c.replace(
  /onClick=\{\(\) => \{\s*setEditingBranch\(null\);\s*setFormName\(''\);\s*setFormCode\(''\);\s*setFormAddress\(''\);\s*setFormCity\(''\);\s*setFormState\(''\);\s*setFormPhone\(''\);\s*setFormManager\(''\);\s*setFormWhatsApp\(''\);\s*setErrorMsg\(null\);\s*setIsModalOpen\(true\);\s*\}\}/,
  "onClick={() => openWizard()}"
);

c = c.replace(
  /onClick=\{\(\) => handleEditBranch\(branch\)\}/g,
  "onClick={() => openWizard(branch.id)}"
);

// Remove the old modal div block completely.
const modalStart = c.indexOf('{isModalOpen && (');
if (modalStart !== -1) {
  let modalEnd = c.indexOf('</div>\n          </div>\n        </div>\n      )}', modalStart);
  if (modalEnd !== -1) {
    c = c.substring(0, modalStart) + c.substring(modalEnd + 45); // + length of ending string
  }
}

fs.writeFileSync('apps/web/src/pages/branches/BranchListPage.tsx', c);
