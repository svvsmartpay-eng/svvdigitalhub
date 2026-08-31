import React, { useState, useEffect, useMemo } from 'react';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import {
  useIssues, useIssueStats, useUpdateIssueStatus, useAssignIssue,
  useAddIssueComment, useBulkAssignIssues, useBulkUpdateIssueStatus
} from '@/api/issues.api';
import { useUsers } from '@/api/users.api';
import { useBranches } from '@/api/branches.api';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { mediaUrl } from '@/lib/media';
import {
  Search, AlertCircle, Plus, LayoutList, Clock, AlertTriangle,
  X, ArrowRight, UserCheck, Timer, Box, Building2,
  MessageSquare, UserPlus, ArrowUpRight, Check, XCircle,
  Download, Filter, Calendar, CheckSquare, Square, RefreshCw,
  Zap, Paperclip, Send, Eye, ChevronRight, FileText,
  User as UserIcon, Wrench, Layers, Tag
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  if (!name) return '??';
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.substring(0, 2).toUpperCase();
}

function formatDuration(ms: number): string {
  if (ms <= 0) return '0m';
  const totalSeconds = Math.floor(ms / 1000);
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || parts.length === 0) parts.push(`${m}m`);
  return parts.join(' ');
}

function formatTimeAgo(d: Date | string | null | undefined): string {
  if (!d) return '—';
  const diff = Date.now() - new Date(d).getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function getSmartStage(issue: any) {
  if (issue.status === 'CLOSED') return { label: 'Closed', color: 'bg-gray-100 text-gray-700 border-gray-200' };
  if (issue.status === 'RESOLVED') return { label: 'Resolved (Verify)', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
  if (issue.status === 'ESCALATED') return { label: 'Escalated', color: 'bg-red-100 text-red-800 border-red-300 font-bold' };

  if (issue.status === 'OPEN' && !issue.assignedToId) {
    return { label: 'Waiting Manager (Assign)', color: 'bg-amber-50 text-amber-800 border-amber-200' };
  }
  if (issue.status === 'IN_PROGRESS' || (issue.status === 'OPEN' && issue.assignedToId)) {
    return { label: 'Waiting Tech (Fix)', color: 'bg-indigo-50 text-indigo-800 border-indigo-200' };
  }
  return { label: issue.status?.replace(/_/g, ' '), color: 'bg-blue-50 text-blue-800 border-blue-200' };
}

function getPendingWith(issue: any) {
  if (issue.status === 'CLOSED') return '—';
  if (issue.status === 'RESOLVED') return issue.raisedBy?.name || 'Staff';
  if (issue.status === 'ESCALATED') return 'Management';
  if (!issue.assignedToId) return 'Manager';
  return issue.assignedTo?.name || 'Technician';
}

function SlaBadge({ slaDate, status }: { slaDate: Date | string | null; status: string }) {
  if (!slaDate || ['CLOSED', 'CANCELLED'].includes(status)) {
    return <span className="text-gray-400 text-[11px]">—</span>;
  }
  const diff = new Date(slaDate).getTime() - Date.now();
  const isBreached = diff < 0;
  const isWarning = !isBreached && diff < 4 * 3600000;

  if (isBreached) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200 whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
        Overdue {formatDuration(-diff)}
      </span>
    );
  }
  if (isWarning) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200 whitespace-nowrap">
        ⏱ {formatDuration(diff)} left
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap">
      ✓ {formatDuration(diff)} left
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function IssueListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();
  const role = user?.primaryRole || 'STAFF';
  const isManagerOrAdmin = ['ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'].includes(role);

  // Standard Dimension Filter States
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [staffFilter, setStaffFilter] = useState('');
  const [technicianFilter, setTechnicianFilter] = useState('');
  const [issueTypeFilter, setIssueTypeFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [priorityFilter, setPriorityFilter] = useState(searchParams.get('priority') || '');
  const [datePreset, setDatePreset] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'CUSTOM'>('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [myActionOnly, setMyActionOnly] = useState(false);

  // Selection & Bulk Action States
  const [selectedIssueIds, setSelectedIssueIds] = useState<string[]>([]);
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [bulkAssigneeId, setBulkAssigneeId] = useState('');

  // Quick Action Modals
  const [quickReplyIssue, setQuickReplyIssue] = useState<any | null>(null);
  const [quickReplyText, setQuickReplyText] = useState('');
  const [quickReplyFiles, setQuickReplyFiles] = useState<File[]>([]);
  const replyFileInputRef = React.useRef<HTMLInputElement>(null);

  const [quickAssignIssue, setQuickAssignIssue] = useState<any | null>(null);
  const [quickAssigneeId, setQuickAssigneeId] = useState('');

  // Unread / Viewed Tickets Tracking
  const [viewedTimestamps, setViewedTimestamps] = useState<Record<string, number>>(() => {
    try {
      const raw = localStorage.getItem(`svv_viewed_tickets_${user?.sub}`);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const markTicketViewed = (issueId: string) => {
    setViewedTimestamps(prev => {
      const updated = { ...prev, [issueId]: Date.now() };
      try {
        localStorage.setItem(`svv_viewed_tickets_${user?.sub}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const getUnreadStatus = (issue: any) => {
    const comments = issue.IssueComment || [];
    if (comments.length === 0) return { hasUnread: false, unreadCount: 0, lastComment: undefined };
    const lastComment = comments[comments.length - 1];
    const isFromOther = lastComment.userId !== user?.sub;
    const lastViewed = viewedTimestamps[issue.id] || 0;
    const isNew = isFromOther && new Date(lastComment.createdAt).getTime() > lastViewed;
    const unreadCount = comments.filter((c: any) => c.userId !== user?.sub && new Date(c.createdAt).getTime() > lastViewed).length;
    return { hasUnread: isNew, unreadCount: unreadCount || (isNew ? 1 : 0), lastComment };
  };

  // API Queries & Mutations
  const { data: usersResponse } = useUsers({ limit: 100 });
  const { data: branchesResponse } = useBranches();
  const rawUsers: any[] = Array.isArray(usersResponse) ? usersResponse : usersResponse?.data || [];
  const rawBranches: any[] = Array.isArray(branchesResponse) ? branchesResponse : branchesResponse?.data || [];

  // Filter staff vs technicians for dropdowns
  const staffUsers = useMemo(() => {
    return rawUsers.filter(u => {
      const r = u.primaryRole || u.roles?.[0]?.type || 'STAFF';
      return ['STAFF', 'ADMIN', 'BRANCH_MANAGER'].includes(r);
    });
  }, [rawUsers]);

  const technicianUsers = useMemo(() => {
    return rawUsers.filter(u => {
      const r = u.primaryRole || u.roles?.[0]?.type || '';
      return ['TECHNICIAN', 'STAFF', 'BRANCH_MANAGER'].includes(r);
    });
  }, [rawUsers]);

  const updateStatusMutation = useUpdateIssueStatus();
  const assignMutation = useAssignIssue();
  const addCommentMutation = useAddIssueComment();
  const bulkAssignMutation = useBulkAssignIssues();
  const bulkStatusMutation = useBulkUpdateIssueStatus();

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(handler);
  }, [search]);

  // Compute date range from preset
  const computedDateRange = useMemo(() => {
    const now = new Date();
    if (datePreset === 'TODAY') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      return { dateFrom: start, dateTo: now.toISOString() };
    }
    if (datePreset === 'YESTERDAY') {
      const yestStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const yestEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
      return { dateFrom: yestStart.toISOString(), dateTo: yestEnd.toISOString() };
    }
    if (datePreset === 'THIS_WEEK') {
      const day = now.getDay() || 7;
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1).toISOString();
      return { dateFrom: start, dateTo: now.toISOString() };
    }
    if (datePreset === 'THIS_MONTH') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      return { dateFrom: start, dateTo: now.toISOString() };
    }
    if (datePreset === 'CUSTOM' && customStartDate) {
      return {
        dateFrom: new Date(customStartDate).toISOString(),
        dateTo: customEndDate ? new Date(customEndDate + 'T23:59:59').toISOString() : now.toISOString(),
      };
    }
    return {};
  }, [datePreset, customStartDate, customEndDate]);

  // Construct query parameters
  const queryParams: any = { limit: 100 };
  if (debouncedSearch) queryParams.search = debouncedSearch;
  if (statusFilter) queryParams.status = statusFilter;
  if (priorityFilter) queryParams.priority = priorityFilter;
  if (staffFilter) queryParams.raisedById = staffFilter;
  if (technicianFilter) queryParams.assignedToId = technicianFilter;
  if (issueTypeFilter) queryParams.issueType = issueTypeFilter;
  if (branchFilter) queryParams.branchId = branchFilter;
  if (computedDateRange.dateFrom) queryParams.dateFrom = computedDateRange.dateFrom;
  if (computedDateRange.dateTo) queryParams.dateTo = computedDateRange.dateTo;

  const { data, isLoading, isError, error, refetch } = useIssues(queryParams);
  const { data: stats } = useIssueStats();

  const rawIssuesList: any[] = Array.isArray(data) ? data : data?.data || [];

  const issuesList = useMemo(() => {
    if (myActionOnly) {
      return rawIssuesList.filter((i: any) => i.requiresMyAction);
    }
    return rawIssuesList;
  }, [rawIssuesList, myActionOnly]);

  const resetAllFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setStaffFilter('');
    setTechnicianFilter('');
    setIssueTypeFilter('');
    setBranchFilter('');
    setStatusFilter('');
    setPriorityFilter('');
    setDatePreset('ALL');
    setCustomStartDate('');
    setCustomEndDate('');
    setMyActionOnly(false);
    setSearchParams({});
  };

  const isAnyFilterActive = !!(
    search || staffFilter || technicianFilter || issueTypeFilter ||
    branchFilter || statusFilter || priorityFilter || datePreset !== 'ALL' || myActionOnly
  );

  // Bulk Selection Handlers
  const handleSelectAll = () => {
    if (selectedIssueIds.length === issuesList.length) {
      setSelectedIssueIds([]);
    } else {
      setSelectedIssueIds(issuesList.map((i) => i.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIssueIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkStatus = (status: string) => {
    if (selectedIssueIds.length === 0) return;
    if (window.confirm(`Update ${selectedIssueIds.length} tickets to ${status}?`)) {
      bulkStatusMutation.mutate(
        { issueIds: selectedIssueIds, status },
        { onSuccess: () => setSelectedIssueIds([]) }
      );
    }
  };

  const handleBulkAssignSubmit = () => {
    if (!bulkAssigneeId || selectedIssueIds.length === 0) return;
    bulkAssignMutation.mutate(
      { issueIds: selectedIssueIds, assignedToId: bulkAssigneeId },
      {
        onSuccess: () => {
          setSelectedIssueIds([]);
          setShowBulkAssign(false);
          setBulkAssigneeId('');
        },
      }
    );
  };

  const handleExportCSV = () => {
    const itemsToExport = selectedIssueIds.length > 0
      ? issuesList.filter(i => selectedIssueIds.includes(i.id))
      : issuesList;

    const headers = ['Ticket ID', 'Title', 'Asset', 'Branch', 'Type', 'Priority', 'Status', 'Assigned To', 'Raised By', 'Created At'];
    const rows = itemsToExport.map(i => [
      i.issueNo,
      `"${(i.title || '').replace(/"/g, '""')}"`,
      `"${i.asset?.name || ''}"`,
      `"${i.branch?.name || ''}"`,
      i.issueType || 'General',
      i.priority,
      i.status,
      i.assignedTo?.name || 'Unassigned',
      i.raisedBy?.name || '',
      new Date(i.createdAt).toISOString(),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `tickets_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSendQuickReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickReplyIssue || (!quickReplyText.trim() && quickReplyFiles.length === 0)) return;
    addCommentMutation.mutate(
      {
        id: quickReplyIssue.id,
        content: quickReplyText.trim(),
        attachments: quickReplyFiles.length > 0 ? quickReplyFiles : undefined,
      },
      {
        onSuccess: () => {
          setQuickReplyIssue(null);
          setQuickReplyText('');
          setQuickReplyFiles([]);
        },
      }
    );
  };

  const handleQuickAssignSubmit = () => {
    if (!quickAssignIssue || !quickAssigneeId) return;
    assignMutation.mutate(
      { id: quickAssignIssue.id, assigneeId: quickAssigneeId },
      {
        onSuccess: () => {
          setQuickAssignIssue(null);
          setQuickAssigneeId('');
        },
      }
    );
  };

  return (
    <div className="space-y-4 font-sans">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <PageHeader
        title="Issues & Work Management"
        subtitle="Operational action center for tracking, assignments, and ticket SLA resolution."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="bg-white text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50"
            >
              <Download className="w-3.5 h-3.5 mr-1 text-[#1e3a5f]" /> Export ({issuesList.length})
            </Button>
            <Link to="/issues/raise">
              <Button size="sm" className="bg-[#1e3a5f] hover:bg-[#172d4a] text-white shadow-2xs text-xs font-semibold">
                <Plus className="w-3.5 h-3.5 mr-1" /> Raise Ticket
              </Button>
            </Link>
          </div>
        }
      />

      {/* ── Smart Overview KPI Cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        <div
          onClick={() => { setStatusFilter(''); setTechnicianFilter(''); }}
          className={`cursor-pointer rounded-xl p-3 border transition-all shadow-2xs bg-white hover:border-[#1e3a5f] ${
            !statusFilter && !technicianFilter ? 'ring-1 ring-[#1e3a5f] border-[#1e3a5f]' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-gray-700">Total Tickets</span>
            <LayoutList className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-xl font-bold font-mono text-gray-900">{stats?.total || 0}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">All tickets in system</div>
        </div>

        <div
          onClick={() => setStatusFilter('OPEN')}
          className={`cursor-pointer rounded-xl p-3 border transition-all shadow-2xs bg-white hover:border-amber-400 ${
            statusFilter === 'OPEN' ? 'ring-1 ring-amber-500 border-amber-500 bg-amber-50/20' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-amber-800">Open / Pending</span>
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-900">{stats?.open || 0}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">Needs action / assignment</div>
        </div>

        <div
          onClick={() => setStatusFilter('IN_PROGRESS')}
          className={`cursor-pointer rounded-xl p-3 border transition-all shadow-2xs bg-white hover:border-indigo-400 ${
            statusFilter === 'IN_PROGRESS' ? 'ring-1 ring-indigo-500 border-indigo-500 bg-indigo-50/20' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-indigo-800">In Progress / Active</span>
            <Clock className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="text-xl font-bold font-mono text-indigo-900">{stats?.inProgress || 0}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">Being resolved by technician</div>
        </div>

        <div
          onClick={() => setStatusFilter('RESOLVED')}
          className={`cursor-pointer rounded-xl p-3 border transition-all shadow-2xs bg-white hover:border-emerald-400 ${
            statusFilter === 'RESOLVED' ? 'ring-1 ring-emerald-500 border-emerald-500 bg-emerald-50/20' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-emerald-800">Resolved (Verify)</span>
            <Check className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-900">{stats?.resolved || stats?.byStatus?.find((s: any) => s.status === 'RESOLVED')?._count || 0}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">Pending manager sign-off</div>
        </div>

        <div
          onClick={() => setStatusFilter('CLOSED')}
          className={`cursor-pointer rounded-xl p-3 border transition-all shadow-2xs bg-white hover:border-gray-400 ${
            statusFilter === 'CLOSED' ? 'ring-1 ring-gray-600 border-gray-600 bg-gray-50' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-gray-800">Completed / Closed</span>
            <CheckSquare className="w-3.5 h-3.5 text-gray-600" />
          </div>
          <div className="text-xl font-bold font-mono text-gray-900">{stats?.closed || stats?.byStatus?.find((s: any) => s.status === 'CLOSED')?._count || 0}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">Closed and archived</div>
        </div>
      </div>

      {/* ── EXPANDED STANDARD FILTER TOOLBAR ───────────────────────────────── */}
      <div className="bg-white p-4 rounded-xl shadow-2xs border border-gray-200 space-y-3">
        {/* Row 1: Search & Date Range Toolbar */}
        <div className="flex flex-col md:flex-row gap-2.5 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by ticket #, title, asset name, or keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs h-9 rounded-lg"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Date Range Selector */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-300 rounded-lg px-2.5 h-9">
              <Calendar className="w-3.5 h-3.5 text-gray-500" />
              <select
                className="bg-transparent text-xs font-medium text-gray-700 focus:outline-none cursor-pointer"
                value={datePreset}
                onChange={(e) => setDatePreset(e.target.value as any)}
              >
                <option value="ALL">All Dates</option>
                <option value="TODAY">Today</option>
                <option value="YESTERDAY">Yesterday</option>
                <option value="THIS_WEEK">This Week</option>
                <option value="THIS_MONTH">This Month</option>
                <option value="CUSTOM">Custom Range...</option>
              </select>
            </div>

            {/* Custom Date Pickers */}
            {datePreset === 'CUSTOM' && (
              <div className="flex items-center gap-1.5 animate-in fade-in">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="h-9 px-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
                />
                <span className="text-gray-400 text-xs">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="h-9 px-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
                />
              </div>
            )}

            {/* Reset Button */}
            {isAnyFilterActive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetAllFilters}
                className="h-9 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 font-semibold"
              >
                <X className="w-3.5 h-3.5 mr-1" /> Reset All Filters
              </Button>
            )}
          </div>
        </div>

        {/* Row 2: Standard Dimensional Dropdown Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1 border-t border-gray-100">
          {/* 1. Filter by Staff / Reporter */}
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <UserIcon className="w-3 h-3 text-[#1e3a5f]" /> By Staff
            </label>
            <select
              className="w-full h-8 rounded-lg border border-gray-300 bg-white px-2 text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
            >
              <option value="">All Staff / Reporters</option>
              {staffUsers.map((u: any) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          {/* 2. Filter by Technician / Assigned */}
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Wrench className="w-3 h-3 text-[#1e3a5f]" /> By Technician
            </label>
            <select
              className="w-full h-8 rounded-lg border border-gray-300 bg-white px-2 text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
              value={technicianFilter}
              onChange={(e) => setTechnicianFilter(e.target.value)}
            >
              <option value="">All Technicians</option>
              {technicianUsers.map((u: any) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          {/* 3. Filter by Issue Type */}
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Tag className="w-3 h-3 text-[#1e3a5f]" /> By Issue Type
            </label>
            <select
              className="w-full h-8 rounded-lg border border-gray-300 bg-white px-2 text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
              value={issueTypeFilter}
              onChange={(e) => setIssueTypeFilter(e.target.value)}
            >
              <option value="">All Issue Types</option>
              <option value="BREAKDOWN">Breakdown</option>
              <option value="NETWORK">Network / Signal</option>
              <option value="ELECTRICAL">Electrical</option>
              <option value="MECHANICAL">Mechanical</option>
              <option value="SOFTWARE">Software / OS</option>
              <option value="STRUCTURAL">Structural</option>
              <option value="OTHER">Other Issue</option>
            </select>
          </div>

          {/* 4. Filter by Branch */}
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-[#1e3a5f]" /> By Branch
            </label>
            <select
              className="w-full h-8 rounded-lg border border-gray-300 bg-white px-2 text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
            >
              <option value="">All Branches</option>
              {rawBranches.map((b: any) => (
                <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
              ))}
            </select>
          </div>

          {/* 5. Filter by Status */}
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Layers className="w-3 h-3 text-[#1e3a5f]" /> By Status
            </label>
            <select
              className="w-full h-8 rounded-lg border border-gray-300 bg-white px-2 text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="OPEN">Open (All)</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress / Active</option>
              <option value="WAITING_FOR_PARTS">Waiting for Parts</option>
              <option value="ESCALATED">Escalated</option>
              <option value="RESOLVED">Resolved (Pending Verification)</option>
              <option value="CLOSED">Completed / Closed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* 6. Filter by Priority */}
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-[#1e3a5f]" /> By Priority
            </label>
            <select
              className="w-full h-8 rounded-lg border border-gray-300 bg-white px-2 text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="">All Priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Real-Time Work Queue Table ─────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-2xs border border-gray-200 overflow-hidden">
        {/* Table Selection Actions Header Bar (Appears in place of regular header when items checked) */}
        {selectedIssueIds.length > 0 && (
          <div className="bg-blue-50/90 border-b border-blue-200 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 font-semibold text-[#1e3a5f]">
              <span className="bg-[#1e3a5f] text-white px-2 py-0.5 rounded-full font-mono text-[11px]">
                {selectedIssueIds.length}
              </span>
              <span>Tickets Selected</span>
            </div>

            <div className="flex items-center gap-1.5">
              {isManagerOrAdmin && (
                <Button
                  size="sm"
                  onClick={() => setShowBulkAssign(true)}
                  className="h-7 text-xs bg-[#1e3a5f] hover:bg-[#172d4a] text-white font-semibold"
                >
                  <UserPlus className="w-3 h-3 mr-1" /> Bulk Assign
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkStatus('IN_PROGRESS')}
                className="h-7 text-xs bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50"
              >
                Mark In Progress
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkStatus('RESOLVED')}
                className="h-7 text-xs bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50"
              >
                Mark Resolved
              </Button>
              {isManagerOrAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkStatus('CLOSED')}
                  className="h-7 text-xs bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                >
                  Close
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIssueIds([])}
                className="h-7 text-xs text-gray-500 hover:text-gray-700"
              >
                Deselect All
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-xs text-gray-500">
            <LoadingSpinner size="md" />
            <span>Refreshing tickets...</span>
          </div>
        ) : isError ? (
          <div className="p-8 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
            <p className="text-sm font-semibold text-red-700">Failed to load tickets</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
          </div>
        ) : issuesList.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
              <Check className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-gray-800">No tickets found matching your filter criteria.</p>
            <p className="text-xs text-gray-400 mt-1">Try clearing some filters to view more tickets.</p>
            {isAnyFilterActive && (
              <Button size="sm" variant="outline" onClick={resetAllFilters} className="mt-3 text-xs">
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/80 text-gray-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="w-8 px-3 py-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIssueIds.length === issuesList.length && issuesList.length > 0}
                      onChange={handleSelectAll}
                      className="rounded text-[#1e3a5f] focus:ring-0 cursor-pointer"
                    />
                  </th>
                  <th className="px-3 py-2.5">Ticket & Asset</th>
                  <th className="px-3 py-2.5">Priority & SLA</th>
                  <th className="px-3 py-2.5">Status & Pending Action</th>
                  <th className="px-3 py-2.5">Assigned To</th>
                  <th className="px-3 py-2.5">Latest Update</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {issuesList.map((issue) => {
                  const isChecked = selectedIssueIds.includes(issue.id);
                  const stage = getSmartStage(issue);
                  const pending = getPendingWith(issue);
                  const lastComment = issue.IssueComment?.[0];
                  const totalReplies = issue._count?.IssueComment || (issue.IssueComment?.length || 0);

                  return (
                    <tr
                      key={issue.id}
                      onClick={() => navigate(`/issues/${issue.id}`)}
                      className={`hover:bg-blue-50/40 cursor-pointer transition-colors group ${
                        isChecked ? 'bg-blue-50/60' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(issue.id)}
                          className="rounded text-[#1e3a5f] focus:ring-0 cursor-pointer"
                        />
                      </td>

                      {/* 1. Ticket & Asset Info */}
                      <td className="px-3 py-3 max-w-[240px]">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="font-mono font-bold text-xs text-[#1e3a5f] group-hover:underline">
                            {issue.issueNo}
                          </span>
                          <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded font-medium">
                            {issue.branch?.code || issue.branch?.name || 'Main'}
                          </span>
                        </div>
                        <p className="font-semibold text-xs text-gray-900 truncate" title={issue.title}>
                          {issue.title}
                        </p>
                        <p className="text-[11px] text-gray-500 truncate flex items-center gap-1 mt-0.5">
                          <Box className="w-3 h-3 text-gray-400 shrink-0" />
                          <span>{issue.asset?.name || 'General Facility'}</span>
                          {issue.issueType && (
                            <span className="text-gray-400 capitalize">· {issue.issueType.toLowerCase()}</span>
                          )}
                        </p>
                      </td>

                      {/* 2. Priority & SLA Target */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                          <StatusBadge status={issue.priority} size="sm" />
                          <SlaBadge slaDate={issue.slaResolutionDue} status={issue.status} />
                        </div>
                      </td>

                      {/* 3. Status & Pending Action */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                          <StatusBadge status={issue.status} size="sm" />
                          <span className="text-[10px] text-gray-500 flex items-center gap-1">
                            <span>Pending:</span>
                            <strong className="text-gray-700">{pending}</strong>
                          </span>
                        </div>
                      </td>

                      {/* 4. Assigned To */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        {issue.assignedTo ? (
                          <div className="flex items-center gap-1.5 font-medium text-gray-900">
                            <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">
                              {getInitials(issue.assignedTo.name)}
                            </div>
                            <div className="flex flex-col">
                              <span className="truncate max-w-[100px] text-xs font-semibold">{issue.assignedTo.name}</span>
                              <span className="text-[10px] text-gray-400">Technician</span>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setQuickAssignIssue(issue);
                            }}
                            className="text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors"
                          >
                            <UserPlus className="w-3.5 h-3.5" /> Assign Tech
                          </button>
                        )}
                      </td>

                      {/* 5. Latest Update & Message */}
                      <td className="px-3 py-3 max-w-[200px]">
                        {(() => {
                          const unreadInfo = getUnreadStatus(issue);
                          const latestComment = unreadInfo.lastComment;

                          if (latestComment) {
                            return (
                              <div
                                className={`p-2 rounded-lg border transition-all ${
                                  unreadInfo.hasUnread
                                    ? 'bg-blue-50/90 border-blue-300 ring-1 ring-blue-300 shadow-2xs'
                                    : 'bg-gray-50/70 border-gray-200'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1 mb-1">
                                  <div className="flex items-center gap-1 font-bold text-gray-900 truncate">
                                    <span className={`w-2 h-2 rounded-full shrink-0 ${unreadInfo.hasUnread ? 'bg-red-600 animate-pulse' : 'bg-[#1e3a5f]'}`} />
                                    <span className="truncate text-xs">{latestComment.user?.name || 'Reply'}</span>
                                    <span className="text-[9px] font-semibold px-1 py-0.2 rounded bg-white text-gray-600 border border-gray-200 shrink-0">
                                      {latestComment.user?.userRoles?.[0]?.role?.name || latestComment.user?.userRoles?.[0]?.role?.type || 'Staff'}
                                    </span>
                                  </div>
                                  {unreadInfo.hasUnread && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-red-600 text-white shrink-0 animate-pulse">
                                      ● {unreadInfo.unreadCount > 1 ? `${unreadInfo.unreadCount} New` : 'New'}
                                    </span>
                                  )}
                                </div>

                                <p className="text-[11px] text-gray-700 italic truncate" title={latestComment.content}>
                                  "{latestComment.content}"
                                </p>

                                <div className="text-[10px] text-gray-400 flex items-center justify-between mt-1 pt-1 border-t border-gray-200/60">
                                  <span>{formatTimeAgo(latestComment.createdAt)}</span>
                                  <span className="font-mono font-medium text-gray-600 flex items-center gap-1">
                                    <MessageSquare className="w-3 h-3 text-gray-400" />
                                    {totalReplies} reply{totalReplies === 1 ? '' : 's'}
                                    {latestComment.attachments && latestComment.attachments.length > 0 && (
                                      <Paperclip className="w-2.5 h-2.5 text-blue-600" />
                                    )}
                                  </span>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div className="p-2 rounded-lg bg-gray-50/50 border border-gray-100 text-gray-500">
                              <div className="text-[11px] font-semibold text-gray-700 truncate">Raised by {issue.raisedBy?.name || 'Staff'}</div>
                              <div className="text-[10px] text-gray-400 mt-0.5">{formatTimeAgo(issue.createdAt)}</div>
                            </div>
                          );
                        })()}
                      </td>

                      {/* 6. Quick Actions Strip */}
                      <td className="px-3 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Reply Button with Unread Badge */}
                          {(() => {
                            const unreadInfo = getUnreadStatus(issue);
                            return (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  markTicketViewed(issue.id);
                                  setQuickReplyIssue(issue);
                                }}
                                className={`h-7 px-2.5 text-xs font-semibold shadow-2xs transition-all relative ${
                                  unreadInfo.hasUnread
                                    ? 'bg-blue-50 border-blue-400 text-[#1e3a5f] hover:bg-blue-100 ring-1 ring-blue-300'
                                    : 'text-gray-700 hover:text-[#1e3a5f] hover:bg-blue-50 border-gray-300'
                                }`}
                                title="Quick Reply & Message History"
                              >
                                <MessageSquare className="w-3.5 h-3.5 mr-1 text-[#1e3a5f]" />
                                Reply {totalReplies > 0 ? `(${totalReplies})` : ''}
                                {unreadInfo.hasUnread && (
                                  <span className="ml-1 px-1.5 py-0.2 bg-red-600 text-white rounded-full text-[9px] font-bold animate-pulse">
                                    {unreadInfo.unreadCount > 1 ? `${unreadInfo.unreadCount} New` : 'New'}
                                  </span>
                                )}
                              </Button>
                            );
                          })()}

                          {/* Open Full Details */}
                          <Button
                            size="sm"
                            onClick={() => {
                              markTicketViewed(issue.id);
                              navigate(`/issues/${issue.id}`);
                            }}
                            className="h-7 px-2.5 text-xs font-semibold bg-[#1e3a5f] hover:bg-[#172d4a] text-white"
                            title="Open Full Ticket Workspace"
                          >
                            Open <ArrowRight className="w-3 h-3 ml-0.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═════════════════════════════════════════════════════════════════════════
          QUICK ACTION MODALS
      ═════════════════════════════════════════════════════════════════════════ */}

      {/* 1. Quick Reply Chat Box Modal */}
      {quickReplyIssue && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col font-sans">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-gray-100 pb-3 mb-3 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-[#1e3a5f] border border-blue-200">
                    {quickReplyIssue.issueNo}
                  </span>
                  <StatusBadge status={quickReplyIssue.status} size="sm" />
                  <StatusBadge status={quickReplyIssue.priority} size="sm" />
                </div>
                <h3 className="font-bold text-sm text-gray-900 truncate max-w-md mt-1">{quickReplyIssue.title}</h3>
                <p className="text-[11px] text-gray-500">
                  {quickReplyIssue.asset?.name ? `Asset: ${quickReplyIssue.asset.name} · ` : ''}
                  Branch: {quickReplyIssue.branch?.name || 'Main Branch'}
                </p>
              </div>
              <button
                onClick={() => setQuickReplyIssue(null)}
                className="text-gray-400 hover:text-gray-600 rounded-full p-1 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conversation History Feed (Scrollable) */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-3 max-h-[300px]">
              {quickReplyIssue.IssueComment && quickReplyIssue.IssueComment.length > 0 ? (
                quickReplyIssue.IssueComment.map((c: any) => {
                  const isMe = c.userId === user?.sub;
                  const senderRole = c.user?.userRoles?.[0]?.role?.name || c.user?.userRoles?.[0]?.role?.type || 'Staff';

                  return (
                    <div
                      key={c.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} text-xs`}
                    >
                      <div className="flex items-center gap-1 text-[10px] text-gray-400 mb-0.5 px-1">
                        <span className="font-bold text-gray-700">{isMe ? 'You' : c.user?.name || 'User'}</span>
                        <span>({senderRole})</span>
                        <span>·</span>
                        <span>{formatTimeAgo(c.createdAt)}</span>
                      </div>
                      <div
                        className={`p-3 rounded-2xl max-w-[85%] whitespace-pre-wrap leading-relaxed shadow-2xs ${
                          isMe
                            ? 'bg-[#1e3a5f] text-white rounded-br-none'
                            : 'bg-gray-100 text-gray-800 rounded-bl-none border border-gray-200/80'
                        }`}
                      >
                        {c.content}
                        {c.attachments && c.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-white/20">
                            {c.attachments.map((att: string, idx: number) => (
                              <a
                                key={idx}
                                href={mediaUrl(att)}
                                target="_blank"
                                rel="noreferrer"
                                className={`px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 ${
                                  isMe ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-white text-blue-700 border border-gray-200 hover:underline'
                                }`}
                              >
                                <Paperclip className="w-2.5 h-2.5" /> Attachment #{idx + 1}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-6 text-center text-xs text-gray-400 bg-gray-50/50 rounded-xl border border-gray-100">
                  <MessageSquare className="w-6 h-6 mx-auto mb-1 text-gray-300" />
                  No previous replies on this ticket. Start the conversation below.
                </div>
              )}
            </div>

            {/* Quick Canned Action Chips */}
            <div className="flex flex-wrap gap-1.5 mb-3 shrink-0">
              {[
                '🔍 Inspecting issue on-site',
                '📦 Spare parts ordered',
                '✅ Work completed, testing OK',
                '📷 Please upload more photos',
              ].map((chip) => (
                <button
                  type="button"
                  key={chip}
                  onClick={() => setQuickReplyText(chip)}
                  className="px-2.5 py-1 rounded-full bg-gray-100 hover:bg-blue-50 text-gray-700 hover:text-[#1e3a5f] text-[10px] font-medium border border-gray-200 transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Reply Composer Form */}
            <form onSubmit={handleSendQuickReply} className="space-y-3 shrink-0">
              <textarea
                rows={3}
                placeholder="Type your response, diagnosis note, or update..."
                value={quickReplyText}
                onChange={(e) => setQuickReplyText(e.target.value)}
                className="w-full text-xs p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] resize-none"
                required
              />

              {quickReplyFiles.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {quickReplyFiles.map((file, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-[11px] bg-blue-50 text-blue-900 border border-blue-200 px-2 py-0.5 rounded-lg">
                      <FileText className="w-3 h-3 text-blue-600" />
                      <span className="truncate max-w-[120px] font-mono text-[10px]">{file.name}</span>
                      <button type="button" onClick={() => setQuickReplyFiles(prev => prev.filter((_, idx) => idx !== i))}>
                        <X className="w-3 h-3 text-red-500 hover:text-red-700" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                <input
                  type="file"
                  multiple
                  className="hidden"
                  ref={replyFileInputRef}
                  onChange={(e) => e.target.files && setQuickReplyFiles(prev => [...prev, ...Array.from(e.target.files!)])}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs text-gray-600 hover:text-[#1e3a5f]"
                  onClick={() => replyFileInputRef.current?.click()}
                >
                  <Paperclip className="w-3.5 h-3.5 mr-1" /> Attach Photos / Files
                </Button>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" type="button" onClick={() => setQuickReplyIssue(null)} className="text-xs">
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    type="submit"
                    loading={addCommentMutation.isPending}
                    className="bg-[#1e3a5f] hover:bg-[#172d4a] text-white text-xs font-semibold px-4 shadow-2xs"
                  >
                    <Send className="w-3.5 h-3.5 mr-1" /> Send Reply
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Quick Single Assign Modal */}
      {quickAssignIssue && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-[#1e3a5f]" /> Assign {quickAssignIssue.issueNo}
              </h3>
              <button onClick={() => setQuickAssignIssue(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-3">Select the responsible technician or staff member.</p>

            <div className="space-y-1.5 max-h-56 overflow-y-auto mb-4 pr-1">
              {rawUsers.map((u: any) => {
                const roleType = u.primaryRole || u.roles?.[0]?.type || 'STAFF';
                return (
                  <label
                    key={u.id}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs ${
                      quickAssigneeId === u.id ? 'border-[#1e3a5f] bg-blue-50/70 ring-1 ring-[#1e3a5f]' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="quickAssignee"
                      value={u.id}
                      checked={quickAssigneeId === u.id}
                      onChange={() => setQuickAssigneeId(u.id)}
                      className="accent-[#1e3a5f]"
                    />
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-[9px] flex items-center justify-center font-bold shrink-0">
                      {getInitials(u.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-gray-900 truncate">{u.name}</div>
                      <div className="text-[10px] text-gray-400">{roleType}</div>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => setQuickAssignIssue(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-[#1e3a5f] hover:bg-[#172d4a] text-white text-xs font-semibold"
                loading={assignMutation.isPending}
                onClick={handleQuickAssignSubmit}
                disabled={!quickAssigneeId}
              >
                Assign
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Bulk Assign Modal */}
      {showBulkAssign && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-[#1e3a5f]" /> Bulk Assign ({selectedIssueIds.length} tickets)
              </h3>
              <button onClick={() => setShowBulkAssign(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-3">Assign all {selectedIssueIds.length} selected tickets to a technician.</p>

            <div className="space-y-1.5 max-h-56 overflow-y-auto mb-4 pr-1">
              {rawUsers.map((u: any) => (
                <label
                  key={u.id}
                  className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs ${
                    bulkAssigneeId === u.id ? 'border-[#1e3a5f] bg-blue-50/70 ring-1 ring-[#1e3a5f]' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="bulkAssignee"
                    value={u.id}
                    checked={bulkAssigneeId === u.id}
                    onChange={() => setBulkAssigneeId(u.id)}
                    className="accent-[#1e3a5f]"
                  />
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-[9px] flex items-center justify-center font-bold shrink-0">
                    {getInitials(u.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-gray-900 truncate">{u.name}</div>
                    <div className="text-[10px] text-gray-400">{u.primaryRole || u.roles?.[0]?.type || 'Staff'}</div>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => setShowBulkAssign(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-[#1e3a5f] hover:bg-[#172d4a] text-white text-xs font-semibold"
                loading={bulkAssignMutation.isPending}
                onClick={handleBulkAssignSubmit}
                disabled={!bulkAssigneeId}
              >
                Assign All
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
