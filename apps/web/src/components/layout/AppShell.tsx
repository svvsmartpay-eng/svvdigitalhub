import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import {
  Building2, Package, AlertCircle, ClipboardList, Wrench, Users,
  Truck, Calendar, Box, IndianRupee, BarChart3, Shield, Settings,
  FileText, Menu, X, LogOut, ChevronLeft, ChevronRight, CheckSquare,
  Bell, TrendingUp, Printer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLogout } from '@/api/auth.api';
import GlobalFilters from '@/components/shared/GlobalFilters';
import DailyAlerts from '@/components/shared/DailyAlerts';
import NotificationCenter from '@/components/shared/NotificationCenter';
import { useTaskStats } from '@/api/tasks.api';
import { useIssueStats } from '@/api/issues.api';
import { useAssetStats } from '@/api/assets.api';
import { usePluginSettings } from '@/api/plugins.api';
import { usePrintHubAnalytics } from '@/api/printHub.api';

export default function AppShell() {
  const { user } = useAuthStore();
  const location = useLocation();
  const logoutMutation = useLogout();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('sidebarCollapsed') === 'true');

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', String(newState));
  };

  // Operational Real-Time Counts & Plugins
  const { data: taskStats } = useTaskStats();
  const { data: issueStats } = useIssueStats();
  const { data: assetStats } = useAssetStats();
  const { data: plugins } = usePluginSettings();
  const isPrintHubEnabled = plugins ? plugins.print_whatsapp_hub !== false : true;
  const { data: printAnalytics } = usePrintHubAnalytics();

  const getBadgeInfo = (path: string) => {
    if (path === '/tasks') {
      const overdue = taskStats?.overdue || 0;
      const awaiting = taskStats?.awaitingVerification || 0;
      const active = (taskStats?.myTasks || 0) || (taskStats?.pending || 0);
      if (overdue > 0) return { count: overdue, color: 'bg-red-600 text-white', label: `${overdue} Overdue Tasks`, isUrgent: true };
      if (awaiting > 0) return { count: awaiting, color: 'bg-amber-500 text-white', label: `${awaiting} Awaiting Verification`, isUrgent: false };
      if (active > 0) return { count: active, color: 'bg-blue-500 text-white', label: `${active} Active Tasks`, isUrgent: false };
      return null;
    }

    if (path === '/issues') {
      const critical = issueStats?.critical || 0;
      const open = issueStats?.open || 0;
      const inProgress = issueStats?.inProgress || 0;
      if (critical > 0) return { count: critical, color: 'bg-red-600 text-white', label: `${critical} Critical Tickets`, isUrgent: true };
      if (open > 0) return { count: open, color: 'bg-amber-500 text-white', label: `${open} Open Tickets`, isUrgent: false };
      if (inProgress > 0) return { count: inProgress, color: 'bg-blue-500 text-white', label: `${inProgress} In Progress`, isUrgent: false };
      return null;
    }

    if (path === '/assets') {
      const breakdown = assetStats?.breakdown || 0;
      const maintenance = assetStats?.underMaintenance || 0;
      if (breakdown > 0) return { count: breakdown, color: 'bg-red-600 text-white', label: `${breakdown} Breakdown Assets`, isUrgent: true };
      if (maintenance > 0) return { count: maintenance, color: 'bg-amber-500 text-white', label: `${maintenance} In Maintenance`, isUrgent: false };
      return null;
    }

    if (path === '/print-hub') {
      const pending = printAnalytics?.widgets?.pendingPrintJobs || 0;
      const whatsapp = printAnalytics?.widgets?.newWhatsAppOrders || 0;
      if (whatsapp > 0) return { count: whatsapp, color: 'bg-emerald-600 text-white', label: `${whatsapp} WhatsApp Orders`, isUrgent: true };
      if (pending > 0) return { count: pending, color: 'bg-blue-500 text-white', label: `${pending} Pending Print Jobs`, isUrgent: false };
      return null;
    }

    return null;
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: BarChart3, roles: ['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER', 'STAFF', 'TECHNICIAN'] },
    { label: 'Tasks & Work', path: '/tasks', icon: CheckSquare, roles: ['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER', 'STAFF', 'TECHNICIAN'] },
    { label: 'Issues & Tickets', path: '/issues', icon: AlertCircle, roles: ['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER', 'STAFF'] },
    { label: 'Assets', path: '/assets', icon: Box, roles: ['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER'] },
    { label: 'Asset Analytics', path: '/assets/analytics', icon: TrendingUp, roles: ['SUPER_ADMIN', 'ADMIN'], adminOnly: true },
    ...(isPrintHubEnabled ? [
      { label: 'Print & WhatsApp Hub', path: '/print-hub', icon: Printer, roles: ['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER', 'STAFF'] }
    ] : []),
    { label: 'Work Orders', path: '/work-orders', icon: ClipboardList, roles: ['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER'] },
    { label: 'My Jobs', path: '/jobs', icon: Wrench, roles: ['TECHNICIAN'] },
    { label: 'PM Schedules', path: '/pm', icon: Calendar, roles: ['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER', 'STAFF'] },
    { label: 'Live Staff', path: '/admin/live-staff', icon: Users, roles: ['SUPER_ADMIN', 'ADMIN'] },
    { label: 'Vendors', path: '/vendors', icon: Truck, roles: ['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER'] },
    { label: 'Technicians', path: '/technicians', icon: Users, roles: ['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER'] },
    { label: 'Parts Inventory', path: '/parts', icon: Package, roles: ['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER', 'TECHNICIAN'] },
    { label: 'Costs & ROI', path: '/costs', icon: IndianRupee, roles: ['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER'] },
    { label: 'Reports', path: '/reports', icon: FileText, roles: ['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER'] },
    { label: 'My Profile', path: '/profile', icon: Settings, roles: ['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER', 'STAFF', 'TECHNICIAN'] },
    { label: 'Audit Logs', path: '/audit', icon: Shield, roles: ['SUPER_ADMIN', 'ADMIN'] },
    { label: 'Settings', path: '/settings', icon: Settings, roles: ['SUPER_ADMIN', 'ADMIN'] },
  ];

  const role = user?.primaryRole || 'STAFF';
  const visibleItems = navItems.filter(i => i.roles.includes(role));

  const renderNavContent = (collapsed: boolean) => (
    <>
      <div className={`p-4 border-b border-[#0f2952] flex items-center h-16 shrink-0 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        <div className="flex items-center gap-2 overflow-hidden" title={collapsed ? "SVV AMS" : undefined}>
          <Building2 className="shrink-0 text-[#0D6EFD]" />
          {!collapsed && <h1 className="text-xl font-bold truncate tracking-wide text-white">SVV AMS</h1>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 overflow-x-hidden">
        <nav className="space-y-1 px-2">
          {visibleItems.map(item => {
            const badge = getBadgeInfo(item.path);
            const isActive = location.pathname.startsWith(item.path);

            return (
              <Link 
                key={item.path} 
                to={item.path} 
                onClick={() => setIsMobileMenuOpen(false)} 
                title={badge ? `${item.label} (${badge.label})` : item.label}
                className={`flex items-center rounded-lg transition-all ${
                  collapsed ? 'justify-center p-2.5 mx-1 relative' : 'gap-3 px-3 py-2'
                } ${
                  isActive
                    ? 'bg-[#0D6EFD] text-white font-semibold shadow-[0_0_14px_rgba(13,110,253,0.45)]'
                    : 'text-gray-300 hover:bg-[#0f2952] hover:text-white'
                }`}
              >
                <div className="relative inline-flex items-center justify-center">
                  <item.icon size={20} className="shrink-0" />
                  {collapsed && badge && (
                    <span className={`absolute -top-1.5 -right-2 px-1 py-0.2 min-w-[16px] h-[16px] rounded-full text-[9px] font-extrabold flex items-center justify-center ${badge.color} ring-2 ring-[#081B3A] shadow-md ${badge.isUrgent ? 'animate-pulse' : ''}`}>
                      {badge.count > 99 ? '99+' : badge.count}
                    </span>
                  )}
                </div>

                {!collapsed && (
                  <>
                    <span className="truncate text-xs font-medium">{item.label}</span>
                    {(item as any).adminOnly && !badge && (
                      <span className="ml-auto px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                        Admin
                      </span>
                    )}
                    {badge && (
                      <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.color} shadow-xs ${badge.isUrgent ? 'animate-pulse' : ''}`}>
                        {badge.count}
                      </span>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className={`p-4 border-t border-[#0f2952] flex flex-col gap-4`}>
        <div className={`flex ${collapsed ? 'justify-center' : 'justify-between items-center'}`}>
          {!collapsed ? (
            <>
              <div className="text-sm min-w-0 pr-2">
                <div className="font-semibold truncate w-full text-xs text-white">{user?.name}</div>
                <div className="text-gray-400 text-[11px] truncate">{user?.primaryRole}</div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => logoutMutation.mutate()}
                loading={logoutMutation.isPending}
                className="text-gray-300 hover:text-white hover:bg-red-900/50 shrink-0"
                title={`Logout (${user?.name})`}
              >
                <LogOut size={16} />
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => logoutMutation.mutate()}
              loading={logoutMutation.isPending}
              className="text-gray-300 hover:text-white hover:bg-red-900/50 shrink-0"
              title={`Logout (${user?.name})`}
            >
              <LogOut size={16} />
            </Button>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <div className={`bg-[#081B3A] text-white flex-col hidden md:flex transition-all duration-300 ease-in-out relative shrink-0 ${isCollapsed ? 'w-[4.5rem]' : 'w-64'}`}>
        {renderNavContent(isCollapsed)}
        {/* Toggle Button for Desktop */}
        <button 
          onClick={toggleCollapse}
          className="absolute -right-3 top-20 bg-[#081B3A] border border-[#0f2952] text-white p-1 rounded-full shadow-md hover:bg-[#0f2952] transition-colors z-50 flex items-center justify-center w-6 h-6"
          title={isCollapsed ? "Expand menu" : "Collapse menu"}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}
      
      {/* Mobile Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#081B3A] text-white flex flex-col transform transition-transform duration-200 ease-in-out md:hidden ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {renderNavContent(false)}
      </div>

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <header className="h-16 bg-white border-b flex items-center justify-between px-4 md:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-md" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu size={24} />
            </button>
            <div className="md:hidden font-bold text-[#1e3a5f]">SVV AMS</div>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <GlobalFilters />
            <NotificationCenter />
          </div>
        </header>
        
        <div className="shrink-0">
          <DailyAlerts />
        </div>
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto w-full relative p-4 md:p-6 bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
