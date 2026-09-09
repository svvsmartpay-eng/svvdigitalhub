import React, { useState } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { useDevIssueDetails, usePortalUpdateStatus, usePortalAddComment } from '@/api/devHub.api';
import { Loader2, ArrowLeft, ChevronLeft, ChevronRight, Upload, CheckCircle2, XCircle, Calendar, Clock, User, Tag, AlertCircle } from 'lucide-react';

function getAgeDays(createdAt: string) {
  return Math.floor((new Date().getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
}

function getStatusColor(status: string) {
  switch (status) {
    case 'OPEN': return 'bg-green-100 text-green-700';
    case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700';
    case 'COMPLETED_BY_DEV': return 'bg-orange-100 text-orange-700';
    case 'CLOSED': return 'bg-gray-100 text-gray-700';
    case 'VERIFIED_BY_SVV': return 'bg-teal-100 text-teal-700';
    default: return 'bg-yellow-100 text-yellow-700';
  }
}

// ===== Developer Update Modal (Step 6) =====
function AddUpdateModal({ issue, token, onClose, onSuccess }: any) {
  const [form, setForm] = useState({
    status: issue.status === 'OPEN' ? 'IN_PROGRESS' : issue.status,
    comment: '',
    rootCause: '',
    fixDetails: '',
    deploymentDetails: '',
    expectedDate: '',
  });
  const [loading, setLoading] = useState(false);
  const updateStatus = usePortalUpdateStatus();
  const addComment = usePortalAddComment();

  const isCompletion = form.status === 'COMPLETED_BY_DEV';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isCompletion) {
        await updateStatus.mutateAsync({
          id: issue.id,
          token,
          data: {
            status: form.status,
            comment: form.comment,
            rootCause: form.rootCause,
            fixDetails: form.fixDetails,
            deploymentDetails: form.deploymentDetails,
          }
        });
      } else {
        await updateStatus.mutateAsync({
          id: issue.id,
          token,
          data: { status: form.status, comment: form.comment }
        });
      }
      onSuccess();
    } catch (err) {
      alert('Update failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="text-lg font-bold text-[#081B3A]">Add Update</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto max-h-[70vh]">
          {/* Update Status */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Update Status</label>
            <select
              value={form.status}
              onChange={e => setForm({ ...form, status: e.target.value })}
              className="w-full border rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="IN_PROGRESS">In Progress</option>
              <option value="NEED_INFO">Need More Info</option>
              <option value="TESTING">Testing / QA</option>
              <option value="COMPLETED_BY_DEV">Completed (Mark as Fixed)</option>
            </select>
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">
              Comment {isCompletion ? '' : <span className="text-gray-400 font-normal">(Required)</span>}
            </label>
            <div className="border rounded-lg overflow-hidden">
              <div className="flex gap-1 px-2 py-1 border-b bg-gray-50">
                <button type="button" className="p-1 hover:bg-gray-200 rounded text-xs font-bold">B</button>
                <button type="button" className="p-1 hover:bg-gray-200 rounded text-xs italic">I</button>
                <button type="button" className="p-1 hover:bg-gray-200 rounded text-xs">≡</button>
                <button type="button" className="p-1 hover:bg-gray-200 rounded text-xs">≡•</button>
                <button type="button" className="p-1 hover:bg-gray-200 rounded text-xs">🔗</button>
              </div>
              <textarea
                value={form.comment}
                onChange={e => setForm({ ...form, comment: e.target.value })}
                placeholder="Describe the update, progress, or findings..."
                className="w-full p-3 text-sm resize-none focus:outline-none min-h-[80px]"
                required={!isCompletion}
              />
            </div>
          </div>

          {/* Completion fields */}
          {isCompletion && (
            <>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Root Cause <span className="text-red-500">*</span></label>
                <textarea
                  value={form.rootCause}
                  onChange={e => setForm({ ...form, rootCause: e.target.value })}
                  placeholder="What was the root cause of this issue?"
                  className="w-full border rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[60px]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">What Was Fixed? <span className="text-red-500">*</span></label>
                <textarea
                  value={form.fixDetails}
                  onChange={e => setForm({ ...form, fixDetails: e.target.value })}
                  placeholder="Describe the fix applied..."
                  className="w-full border rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[60px]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Deployment Details <span className="text-red-500">*</span></label>
                <textarea
                  value={form.deploymentDetails}
                  onChange={e => setForm({ ...form, deploymentDetails: e.target.value })}
                  placeholder="e.g., Deployed to production, commit #abc123..."
                  className="w-full border rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[60px]"
                  required
                />
              </div>
            </>
          )}

          {/* Attachment */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Attachment <span className="text-gray-400 font-normal">(Optional)</span></label>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors">
              <Upload className="w-6 h-6 text-gray-300 mb-1" />
              <span className="text-xs text-gray-500 text-center">Click to upload or drag & drop<br />Supports images, videos, PDF (Max 20MB)</span>
              <input type="file" className="hidden" accept="image/*,video/*,.pdf" />
            </label>
          </div>

          {/* Expected Completion Date */}
          {!isCompletion && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Expected Completion Date</label>
              <input
                type="date"
                value={form.expectedDate}
                onChange={e => setForm({ ...form, expectedDate: e.target.value })}
                className="w-full border rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0D6EFD] hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Submit Update
          </button>
        </form>
      </div>
    </div>
  );
}

// ===== SVV Verification Modal (Step 7) =====
function VerificationModal({ issue, token, onClose, onSuccess }: any) {
  const [result, setResult] = useState<'CLOSED' | 'OPEN' | ''>('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const updateStatus = usePortalUpdateStatus();

  const handleVerify = async () => {
    if (!result) return;
    setLoading(true);
    try {
      await updateStatus.mutateAsync({
        id: issue.id,
        token,
        data: { status: result, comment: comment || (result === 'CLOSED' ? 'Issue verified and closed by SVV Team.' : 'Issue reopened - fix not satisfactory.') }
      });
      onSuccess(result);
    } catch (err) {
      alert('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="text-base font-bold text-[#081B3A]">Verification by SVV Team</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600">Developer marked as completed. Please verify and update.</p>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Current Status</label>
            <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-semibold">Completed By Developer</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Testing Result <span className="text-red-500">*</span></label>
            <div className="space-y-2">
              <button
                onClick={() => setResult('CLOSED')}
                className={`w-full flex items-center gap-3 p-3 border-2 rounded-xl transition-all ${result === 'CLOSED' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <CheckCircle2 className={`w-5 h-5 ${result === 'CLOSED' ? 'text-green-600' : 'text-gray-300'}`} />
                <span className={`font-semibold text-sm ${result === 'CLOSED' ? 'text-green-700' : 'text-gray-600'}`}>Issue is fixed (Verified)</span>
              </button>
              <button
                onClick={() => setResult('OPEN')}
                className={`w-full flex items-center gap-3 p-3 border-2 rounded-xl transition-all ${result === 'OPEN' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <XCircle className={`w-5 h-5 ${result === 'OPEN' ? 'text-red-600' : 'text-gray-300'}`} />
                <span className={`font-semibold text-sm ${result === 'OPEN' ? 'text-red-700' : 'text-gray-600'}`}>Issue still exists (Reopen)</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Verification Comments <span className="text-red-500">*</span></label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="e.g., Verified. Working fine now."
              className="w-full border rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[70px]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Attach Screenshot <span className="text-gray-400 font-normal normal-case">(Optional)</span></label>
            <label className="flex items-center gap-3 border-2 border-dashed border-gray-200 rounded-lg p-3 cursor-pointer hover:bg-gray-50">
              <Upload className="w-5 h-5 text-gray-300" />
              <span className="text-xs text-gray-400">Click to upload or drag & drop<br />Supports images, videos, PDF (Max 20MB)</span>
              <input type="file" className="hidden" accept="image/*,video/*,.pdf" />
            </label>
          </div>

          <button
            onClick={handleVerify}
            disabled={!result || loading}
            className="w-full bg-[#0D6EFD] hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Mark as Verified
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== Ticket Closed Screen (Step 8) =====
function TicketClosedScreen({ issue }: { issue: any }) {
  const closedEntry = issue.timeline?.find((t: any) => t.action?.includes('Closed') || t.newStatus === 'CLOSED');
  const createdDate = new Date(issue.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const closedDate = closedEntry ? new Date(closedEntry.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
  const totalDays = closedEntry ? getAgeDays(issue.createdAt) : 0;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center space-y-6">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
        <CheckCircle2 className="w-12 h-12 text-green-500" />
      </div>
      <div>
        <h2 className="text-2xl font-black text-[#081B3A]">Ticket Closed</h2>
        <p className="text-[#0D6EFD] font-bold mt-1">{issue.ticketCode}</p>
      </div>
      <p className="text-sm text-gray-500 max-w-xs">This issue has been verified and closed by SVV Team.</p>

      <div className="bg-gray-50 rounded-2xl border w-full max-w-xs p-4 space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-gray-500"><Clock className="w-4 h-4" /> Total Time Taken</span>
          <span className="font-bold text-[#081B3A]">{totalDays} Days</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-gray-500"><Calendar className="w-4 h-4" /> Created On</span>
          <span className="font-bold text-[#081B3A]">{createdDate}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-gray-500"><Calendar className="w-4 h-4" /> Closed On</span>
          <span className="font-bold text-[#081B3A]">{closedDate}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-gray-500"><User className="w-4 h-4" /> Closed By</span>
          <span className="font-bold text-[#081B3A]">{closedEntry?.authorName || 'SVV Team'}</span>
        </div>
      </div>

      <div className="text-center">
        <p className="text-2xl font-bold text-green-600 italic">Issue Resolved! 🎉</p>
        <p className="text-xs text-gray-400 mt-1">SVV DevHub • Better Tracking • Faster Solutions</p>
      </div>
    </div>
  );
}

// ===== Main Portal Issue Details Page (Steps 5-8) =====
export default function PortalIssueDetails() {
  const { id } = useParams<{ id: string }>();
  const { token, issues: allIssues } = useOutletContext<any>();
  const { data: issue, isLoading, refetch } = useDevIssueDetails(id as string);

  const [activeTab, setActiveTab] = useState<'details' | 'activity' | 'attachments'>('details');
  const [imgIndex, setImgIndex] = useState(0);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [closedResult, setClosedResult] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!issue) {
    return <div className="p-6 text-center text-gray-500">Ticket not found.</div>;
  }

  const isClosed = issue.status === 'CLOSED' || closedResult === 'CLOSED';
  const isCompletedByDev = issue.status === 'COMPLETED_BY_DEV';
  const attachments = issue.attachments || [];
  const age = getAgeDays(issue.createdAt);
  const isOverdue = issue.dueDate && new Date(issue.dueDate) < new Date() && !isClosed;

  // Show closed confirmation if ticket is closed
  if (isClosed) {
    return (
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {/* Closed header */}
        <div className="bg-[#081B3A] px-4 py-3 flex items-center gap-3">
          <button onClick={() => window.history.back()} className="text-white/70 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <span className="text-white font-bold">{issue.ticketCode}</span>
            <span className="ml-2 bg-gray-500 text-white text-xs px-2 py-0.5 rounded font-bold">CLOSED</span>
          </div>
        </div>
        <TicketClosedScreen issue={issue} />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-[#081B3A] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => window.history.back()} className="text-white/70 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-white font-bold text-sm">{issue.ticketCode}</span>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${getStatusColor(issue.status)}`}>
          {issue.status.replace(/_/g, ' ')}
        </span>
      </div>

      {/* SVV Verification Banner (shown when COMPLETED_BY_DEV) */}
      {isCompletedByDev && (
        <div className="bg-orange-50 border-b border-orange-200 px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-orange-600" />
            <span className="text-sm font-bold text-orange-700">Developer marked this as completed. Please verify.</span>
          </div>
          <button
            onClick={() => setShowVerifyModal(true)}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-lg text-sm transition-colors"
          >
            Start Verification →
          </button>
        </div>
      )}

      {/* Image Gallery */}
      {attachments.length > 0 && (
        <div className="relative bg-gray-900 aspect-video">
          <img
            src={attachments[imgIndex]?.url}
            alt="Attachment"
            className="w-full h-full object-contain"
          />
          {attachments.length > 1 && (
            <>
              <button
                onClick={() => setImgIndex(i => Math.max(0, i - 1))}
                disabled={imgIndex === 0}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setImgIndex(i => Math.min(attachments.length - 1, i + 1))}
                disabled={imgIndex === attachments.length - 1}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                {attachments.map((_: any, i: number) => (
                  <button
                    key={i}
                    onClick={() => setImgIndex(i)}
                    className={`w-2 h-2 rounded-full transition-all ${i === imgIndex ? 'bg-white' : 'bg-white/40'}`}
                  />
                ))}
              </div>
              {/* Thumbnail strip */}
              <div className="absolute bottom-0 left-0 right-0 flex gap-1 p-2 overflow-x-auto">
                {attachments.slice(0, 4).map((att: any, i: number) => (
                  <div
                    key={i}
                    onClick={() => setImgIndex(i)}
                    className={`w-10 h-10 rounded border-2 shrink-0 overflow-hidden cursor-pointer ${i === imgIndex ? 'border-white' : 'border-transparent opacity-60'}`}
                  >
                    <img src={att.url} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
                {attachments.length > 4 && (
                  <div className="w-10 h-10 rounded border-2 border-transparent bg-black/40 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    +{attachments.length - 4}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* No attachment placeholder */}
      {attachments.length === 0 && (
        <div className="bg-gray-100 h-32 flex items-center justify-center">
          <p className="text-gray-400 text-sm">No screenshots attached</p>
        </div>
      )}

      {/* Title + Description */}
      <div className="px-4 py-3">
        <h1 className="text-lg font-bold text-[#081B3A] leading-snug">{issue.title || 'Untitled Issue'}</h1>
        {issue.description && issue.description !== 'No description provided' && (
          <p className="text-sm text-gray-600 mt-1 leading-relaxed">{issue.description}</p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b px-4">
        {(['details', 'activity', 'attachments'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-semibold capitalize border-b-2 transition-colors ${
              activeTab === tab ? 'border-[#0D6EFD] text-[#0D6EFD]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === 'details' && (
          <div className="space-y-3">
            {[
              { icon: Tag, label: 'Category', value: issue.category?.name || '—' },
              {
                icon: AlertCircle,
                label: 'Priority',
                value: issue.priority || '—',
                className: issue.priority === 'CRITICAL' ? 'text-red-600 font-bold' :
                  issue.priority === 'HIGH' ? 'text-orange-600 font-bold' :
                  issue.priority === 'MEDIUM' ? 'text-yellow-600 font-bold' : 'text-green-600 font-bold'
              },
              { icon: User, label: 'Assigned To', value: issue.assignedTeam?.name || 'Unassigned' },
              { icon: User, label: 'Created By', value: issue.createdBy || 'SVV Admin' },
              { icon: Calendar, label: 'Created On', value: new Date(issue.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + new Date(issue.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) },
              { icon: Calendar, label: 'Due Date', value: issue.dueDate ? new Date(issue.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not set' },
              {
                icon: Clock,
                label: 'Ticket Age',
                value: `${age} Days${isOverdue ? ' (Overdue)' : ''}`,
                className: isOverdue ? 'text-red-600 font-bold' : ''
              },
            ].map(({ icon: Icon, label, value, className }) => (
              <div key={label} className="flex items-start justify-between py-2 border-b border-gray-100 last:border-0">
                <span className="flex items-center gap-2 text-sm text-gray-500">
                  <Icon className="w-4 h-4 text-gray-400" />
                  {label}
                </span>
                <span className={`text-sm font-semibold text-right max-w-[55%] ${className || ''}`}>{value}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="space-y-3">
            {(issue.timeline || []).length === 0 ? (
              <p className="text-center text-gray-400 py-4 text-sm">No activity yet.</p>
            ) : (
              (issue.timeline || []).map((t: any) => (
                <div key={t.id} className="border-l-2 border-blue-200 pl-3 py-1">
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-bold text-gray-700">{t.authorName}</span>
                    <span className="text-xs text-gray-400">{new Date(t.createdAt).toLocaleDateString('en-IN')}</span>
                  </div>
                  <p className="text-xs font-semibold text-blue-600 mt-0.5">{t.action}</p>
                  {t.comment && <p className="text-xs text-gray-600 mt-1">{t.comment}</p>}
                  {t.rootCause && (
                    <div className="mt-2 bg-gray-50 rounded p-2 text-xs space-y-1">
                      <p><strong>Root Cause:</strong> {t.rootCause}</p>
                      <p><strong>Fix:</strong> {t.fixDetails}</p>
                      <p><strong>Deployment:</strong> {t.deploymentDetails}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'attachments' && (
          <div>
            {attachments.length === 0 ? (
              <p className="text-center text-gray-400 py-4 text-sm">No attachments uploaded.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {attachments.map((att: any, i: number) => (
                  <a key={i} href={att.url} target="_blank" rel="noreferrer" className="aspect-square rounded-lg overflow-hidden border">
                    <img src={att.url} alt="Attachment" className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      {!isClosed && !isCompletedByDev && (
        <div className="px-4 pb-5 pt-2 border-t bg-gray-50">
          <button
            onClick={() => setShowUpdateModal(true)}
            className="w-full bg-[#0D6EFD] hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors"
          >
            Add Update
          </button>
        </div>
      )}

      {/* Modals */}
      {showUpdateModal && (
        <AddUpdateModal
          issue={issue}
          token={token}
          onClose={() => setShowUpdateModal(false)}
          onSuccess={() => { setShowUpdateModal(false); refetch(); }}
        />
      )}

      {showVerifyModal && (
        <VerificationModal
          issue={issue}
          token={token}
          onClose={() => setShowVerifyModal(false)}
          onSuccess={(res: string) => { setShowVerifyModal(false); setClosedResult(res); refetch(); }}
        />
      )}
    </div>
  );
}
