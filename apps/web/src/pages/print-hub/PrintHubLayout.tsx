import React from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import { usePluginSettings } from '@/api/plugins.api';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import {
  MessageSquare, Printer, Monitor, Ticket, Megaphone,
  QrCode, BarChart3, AlertTriangle, Settings, Sparkles
} from 'lucide-react';

export default function PrintHubLayout() {
  const { data: plugins, isLoading } = usePluginSettings();
  // Default to enabled (true) if plugin status is loading or backend is not connected
  const isEnabled = plugins ? plugins.print_whatsapp_hub !== false : true;

  if (isLoading && plugins === undefined) {
    return (
      <div className="py-24 text-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (plugins && plugins.print_whatsapp_hub === false) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-2xl border border-gray-200 text-center shadow-sm space-y-4 font-sans">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Module Disabled</h2>
        <p className="text-xs text-gray-500 leading-relaxed">
          The <strong>Print & WhatsApp Service Hub</strong> plugin is currently disabled in your organization settings.
        </p>
        <Link to="/settings">
          <Button size="sm" className="bg-[#1e3a5f] hover:bg-[#172d4a] text-white text-xs font-semibold mt-2">
            <Settings className="w-3.5 h-3.5 mr-1.5" /> Go to Module Management
          </Button>
        </Link>
      </div>
    );
  }

  const navItems = [
    { label: 'Ticket Queue', path: '/print-hub/queue', icon: Printer, badge: '18', badgeColor: 'bg-blue-100 text-blue-700' },
    { label: 'WhatsApp Inbox & Editor', path: '/print-hub/inbox', icon: MessageSquare, badge: '18', badgeColor: 'bg-emerald-100 text-emerald-700' },
    { label: 'Self Service Orders', path: '/print-hub/self-service', icon: Monitor },
    { label: 'Customer Tokens', path: '/print-hub/tokens', icon: Ticket },
    { label: 'Advertisements', path: '/print-hub/ads', icon: Megaphone },
    { label: 'Branch QR Codes', path: '/print-hub/qr', icon: QrCode },
    { label: 'Analytics & Reports', path: '/print-hub/analytics', icon: BarChart3 },
  ];

  return (
    <div className="space-y-4 font-sans max-w-[1600px] mx-auto pb-16">
      {/* ── Sub Navigation Tabs ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-2xs border border-gray-200 p-1.5 flex items-center gap-1 overflow-x-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-[#081B3A] text-white shadow-xs'
                  : 'text-[#6B7280] hover:text-[#081B3A] hover:bg-[#F1F5F9]'
              }`
            }
          >
            <item.icon className="w-4 h-4 shrink-0" />
            <span>{item.label}</span>
            {item.badge && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${item.badgeColor || 'bg-gray-200 text-gray-800'}`}>
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </div>

      {/* ── Sub Route Content ─────────────────────────────────────────────────── */}
      <Outlet />
    </div>
  );
}
