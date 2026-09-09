import React from 'react';
import { Outlet, useParams, useNavigate, useLocation } from 'react-router-dom';
import { usePortalDashboard } from '@/api/devHub.api';
import { Loader2, LayoutDashboard, Ticket, Plus, BarChart3, MoreHorizontal } from 'lucide-react';

export default function DevPortalLayout() {
  const { token } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { data, isLoading, error } = usePortalDashboard(token as string);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
        <div className="w-12 h-12 bg-[#081B3A] rounded-xl flex items-center justify-center">
          <span className="text-white font-black text-xs">SVV</span>
        </div>
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <p className="text-sm text-gray-500">Loading Developer Portal...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4 px-6 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
          <span className="text-3xl">⚠️</span>
        </div>
        <h2 className="font-bold text-[#081B3A] text-xl">Invalid Developer Token</h2>
        <p className="text-sm text-gray-500">This link may be expired or invalid.<br />Please contact SVV Pay admin for a new link.</p>
      </div>
    );
  }

  const teamName = data.team?.name || 'Developer Team';
  const issues = data.issues || [];
  const stats = {
    total: issues.length,
    pending: issues.filter((i: any) => !['CLOSED', 'VERIFIED_BY_SVV'].includes(i.status)).length,
    completed: issues.filter((i: any) => ['CLOSED', 'COMPLETED_BY_DEV', 'VERIFIED_BY_SVV'].length).length,
    inProgress: issues.filter((i: any) => i.status === 'IN_PROGRESS').length,
  };

  // Determine if we're on the issue detail page (hide bottom nav)
  const isDetailPage = location.pathname.includes('/issues/');

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col max-w-md mx-auto">
      {/* Top Header */}
      <header className="bg-[#081B3A] text-white px-4 pt-10 pb-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* SVV Pay Logo Text */}
            <div className="bg-white rounded-md px-2 py-0.5">
              <span className="text-[#081B3A] font-black text-sm">SVV</span>
              <span className="text-blue-600 font-black text-sm">'PAY</span>
            </div>
            <div>
              <div className="text-[10px] text-blue-300 leading-tight">Digital Services for Everyone</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-xs text-blue-300">Developer Hub</div>
              <div className="text-xs font-bold text-white truncate max-w-[120px]">{teamName}</div>
            </div>
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xs">{teamName[0]?.toUpperCase()}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        <Outlet context={{ token, teamName, stats, issues }} />
      </main>

      {/* Bottom Navigation (like reference image step 3-4) */}
      {!isDetailPage && (
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t shadow-lg z-10">
          <div className="grid grid-cols-5 h-16">
            {[
              { icon: LayoutDashboard, label: 'Dashboard', path: `/dev-portal/${token}` },
              { icon: Ticket, label: 'Tickets', path: `/dev-portal/${token}` },
              { icon: Plus, label: 'Create', path: '#', highlight: true },
              { icon: BarChart3, label: 'Reports', path: '#' },
              { icon: MoreHorizontal, label: 'More', path: '#' },
            ].map(({ icon: Icon, label, path, highlight }) => {
              const isActive = location.pathname === path;
              return (
                <button
                  key={label}
                  onClick={() => path !== '#' && navigate(path)}
                  className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                    highlight
                      ? 'text-blue-600'
                      : isActive
                      ? 'text-[#081B3A]'
                      : 'text-gray-400'
                  }`}
                >
                  {highlight ? (
                    <div className="w-10 h-10 bg-[#0D6EFD] rounded-full flex items-center justify-center -mt-4 shadow-lg">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                  <span className="text-[10px] font-medium">{label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
