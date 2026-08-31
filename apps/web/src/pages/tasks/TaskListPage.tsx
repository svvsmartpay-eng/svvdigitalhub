import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '@/components/shared/PageHeader';
import { useTasks, useTaskStats, useUpdateTaskStatus } from '@/api/tasks.api';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CheckSquare, Plus, Search, Filter, Calendar, Clock,
  AlertCircle, CheckCircle2, User, ArrowRight, ShieldCheck,
  AlertTriangle, RefreshCw, Paperclip, Eye, Check, ChevronRight
} from 'lucide-react';
import CreateTaskModal from './CreateTaskModal';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

function getPriorityBadge(priority: string) {
  switch (priority) {
    case 'CRITICAL':
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">🔴 Critical</span>;
    case 'HIGH':
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">🟠 High</span>;
    case 'MEDIUM':
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">🟡 Medium</span>;
    default:
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-200">🟢 Low</span>;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'CREATED':
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-300">Created</span>;
    case 'ACCEPTED':
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#1e3a5f] border border-blue-200">Accepted</span>;
    case 'IN_PROGRESS':
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">⚡ In Progress</span>;
    case 'COMPLETED':
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">⏳ Awaiting Verification</span>;
    case 'VERIFIED':
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">✅ Verified</span>;
    case 'CLOSED':
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-900 border border-green-300">🎉 Closed</span>;
    default:
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">{status}</span>;
  }
}

export default function TaskListPage() {
  const { user } = useAuthStore();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [filterType, setFilterType] = useState<'ALL' | 'MY_TASKS' | 'CREATED_BY_ME' | 'AWAITING_VERIFICATION' | 'OVERDUE' | 'DUE_TODAY'>('ALL');
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const { data: statsData, refetch: refetchStats } = useTaskStats();
  const { data: tasksData, isLoading, isError, error, refetch: refetchTasks } = useTasks({
    filterType,
    search: search || undefined,
    priority: priorityFilter || undefined,
  });

  const updateStatus = useUpdateTaskStatus();

  const stats = statsData || {
    total: 0,
    myTasks: 0,
    pending: 0,
    inProgress: 0,
    dueToday: 0,
    overdue: 0,
    awaitingVerification: 0,
    completed: 0,
    requiresMyAction: 0,
  };

  const tasksList: any[] = tasksData?.data || [];

  const handleQuickStatusChange = async (taskId: string, newStatus: string, actionName: string) => {
    try {
      await updateStatus.mutateAsync({ id: taskId, status: newStatus, remarks: `${actionName} from task list` });
      refetchTasks();
      refetchStats();
    } catch (err: any) {
      alert(err?.response?.data?.error || err?.message || 'Failed to update task status');
    }
  };

  return (
    <div className="space-y-6 font-sans pb-12">
      <PageHeader
        title="Internal Work & Task Management"
        subtitle="Manage team work assignments, operational audits, follow-ups, reports, and verification workflows."
        actions={
          <Button
            size="sm"
            className="bg-[#1e3a5f] hover:bg-[#172d4a] text-white text-xs font-semibold shadow-2xs h-9 px-4"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1.5" /> Create Task Assignment
          </Button>
        }
      />

      {/* ── Summary Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          onClick={() => setFilterType('MY_TASKS')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            filterType === 'MY_TASKS'
              ? 'bg-blue-50/80 border-[#1e3a5f] ring-1 ring-[#1e3a5f]'
              : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <p className="text-gray-500 text-[11px] font-semibold">Assigned To Me</p>
          <p className="text-xl font-extrabold text-[#1e3a5f] mt-1">{stats.myTasks}</p>
          <span className="text-[10px] text-gray-400">My active duties</span>
        </div>

        <div
          onClick={() => setFilterType('AWAITING_VERIFICATION')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            filterType === 'AWAITING_VERIFICATION'
              ? 'bg-amber-50/80 border-amber-600 ring-1 ring-amber-600'
              : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <p className="text-amber-800 text-[11px] font-semibold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" /> Needs Verification
          </p>
          <p className="text-xl font-extrabold text-amber-900 mt-1">{stats.awaitingVerification}</p>
          <span className="text-[10px] text-amber-700">Manager review pending</span>
        </div>

        <div
          onClick={() => setFilterType('OVERDUE')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            filterType === 'OVERDUE'
              ? 'bg-red-50/80 border-red-600 ring-1 ring-red-600'
              : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <p className="text-red-700 text-[11px] font-semibold flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> Overdue Tasks
          </p>
          <p className="text-xl font-extrabold text-red-700 mt-1">{stats.overdue}</p>
          <span className="text-[10px] text-red-500">Past target due date</span>
        </div>

        <div
          onClick={() => setFilterType('DUE_TODAY')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            filterType === 'DUE_TODAY'
              ? 'bg-amber-50/80 border-amber-600 ring-1 ring-amber-600'
              : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <p className="text-gray-700 text-[11px] font-semibold flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> Due Today
          </p>
          <p className="text-xl font-extrabold text-gray-900 mt-1">{stats.dueToday}</p>
          <span className="text-[10px] text-gray-400">Targeting today</span>
        </div>

        <div
          onClick={() => setFilterType('ALL')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            filterType === 'ALL'
              ? 'bg-blue-50/80 border-[#1e3a5f] ring-1 ring-[#1e3a5f]'
              : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <p className="text-gray-500 text-[11px] font-semibold">In Progress</p>
          <p className="text-xl font-extrabold text-indigo-700 mt-1">{stats.inProgress}</p>
          <span className="text-[10px] text-gray-400">Work actively ongoing</span>
        </div>

        <div
          onClick={() => setFilterType('ALL')}
          className="p-3.5 rounded-xl border bg-white border-gray-200 transition-all"
        >
          <p className="text-gray-500 text-[11px] font-semibold">Completed / Closed</p>
          <p className="text-xl font-extrabold text-emerald-700 mt-1">{stats.completed}</p>
          <span className="text-[10px] text-gray-400">Total verified work</span>
        </div>
      </div>

      {/* ── Filters & Tabs ──────────────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-xl shadow-2xs border border-gray-200 space-y-3">
        {/* Quick Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-gray-100 pb-3">
          {[
            { key: 'ALL', label: `All Tasks (${stats.total})` },
            { key: 'MY_TASKS', label: `Assigned to Me (${stats.myTasks})` },
            { key: 'CREATED_BY_ME', label: 'Assigned by Me' },
            { key: 'AWAITING_VERIFICATION', label: `Awaiting Verification (${stats.awaitingVerification})` },
            { key: 'OVERDUE', label: `Overdue (${stats.overdue})` },
            { key: 'DUE_TODAY', label: `Due Today (${stats.dueToday})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterType(tab.key as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterType === tab.key
                  ? 'bg-[#1e3a5f] text-white shadow-2xs'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Priority Select */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-[260px] max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search tasks by ID, title, keyword..."
                className="text-xs pl-9 h-9"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-xs"
            >
              <option value="">All Priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchTasks();
                refetchStats();
              }}
              className="text-xs h-9"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* ── Task Table ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-2xs border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center">
            <LoadingSpinner size="md" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3 text-center">
            <AlertCircle className="w-10 h-10 text-red-500" />
            <p className="text-red-700 font-semibold text-sm">Failed to load tasks</p>
            <p className="text-red-500 text-xs">{(error as any)?.response?.data?.error || (error as any)?.message}</p>
            <Button variant="outline" size="sm" onClick={() => refetchTasks()}>Retry</Button>
          </div>
        ) : tasksList.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <CheckSquare className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="text-sm font-semibold text-gray-700">No tasks found in this view.</p>
            <p className="text-xs text-gray-400">Click "Create Task Assignment" to assign operational work to your team.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/80 text-gray-500 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Task No & Title</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assigned To</th>
                  <th className="py-3 px-4">Assigned By</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Responsibility & Next Action</th>
                  <th className="py-3 px-4 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tasksList.map((t: any) => {
                  const isAssignedToMe = t.assignedToId === user?.sub;
                  const isCreatedByMe = t.assignedById === user?.sub;
                  const isOverdue = t.dueStatus === 'OVERDUE';
                  const isDueToday = t.dueStatus === 'DUE_TODAY';

                  return (
                    <tr key={t.id} className={`hover:bg-gray-50/80 transition-colors ${t.requiresMyAction ? 'bg-blue-50/30' : ''}`}>
                      {/* Task ID & Title */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <Link to={`/tasks/${t.id}`} className="font-bold text-gray-900 hover:text-[#1e3a5f] flex items-center gap-1.5 group">
                          <span className="font-mono text-[11px] text-[#1e3a5f] group-hover:underline">{t.taskNo}</span>
                          <span className="truncate">{t.title}</span>
                        </Link>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-1">
                          {t.branch ? (
                            <span className="font-medium text-gray-600">{t.branch.name} ({t.branch.code})</span>
                          ) : (
                            <span>General / HQ</span>
                          )}
                          {t._count?.updates > 0 && (
                            <>
                              <span>·</span>
                              <span>💬 {t._count.updates} updates</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Priority */}
                      <td className="py-3.5 px-4">
                        {getPriorityBadge(t.priority)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {getStatusBadge(t.status)}
                      </td>

                      {/* Assigned To */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900 flex items-center gap-1">
                          <span>{t.assignedTo?.name}</span>
                          {isAssignedToMe && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-bold">YOU</span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-400">{t.assignedTo?.designation || 'Staff'}</div>
                      </td>

                      {/* Assigned By */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-gray-800 flex items-center gap-1">
                          <span>{t.assignedBy?.name}</span>
                          {isCreatedByMe && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-gray-200 text-gray-700 font-bold">YOU</span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-400">{t.assignedBy?.designation || 'Manager'}</div>
                      </td>

                      {/* Due Date */}
                      <td className="py-3.5 px-4">
                        {t.dueDate ? (
                          <div>
                            <div className={`font-mono font-bold ${isOverdue ? 'text-red-600' : isDueToday ? 'text-amber-600' : 'text-gray-700'}`}>
                              {new Date(t.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                            {isOverdue && <span className="text-[9px] text-red-600 font-bold">⚠️ OVERDUE</span>}
                            {isDueToday && <span className="text-[9px] text-amber-600 font-bold">⏳ DUE TODAY</span>}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">—</span>
                        )}
                      </td>

                      {/* Responsibility & Action */}
                      <td className="py-3.5 px-4 max-w-[220px]">
                        <div className="text-[11px] font-semibold text-gray-800 flex items-center gap-1">
                          <span className="text-gray-400 text-[10px] uppercase font-normal">Pending With:</span>
                          <span className="truncate">{t.pendingWith}</span>
                        </div>
                        <div className="text-[10px] text-gray-500 truncate mt-0.5" title={t.nextActionRequired}>
                          👉 {t.nextActionRequired}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Workflow Action Button */}
                          {t.status === 'CREATED' && isAssignedToMe && (
                            <Button
                              size="sm"
                              className="h-7 text-[11px] bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-2xs"
                              onClick={() => handleQuickStatusChange(t.id, 'ACCEPTED', 'Accepted')}
                            >
                              Accept
                            </Button>
                          )}

                          {t.status === 'ACCEPTED' && isAssignedToMe && (
                            <Button
                              size="sm"
                              className="h-7 text-[11px] bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-2xs"
                              onClick={() => handleQuickStatusChange(t.id, 'IN_PROGRESS', 'Started work')}
                            >
                              Start
                            </Button>
                          )}

                          {t.status === 'COMPLETED' && (isCreatedByMe || ['ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'].includes(user?.primaryRole || '')) && (
                            <Button
                              size="sm"
                              className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-2xs"
                              onClick={() => handleQuickStatusChange(t.id, 'VERIFIED', 'Verified & Approved')}
                            >
                              Verify & Close
                            </Button>
                          )}

                          <Link to={`/tasks/${t.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[11px] font-semibold text-[#1e3a5f] border-gray-300 hover:bg-gray-50"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" /> View
                            </Button>
                          </Link>
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

      {/* Create Task Modal */}
      {isCreateOpen && (
        <CreateTaskModal
          onClose={() => setIsCreateOpen(false)}
          onSuccess={() => {
            refetchTasks();
            refetchStats();
          }}
        />
      )}
    </div>
  );
}
