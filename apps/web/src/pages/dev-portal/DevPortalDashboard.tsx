import React, { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Search, Filter, Clock, MessageSquare, ChevronRight, Code2 } from 'lucide-react';

function getStatusColor(status: string) {
  switch (status) {
    case 'OPEN': return 'bg-green-100 text-green-700 border-green-200';
    case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'NEED_INFO': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'TESTING': return 'bg-purple-100 text-purple-700 border-purple-200';
    case 'COMPLETED_BY_DEV': return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'VERIFIED_BY_SVV': return 'bg-teal-100 text-teal-700 border-teal-200';
    case 'CLOSED': return 'bg-gray-100 text-gray-700 border-gray-200';
    case 'PENDING': return 'bg-amber-100 text-amber-700 border-amber-200';
    default: return 'bg-gray-100 text-gray-600 border-gray-200';
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'OPEN': return 'Open';
    case 'IN_PROGRESS': return 'In Progress';
    case 'NEED_INFO': return 'Need Info';
    case 'TESTING': return 'Testing';
    case 'COMPLETED_BY_DEV': return 'Completed';
    case 'VERIFIED_BY_SVV': return 'Verified';
    case 'CLOSED': return 'Closed';
    default: return status;
  }
}

function getAgeDays(createdAt: string) {
  return Math.floor((new Date().getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
}

export default function DevPortalDashboard() {
  const { token, teamName, stats, issues } = useOutletContext<any>();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const categories = ['all', ...Array.from(new Set(issues?.map((i: any) => i.category?.name).filter(Boolean)))];

  const filtered = (issues || []).filter((i: any) => {
    const matchSearch = !search ||
      i.title?.toLowerCase().includes(search.toLowerCase()) ||
      i.ticketCode?.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'all' || i.category?.name === categoryFilter;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border p-4 text-center shadow-sm">
          <div className="text-2xl font-black text-[#081B3A]">{stats.total}</div>
          <div className="text-[11px] text-gray-500 font-bold uppercase mt-1 tracking-wide">Total</div>
        </div>
        <div className="bg-[#FFF8E6] rounded-xl border border-yellow-200 p-4 text-center shadow-sm">
          <div className="text-2xl font-black text-yellow-600">{stats.pending}</div>
          <div className="text-[11px] text-yellow-700 font-bold uppercase mt-1 tracking-wide">Pending</div>
        </div>
        <div className="bg-[#FEF2F2] rounded-xl border border-red-200 p-4 text-center shadow-sm">
          <div className="text-2xl font-black text-red-600">{stats.overdue}</div>
          <div className="text-[11px] text-red-700 font-bold uppercase mt-1 tracking-wide">Overdue</div>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search tickets..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="px-3 py-2.5 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {(categories as string[]).map(cat => (
            <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</option>
          ))}
        </select>
      </div>

      {/* Ticket List - Step 4 style */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
          <h2 className="font-bold text-[#081B3A]">All Tickets</h2>
          <span className="text-xs text-gray-500">{filtered.length} tickets</span>
        </div>

        <div className="divide-y">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <Code2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No tickets found</p>
            </div>
          ) : filtered.map((issue: any) => {
            const age = getAgeDays(issue.createdAt);
            return (
              <button
                key={issue.id}
                onClick={() => navigate(`/dev-portal/${token}/issues/${issue.id}`)}
                className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex gap-3 items-start"
              >
                {/* Thumbnail */}
                <div className="w-16 h-16 bg-gray-100 rounded-lg border shrink-0 flex items-center justify-center overflow-hidden">
                  {issue.attachments?.[0]?.url ? (
                    <img src={issue.attachments[0].url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Code2 className="w-6 h-6 text-gray-300" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-[#0D6EFD]">{issue.ticketCode}</span>
                      <p className="font-semibold text-sm text-[#081B3A] leading-tight mt-0.5 line-clamp-2">
                        {issue.title || 'Untitled Issue'}
                      </p>
                    </div>
                    <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusColor(issue.status)}`}>
                      {getStatusLabel(issue.status)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-500">
                    <span className={`font-semibold ${
                      issue.priority === 'CRITICAL' ? 'text-red-600' :
                      issue.priority === 'HIGH' ? 'text-orange-600' :
                      issue.priority === 'MEDIUM' ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>{issue.priority}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {age} Days
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {issue.timeline?.length || 0}
                    </span>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 mt-2" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
