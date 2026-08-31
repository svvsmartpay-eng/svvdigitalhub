import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTask, useUpdateTaskStatus, useAddTaskUpdate } from '@/api/tasks.api';
import PageHeader from '@/components/shared/PageHeader';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  CheckSquare, Calendar, Building2, User, Clock,
  AlertCircle, CheckCircle2, Paperclip, Upload, ArrowLeft,
  ShieldCheck, RefreshCw, Send, Check, AlertTriangle, FileText,
  MessageSquare
} from 'lucide-react';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

export default function TaskDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const { data: task, isLoading, isError, error, refetch } = useTask(id!);
  const updateStatus = useUpdateTaskStatus();
  const addUpdate = useAddTaskUpdate();

  const [newRemark, setNewRemark] = useState('');
  const [remarkFiles, setRemarkFiles] = useState<File[]>([]);
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false);

  // Completion modal state
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [completionRemarks, setCompletionRemarks] = useState('');
  const [completionProofFiles, setCompletionProofFiles] = useState<File[]>([]);

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isError || !task) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <h2 className="text-lg font-bold text-gray-900">Task Not Found</h2>
        <p className="text-xs text-gray-500 max-w-sm">
          {(error as any)?.response?.data?.error || 'The requested task could not be loaded.'}
        </p>
        <Link to="/tasks">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Tasks
          </Button>
        </Link>
      </div>
    );
  }

  const isAssignedToMe = task.assignedToId === user?.sub;
  const isCreatedByMe = task.assignedById === user?.sub;
  const isManagerOrAdmin = ['ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'].includes(user?.primaryRole || '');

  const handlePostUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRemark.trim() && remarkFiles.length === 0) return;

    setIsSubmittingUpdate(true);
    try {
      await addUpdate.mutateAsync({
        id: task.id,
        content: newRemark.trim() || 'Uploaded progress attachment(s)',
        attachments: remarkFiles,
      });
      setNewRemark('');
      setRemarkFiles([]);
      refetch();
    } catch (err: any) {
      alert(err?.response?.data?.error || err?.message || 'Failed to post update');
    } finally {
      setIsSubmittingUpdate(false);
    }
  };

  const handleStatusChange = async (newStatus: string, remarks?: string, files?: File[]) => {
    try {
      await updateStatus.mutateAsync({
        id: task.id,
        status: newStatus,
        remarks: remarks || `Status changed to ${newStatus}`,
        attachments: files,
      });
      setIsCompleteModalOpen(false);
      refetch();
    } catch (err: any) {
      alert(err?.response?.data?.error || err?.message || 'Failed to change status');
    }
  };

  return (
    <div className="space-y-6 font-sans pb-16 max-w-6xl mx-auto">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <PageHeader
        title={`${task.taskNo}: ${task.title}`}
        breadcrumbs={[
          { label: 'Tasks', href: '/tasks' },
          { label: task.taskNo },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs h-9">
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
            </Button>
            <Link to="/tasks">
              <Button variant="outline" size="sm" className="text-xs h-9">
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
              </Button>
            </Link>
          </div>
        }
      />

      {/* ── Action Bar / Responsibility Alert ───────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-2xs border border-gray-200 p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono font-bold text-xs px-2.5 py-1 rounded bg-slate-100 text-slate-800 border border-slate-200">
            {task.taskNo}
          </span>

          {/* Priority Pill */}
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-[#1e3a5f] border border-blue-200">
            Priority: {task.priority}
          </span>

          {/* Status Pill */}
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
            task.status === 'COMPLETED' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
            task.status === 'VERIFIED' || task.status === 'CLOSED' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' :
            task.status === 'IN_PROGRESS' ? 'bg-indigo-100 text-indigo-900 border border-indigo-200' :
            'bg-gray-100 text-gray-800'
          }`}>
            Status: {task.status.replace(/_/g, ' ')}
          </span>
        </div>

        {/* Dynamic Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {task.status === 'CREATED' && isAssignedToMe && (
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-9 px-4 shadow-2xs"
              onClick={() => handleStatusChange('ACCEPTED', 'Assignee acknowledged & accepted task.')}
            >
              <Check className="w-4 h-4 mr-1.5" /> Accept Task
            </Button>
          )}

          {task.status === 'ACCEPTED' && isAssignedToMe && (
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold h-9 px-4 shadow-2xs"
              onClick={() => handleStatusChange('IN_PROGRESS', 'Assignee initiated work.')}
            >
              <Clock className="w-4 h-4 mr-1.5" /> Start Work (In Progress)
            </Button>
          )}

          {task.status === 'IN_PROGRESS' && isAssignedToMe && (
            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold h-9 px-4 shadow-2xs"
              onClick={() => setIsCompleteModalOpen(true)}
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Submit for Verification
            </Button>
          )}

          {task.status === 'COMPLETED' && (isCreatedByMe || isManagerOrAdmin) && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="text-amber-800 border-amber-300 hover:bg-amber-50 text-xs font-semibold h-9 px-3"
                onClick={() => handleStatusChange('IN_PROGRESS', 'Manager requested follow-up revision.')}
              >
                Request Revision
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-9 px-4 shadow-2xs"
                onClick={() => handleStatusChange('VERIFIED', 'Manager verified completion proof & approved.')}
              >
                <ShieldCheck className="w-4 h-4 mr-1.5" /> Verify & Close Task
              </Button>
            </>
          )}

          {task.status === 'VERIFIED' && (isCreatedByMe || isManagerOrAdmin) && (
            <Button
              size="sm"
              className="bg-gray-800 hover:bg-gray-900 text-white text-xs font-semibold h-9 px-4 shadow-2xs"
              onClick={() => handleStatusChange('CLOSED', 'Task officially closed.')}
            >
              <Check className="w-4 h-4 mr-1.5" /> Mark Closed
            </Button>
          )}
        </div>
      </div>

      {/* ── Main 2-Column Workspace ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Task Details & Progress Feed */}
        <div className="lg:col-span-2 space-y-5">
          {/* Instructions Card */}
          <div className="bg-white rounded-xl shadow-2xs border border-gray-200 p-5 space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Task Instructions & Scope
            </h3>
            <p className="text-xs text-gray-800 leading-relaxed whitespace-pre-wrap">
              {task.description || 'No specific description provided.'}
            </p>

            {/* Attachments from creator */}
            {task.attachments && task.attachments.length > 0 && (
              <div className="pt-3 border-t border-gray-100 space-y-2">
                <span className="text-[11px] font-semibold text-gray-600 flex items-center gap-1">
                  <Paperclip className="w-3.5 h-3.5" /> Attached Reference Documents & Guidelines:
                </span>
                <div className="flex flex-wrap gap-2">
                  {task.attachments.map((att: string, idx: number) => (
                    <a
                      key={idx}
                      href={att}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-gray-50 hover:bg-blue-50 border border-gray-200 text-xs font-medium text-[#1e3a5f] flex items-center gap-1.5 transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#1e3a5f]" /> Document #{idx + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Progress Updates Composer */}
          <div className="bg-white rounded-xl shadow-2xs border border-gray-200 p-5 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800 uppercase tracking-wider">
              <MessageSquare className="w-4 h-4 text-[#1e3a5f]" /> Post Progress Remark / Evidence Photo
            </div>

            <form onSubmit={handlePostUpdate} className="space-y-3">
              <Textarea
                value={newRemark}
                onChange={e => setNewRemark(e.target.value)}
                placeholder="Type your status update, remarks, findings, or proof details..."
                rows={3}
                className="text-xs resize-none"
              />

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    id="update-files"
                    multiple
                    className="hidden"
                    onChange={e => e.target.files && setRemarkFiles(Array.from(e.target.files))}
                  />
                  <label
                    htmlFor="update-files"
                    className="cursor-pointer text-xs font-semibold text-gray-600 hover:text-[#1e3a5f] flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" /> Attach Photo / File
                  </label>
                  {remarkFiles.length > 0 && (
                    <span className="text-[11px] text-emerald-700 font-medium font-mono">
                      {remarkFiles.length} file(s) selected
                    </span>
                  )}
                </div>

                <Button
                  type="submit"
                  size="sm"
                  disabled={!newRemark.trim() && remarkFiles.length === 0}
                  loading={isSubmittingUpdate}
                  className="bg-[#1e3a5f] hover:bg-[#172d4a] text-white text-xs font-semibold px-4 h-8"
                >
                  <Send className="w-3.5 h-3.5 mr-1" /> Post Update
                </Button>
              </div>
            </form>
          </div>

          {/* Timeline Feed */}
          <div className="bg-white rounded-xl shadow-2xs border border-gray-200 p-5 space-y-4">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#1e3a5f]" /> Progress Updates & Audit Timeline
            </h3>

            {task.updates && task.updates.length > 0 ? (
              <div className="space-y-4 relative before:absolute before:top-2 before:bottom-2 before:left-3 before:w-0.5 before:bg-gray-100">
                {task.updates.map((up: any) => (
                  <div key={up.id} className="relative pl-8 space-y-1">
                    <div className="absolute left-1.5 top-1.5 w-3.5 h-3.5 rounded-full bg-[#1e3a5f] ring-4 ring-white" />
                    <div className="flex items-center justify-between text-[11px] text-gray-400">
                      <span className="font-bold text-gray-900">{up.user?.name || 'System'}</span>
                      <span>{new Date(up.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    </div>
                    <div className="text-xs text-gray-700 bg-gray-50/70 p-3 rounded-lg border border-gray-100 whitespace-pre-wrap">
                      {up.content}
                      {up.attachments && up.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-gray-200">
                          {up.attachments.map((att: string, aIdx: number) => (
                            <a
                              key={aIdx}
                              href={att}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-0.5 rounded bg-white border border-gray-200 text-[10px] font-medium text-blue-700 flex items-center gap-1 hover:underline"
                            >
                              <Paperclip className="w-3 h-3" /> Proof Attachment #{aIdx + 1}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">No updates recorded yet.</p>
            )}
          </div>
        </div>

        {/* Right Col: Task Metadata & Stakeholders */}
        <div className="space-y-5">
          {/* Stakeholders Card */}
          <div className="bg-white rounded-xl shadow-2xs border border-gray-200 p-5 space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Assignment & Hierarchy
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-100">
                <span className="text-[10px] uppercase font-bold text-[#1e3a5f] block">Assigned To (Assignee)</span>
                <div className="font-bold text-sm text-gray-900 mt-0.5">{task.assignedTo?.name}</div>
                <div className="text-[11px] text-gray-500">{task.assignedTo?.designation || 'Staff'} · {task.assignedTo?.email}</div>
              </div>

              <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                <span className="text-[10px] uppercase font-bold text-gray-500 block">Assigned By (Creator)</span>
                <div className="font-bold text-sm text-gray-900 mt-0.5">{task.assignedBy?.name}</div>
                <div className="text-[11px] text-gray-500">{task.assignedBy?.designation || 'Manager'} · {task.assignedBy?.email}</div>
              </div>

              {task.verifiedBy && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 block">Verified By</span>
                  <div className="font-bold text-sm text-emerald-950 mt-0.5">{task.verifiedBy?.name}</div>
                  <div className="text-[11px] text-emerald-700">Verified at: {new Date(task.verifiedAt).toLocaleDateString('en-IN')}</div>
                </div>
              )}
            </div>
          </div>

          {/* Schedule & Branch Details */}
          <div className="bg-white rounded-xl shadow-2xs border border-gray-200 p-5 space-y-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Schedule & Location
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-400">Target Due Date:</span>
                <span className="font-bold font-mono text-gray-900">
                  {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-400">Branch:</span>
                <span className="font-medium text-gray-900">
                  {task.branch ? `${task.branch.name} (${task.branch.code})` : 'General / HQ'}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-400">Created At:</span>
                <span className="font-medium text-gray-700">
                  {new Date(task.createdAt).toLocaleDateString('en-IN')}
                </span>
              </div>

              {task.completedAt && (
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-400">Completed At:</span>
                  <span className="font-medium text-gray-700">
                    {new Date(task.completedAt).toLocaleDateString('en-IN')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Completion & Proof Submission Modal ───────────────────────────────── */}
      {isCompleteModalOpen && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Submit Task for Verification
              </h3>
              <button onClick={() => setIsCompleteModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                &times;
              </button>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              Please enter what work was completed, upload any proof photos or completion reports. The task will move to <strong>Awaiting Verification</strong> for your Manager/Admin to verify.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Completion Remarks / Summary *</label>
                <Textarea
                  value={completionRemarks}
                  onChange={e => setCompletionRemarks(e.target.value)}
                  placeholder="e.g. Branch audit completed, all 45 physical assets verified and reconciled with register..."
                  rows={4}
                  className="text-xs resize-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Upload Proof Photo / Audit Report (Optional)</label>
                <input
                  type="file"
                  multiple
                  onChange={e => e.target.files && setCompletionProofFiles(Array.from(e.target.files))}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <Button variant="outline" size="sm" onClick={() => setIsCompleteModalOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4"
                disabled={!completionRemarks.trim()}
                onClick={() => handleStatusChange('COMPLETED', completionRemarks, completionProofFiles)}
              >
                Submit Completion Proof
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
