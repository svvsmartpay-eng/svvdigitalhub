
import React from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { usePortalDashboard } from '@/api/devHub.api';
import { Loader2, Code2 } from 'lucide-react';

export default function DevPortalLayout() {
  const { token } = useParams();
  const { data, isLoading, error } = usePortalDashboard(token as string);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-blue-600"/></div>;
  if (error || !data) return <div className="min-h-screen flex items-center justify-center bg-slate-50">Invalid or Expired Developer Token</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-700 font-bold text-xl">
            <Code2 className="w-6 h-6" /> SVV Developer Portal
          </div>
          <div className="text-sm font-medium text-slate-600">
            Welcome, {data.teamName}
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">
        <Outlet context={{ token, teamName: data.teamName, stats: data.stats, issues: data.issues }} />
      </main>
    </div>
  );
}
