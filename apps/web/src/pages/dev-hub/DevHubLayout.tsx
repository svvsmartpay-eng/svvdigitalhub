
import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, PlayCircle, CheckCircle2, AlertTriangle, Tags, Users, FileBarChart } from 'lucide-react';

export default function DevHubLayout() {
  const location = useLocation();

  const menu = [
    { name: 'Dashboard', path: '/settings/dev-hub', icon: LayoutDashboard },
    { name: 'Create Issue', path: '/settings/dev-hub/create', icon: PlusCircle },
    { name: 'Running Issues', path: '/settings/dev-hub/running', icon: PlayCircle },
    { name: 'Completed Issues', path: '/settings/dev-hub/completed', icon: CheckCircle2 },
    { name: 'Overdue Issues', path: '/settings/dev-hub/overdue', icon: AlertTriangle },
    { name: 'Categories', path: '/settings/dev-hub/categories', icon: Tags },
    { name: 'Developer Teams', path: '/settings/dev-hub/teams', icon: Users },
    { name: 'Reports', path: '/settings/dev-hub/reports', icon: FileBarChart },
  ];

  return (
    <div className="flex h-full min-h-[80vh] gap-6 bg-slate-50 p-4 rounded-lg">
      <div className="w-64 shrink-0">
        <div className="bg-white rounded-lg shadow-sm border p-4 space-y-1">
          <h3 className="font-bold text-gray-800 mb-4 px-2 uppercase text-xs tracking-wider">Issue Hub Menu</h3>
          {menu.map(item => {
            const isActive = location.pathname === item.path || (item.path !== '/settings/dev-hub' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={"flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors " + (isActive ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:bg-slate-100")}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </Link>
            )
          })}
        </div>
      </div>
      <div className="flex-1 overflow-x-hidden">
        <Outlet />
      </div>
    </div>
  );
}
