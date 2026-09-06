const fs = require('fs');
const file = 'apps/web/src/pages/super-admin/SuperAdminDashboard.tsx';
let code = fs.readFileSync(file, 'utf8');

// Replace standard imports
code = code.replace(
  "import { Navigate } from 'react-router-dom';",
  "import { Navigate } from 'react-router-dom';\nimport { useTenants, useCreateTenant, useUpdateTenant } from '@/api/tenant.api';\nimport { Loader2 } from 'lucide-react';"
);

// Replace useState with useTenants
code = code.replace(
  /const \[tenants\] = useState\(\[[\s\S]*?\]\);/,
  `const { data: tenants, isLoading } = useTenants();`
);

// Replace static data references in JSX
code = code.replace(
  /\{tenants\.map\(t => \(/,
  `{isLoading ? (<tr><td colSpan={6} className="text-center py-4"><Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-600"/></td></tr>) : tenants?.map((t: any) => (`
);

// Map the modules to new names
code = code.replace(
  /t\.modules\.print/g,
  "t.isPrintHubEnabled"
);
code = code.replace(
  /t\.modules\.tasks/g,
  "t.isTasksEnabled"
);
code = code.replace(
  /t\.modules\.billing/g,
  "t.isBillingEnabled"
);

// Fix statuses and plans
code = code.replace(
  /t\.status === 'ACTIVE'/g,
  "t.isActive"
);
code = code.replace(
  /\{t\.plan\}/g,
  "{t.subscription?.plan?.name || 'Free'}"
);
code = code.replace(
  /<h3 className="text-2xl font-bold text-\[\#081B3A\]">2<\/h3>/g,
  `<h3 className="text-2xl font-bold text-[#081B3A]">{tenants?.length || 0}</h3>`
);

fs.writeFileSync(file, code, 'utf8');
