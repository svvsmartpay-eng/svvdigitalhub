const fs = require('fs');
const file = 'apps/web/src/components/layout/AppShell.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Module checks
code = code.replace(
  'const isPrintHubEnabled = plugins ? plugins.print_whatsapp_hub !== false : true;',
  `const isPrintHubEnabled = user?.organization?.isPrintHubEnabled !== false;
  const isTasksEnabled = user?.organization?.isTasksEnabled !== false;
  const isAssetsEnabled = user?.organization?.isAssetsEnabled !== false;
  const isReportsEnabled = user?.organization?.isReportsEnabled !== false;
  const isBillingEnabled = user?.organization?.isBillingEnabled === true;`
);

// 2. White-labeling branding
code = code.replace(
  `<Building2 className="shrink-0 text-[#0D6EFD]" />
          {!collapsed && <h1 className="text-xl font-bold truncate tracking-wide text-white">SVV AMS</h1>}`,
  `{user?.organization?.logoUrl ? (
            <img src={user?.organization?.logoUrl} alt="Logo" className="w-8 h-8 rounded shrink-0 object-contain" />
          ) : (
            <Building2 className="shrink-0 text-[#0D6EFD]" />
          )}
          {!collapsed && <h1 className="text-xl font-bold truncate tracking-wide text-white">{user?.organization?.name || 'SVV AMS'}</h1>}`
);

// 3. Navigation items conditional filtering
code = code.replace(
  /const navItems = \[[\s\S]*?\];/,
  `const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: BarChart3, roles: ['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER', 'STAFF', 'TECHNICIAN'] },
    { label: 'Super Admin', path: '/super-admin', icon: Shield, roles: ['SUPER_ADMIN'] }, // Global Tenant Management
    { label: 'Branches', path: '/branches', icon: Building2, roles: ['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER'] },
    
    ...(isTasksEnabled ? [
      { label: 'Tasks & Work', path: '/tasks', icon: CheckSquare, roles: ['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER', 'STAFF', 'TECHNICIAN'] }
    ] : []),
    
    { label: 'Issues & Tickets', path: '/issues', icon: AlertCircle, roles: ['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER', 'STAFF'] },
    
    ...(isAssetsEnabled ? [
      { label: 'Assets', path: '/assets', icon: Box, roles: ['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER'] },
      { label: 'Asset Analytics', path: '/assets/analytics', icon: TrendingUp, roles: ['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER'] }
    ] : []),
    
    ...(isPrintHubEnabled ? [
      { label: 'Print & WhatsApp Hub', path: '/print-hub', icon: Printer, roles: ['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER', 'STAFF'] }
    ] : []),
    
    ...(isBillingEnabled ? [
      { label: 'Billing & Subscriptions', path: '/billing', icon: IndianRupee, roles: ['SUPER_ADMIN', 'ADMIN'] }
    ] : []),

    { label: 'Work Orders', path: '/work-orders', icon: ClipboardList, roles: ['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER'] },
    { label: 'My Jobs', path: '/jobs', icon: Wrench, roles: ['TECHNICIAN'] },
    { label: 'PM Schedules', path: '/pm', icon: Calendar, roles: ['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER', 'STAFF'] },
    { label: 'Live Staff', path: '/admin/live-staff', icon: Users, roles: ['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER'] },
    { label: 'Vendors', path: '/vendors', icon: Truck, roles: ['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER'] },
    { label: 'Technicians', path: '/technicians', icon: Users, roles: ['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER'] },
    { label: 'Parts Inventory', path: '/parts', icon: Package, roles: ['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER', 'TECHNICIAN'] },
    { label: 'Costs & ROI', path: '/costs', icon: IndianRupee, roles: ['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER'] },
    
    ...(isReportsEnabled ? [
      { label: 'Reports', path: '/reports', icon: FileText, roles: ['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER'] }
    ] : []),
    
    { label: 'My Profile', path: '/profile', icon: Settings, roles: ['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER', 'STAFF', 'TECHNICIAN'] },
    { label: 'Audit Logs', path: '/audit', icon: Shield, roles: ['SUPER_ADMIN', 'ADMIN'] },
    { label: 'Settings', path: '/settings', icon: Settings, roles: ['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER'] },
  ];`
);

fs.writeFileSync(file, code, 'utf8');
