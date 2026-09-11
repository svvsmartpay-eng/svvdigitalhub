import React, { useState } from 'react';
import { useDevIssues } from '@/api/devHub.api';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Code, AlertCircle, CheckCircle2, Clock, Search, Filter, Lock, Play, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import ShareIssueButton from '@/components/dev-hub/ShareIssueButton';

const PRIORITY_COLOR: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700', HIGH: 'bg-orange-100 text-orange-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700', LOW: 'bg-green-100 text-green-700',
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Open', ASSIGNED: 'Assigned', IN_PROGRESS: 'In Progress',
  DEV_COMPLETED: 'Dev Completed', TESTING: 'Testing', TEST_FAILED: 'Test Failed',
  REOPENED: 'Reopened', READY_FOR_DEPLOY: 'Ready for Deploy',
  CLOSED: 'Closed', NEED_INFO: 'Need Info', COMPLETED_BY_DEV: 'Dev Completed',
  VERIFIED_BY_SVV: 'Verified',
};

const STATUS_COLOR: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-700', ASSIGNED: 'bg-purple-100 text-purple-700',
  IN_PROGRESS: 'bg-orange-100 text-orange-700', DEV_COMPLETED: 'bg-teal-100 text-teal-700',
  TESTING: 'bg-yellow-100 text-yellow-700', TEST_FAILED: 'bg-red-100 text-red-700',
  REOPENED: 'bg-orange-100 text-orange-700', READY_FOR_DEPLOY: 'bg-indigo-100 text-indigo-700',
  CLOSED: 'bg-gray-200 text-gray-700', NEED_INFO: 'bg-amber-100 text-amber-700',
  COMPLETED_BY_DEV: 'bg-teal-100 text-teal-700', VERIFIED_BY_SVV: 'bg-green-100 text-green-700',
};

function getAgeDays(d: string) {
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}

export default function DevHubDashboard() {
  const { data: issues, isLoading } = useDevIssues();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  const stats = {
    total: issues?.length || 0,
    open: issues?.filter((i: any) => ['OPEN', 'ASSIGNED'].includes(i.status)).length || 0,
    inProgress: issues?.filter((i: any) => ['IN_PROGRESS', 'DEV_COMPLETED', 'TESTING', 'TEST_FAILED', 'REOPENED'].includes(i.status)).length || 0,
    overdue: issues?.filter((i: any) => i.dueDate && new Date(i.dueDate) < new Date() && i.status !== 'CLOSED').length || 0,
    completed: issues?.filter((i: any) => ['CLOSED', 'READY_FOR_DEPLOY'].includes(i.status)).length || 0,
  };

  const filtered = (issues || []).filter((i: any) => {
    const q = search.toLowerCase();
    const matchSearch = !q || i.title?.toLowerCase().includes(q) || i.ticketCode?.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q);
    const matchStatus = !filterStatus || i.status === filterStatus;
    const matchPriority = !filterPriority || i.priority === filterPriority;
    return matchSearch && matchStatus && matchPriority;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeader title="Developer Issue Hub" subtitle="Track • Collaborate • Resolve • Deliver" />
        <Link to="/settings/dev-hub/create">
          <Button className="bg-[#0D6EFD] text-white">
            <Plus className="w-4 h-4 mr-2" /> Create Ticket
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: stats.total, icon: <Code className="w-4 h-4" />, cls: 'bg-blue-50 border-blue-200 text-blue-700' },
          { label: 'Open', value: stats.open, icon: <AlertCircle className="w-4 h-4" />, cls: 'bg-orange-50 border-orange-200 text-orange-700' },
          { label: 'In Progress', value: stats.inProgress, icon: <Play className="w-4 h-4" />, cls: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
          { label: 'Overdue', value: stats.overdue, icon: <Clock className="w-4 h-4" />, cls: 'bg-red-50 border-red-200 text-red-700' },
          { label: 'Completed', value: stats.completed, icon: <CheckCircle2 className="w-4 h-4" />, cls: 'bg-green-50 border-green-200 text-green-700' },
        ].map(s => (
          <Card key={s.label} className={`border ${s.cls}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">{s.icon} <span className="text-xs font-bold">{s.label}</span></div>
              <span className="text-2xl font-black text-gray-900">{s.value}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search tickets…"
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="py-2 px-3 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
          <option value="">All Statuses</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
          className="py-2 px-3 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
          <option value="">All Priorities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
        {(search || filterStatus || filterPriority) && (
          <Button variant="outline" size="sm" onClick={() => { setSearch(''); setFilterStatus(''); setFilterPriority(''); }}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Tickets List */}
      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Code className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">{issues?.length === 0 ? 'No tickets yet. Create your first ticket!' : 'No tickets match your filters.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((issue: any) => {
            const age = getAgeDays(issue.createdAt);
            const pCls = PRIORITY_COLOR[issue.priority] || 'bg-gray-100 text-gray-600';
            const sCls = STATUS_COLOR[issue.status] || 'bg-gray-100 text-gray-600';
            const statusLabel = STATUS_LABELS[issue.status] || issue.status;
            const firstImage = issue.attachments?.find((a: any) => a.type === 'IMAGE');

            return (
              <Card key={issue.id} className="hover:shadow-md transition-shadow border-gray-200">
                <CardContent className="p-0">
                  <div className="flex gap-0">
                    {/* Priority strip */}
                    <div className={`w-1 rounded-l-xl shrink-0 ${
                      issue.priority === 'CRITICAL' ? 'bg-red-500' :
                      issue.priority === 'HIGH' ? 'bg-orange-500' :
                      issue.priority === 'MEDIUM' ? 'bg-yellow-500' : 'bg-green-500'
                    }`} />

                    {/* Thumbnail */}
                    <div className="w-24 h-24 bg-gray-50 shrink-0 flex items-center justify-center border-r border-gray-100">
                      {firstImage ? (
                        <img src={firstImage.url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Code className="w-7 h-7 text-gray-200" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-4 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <Link to={`/settings/dev-hub/issues/${issue.id}`}
                          className="font-bold text-sm text-gray-900 hover:text-blue-600 transition-colors line-clamp-1">
                          <span className="text-blue-600 mr-1">{issue.ticketCode}</span>
                          {issue.title}
                        </Link>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {issue.status === 'CLOSED' && <Lock className="w-3.5 h-3.5 text-gray-400" />}
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${sCls}`}>{statusLabel}</span>
                        </div>
                      </div>

                      <p className="text-xs text-gray-500 line-clamp-1 mb-2">
                        {(issue.description || '').replace(/<[^>]*>/g, '').substring(0, 100)}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${pCls}`}>{issue.priority}</span>
                          {issue.category?.name && (
                            <span className="text-[11px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{issue.category.name}</span>
                          )}
                          {issue.assignedTeam?.name && (
                            <span className="text-[11px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{issue.assignedTeam.name}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] text-gray-400">{age}d ago</span>
                          {issue.attachments?.length > 0 && (
                            <span className="text-[11px] text-gray-400">{issue.attachments.length} files</span>
                          )}
                          <ShareIssueButton issue={issue} allIssues={issues} />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Count footer */}
      {filtered.length > 0 && (
        <p className="text-xs text-gray-400 text-center">
          Showing {filtered.length} of {issues?.length} tickets
        </p>
      )}
    </div>
  );
}
