import React, { useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  useDevIssueDetails, useDevIssues, useUpdateDevIssueStatus,
  useAddDevIssueComment, useUpdateDevIssue, useDeleteDevIssue,
  useAddDevIssueAttachment, STATUS_LABELS, ALL_STATUSES, ADMIN_ONLY_STATUSES
} from '@/api/devHub.api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RichTextView } from '@/components/ui/RichTextEditor';
import RichTextEditor from '@/components/ui/RichTextEditor';
import ShareIssueButton from '@/components/dev-hub/ShareIssueButton';
import {
  Loader2, ArrowLeft, Send, Edit2, Trash2, Check, X,
  Clock, User, Tag, Paperclip, MessageSquare, ChevronDown,
  AlertCircle, Upload, Film, FileText, ImageIcon, CheckCircle2,
  RefreshCw, Lock, Rocket, XCircle, Play, Circle
} from 'lucide-react';

// ─── Status config ────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  OPEN:              { label: 'Open',                color: 'text-blue-700',   bg: 'bg-blue-100',   icon: <Circle className="w-3.5 h-3.5" /> },
  ASSIGNED:          { label: 'Assigned',            color: 'text-purple-700', bg: 'bg-purple-100', icon: <User className="w-3.5 h-3.5" /> },
  IN_PROGRESS:       { label: 'In Progress',         color: 'text-orange-700', bg: 'bg-orange-100', icon: <Play className="w-3.5 h-3.5" /> },
  DEV_COMPLETED:     { label: 'Dev Completed',       color: 'text-teal-700',   bg: 'bg-teal-100',   icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  TESTING:           { label: 'Testing',             color: 'text-yellow-700', bg: 'bg-yellow-100', icon: <RefreshCw className="w-3.5 h-3.5" /> },
  TEST_FAILED:       { label: 'Test Failed',         color: 'text-red-700',    bg: 'bg-red-100',    icon: <XCircle className="w-3.5 h-3.5" /> },
  REOPENED:          { label: 'Reopened',            color: 'text-orange-700', bg: 'bg-orange-100', icon: <RefreshCw className="w-3.5 h-3.5" /> },
  READY_FOR_DEPLOY:  { label: 'Ready for Deploy',    color: 'text-indigo-700', bg: 'bg-indigo-100', icon: <Rocket className="w-3.5 h-3.5" /> },
  CLOSED:            { label: 'Closed',              color: 'text-gray-700',   bg: 'bg-gray-200',   icon: <Lock className="w-3.5 h-3.5" /> },
  // Legacy
  NEED_INFO:         { label: 'Need Info',           color: 'text-amber-700',  bg: 'bg-amber-100',  icon: <AlertCircle className="w-3.5 h-3.5" /> },
  COMPLETED_BY_DEV:  { label: 'Dev Completed',       color: 'text-teal-700',   bg: 'bg-teal-100',   icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  VERIFIED_BY_SVV:   { label: 'Verified',            color: 'text-green-700',  bg: 'bg-green-100',  icon: <Check className="w-3.5 h-3.5" /> },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  CRITICAL: { label: 'Critical', color: 'text-red-600 bg-red-100' },
  HIGH:     { label: 'High',     color: 'text-orange-600 bg-orange-100' },
  MEDIUM:   { label: 'Medium',   color: 'text-yellow-600 bg-yellow-100' },
  LOW:      { label: 'Low',      color: 'text-green-600 bg-green-100' },
};

// ─── Timeline action → icon + color ──────────────────────────
function timelineStyle(action: string): { dot: string; line: string } {
  if (action.includes('Created'))         return { dot: 'bg-blue-500', line: 'bg-blue-100' };
  if (action.includes('Closed'))          return { dot: 'bg-gray-500', line: 'bg-gray-100' };
  if (action.includes('Failed') || action.includes('Reopen')) return { dot: 'bg-red-500', line: 'bg-red-100' };
  if (action.includes('Completed') || action.includes('Fixed') || action.includes('Resolved')) return { dot: 'bg-green-500', line: 'bg-green-100' };
  if (action.includes('Testing'))         return { dot: 'bg-yellow-500', line: 'bg-yellow-100' };
  if (action.includes('Deploy') || action.includes('Ready')) return { dot: 'bg-indigo-500', line: 'bg-indigo-100' };
  if (action.includes('Comment'))         return { dot: 'bg-purple-400', line: 'bg-purple-50' };
  if (action.includes('Updated') || action.includes('Priority') || action.includes('Attachment')) return { dot: 'bg-gray-400', line: 'bg-gray-50' };
  return { dot: 'bg-blue-400', line: 'bg-blue-50' };
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });
}

// ─── Status Badge ─────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: 'text-gray-700', bg: 'bg-gray-100', icon: <Circle className="w-3.5 h-3.5" /> };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${cfg.bg} ${cfg.color}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

// ─── Attachment Grid ──────────────────────────────────────────
function AttachmentGrid({ attachments }: { attachments: any[] }) {
  if (!attachments?.length) return null;
  const images = attachments.filter(a => a.type === 'IMAGE');
  const others = attachments.filter(a => a.type !== 'IMAGE');

  return (
    <div className="space-y-3">
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {images.map((a, i) => (
            <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
              className="block rounded-lg overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity">
              <img src={a.url} alt="Attachment" className="w-full h-32 object-cover" />
            </a>
          ))}
        </div>
      )}
      {others.map((a, i) => (
        <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          {a.type === 'VIDEO' ? <Film className="w-5 h-5 text-purple-500 shrink-0" />
            : <FileText className="w-5 h-5 text-blue-500 shrink-0" />}
          <span className="text-sm text-blue-600 underline truncate">{a.url.split('/').pop()}</span>
        </a>
      ))}
    </div>
  );
}

// ─── Odoo-style Timeline Entry ────────────────────────────────
function TimelineEntry({ entry, isLast }: { entry: any; isLast: boolean }) {
  const { dot, line } = timelineStyle(entry.action);
  const isComment = entry.action === 'Comment Added' || entry.action === 'Developer Comment';

  return (
    <div className="flex gap-3">
      {/* Dot + line */}
      <div className="flex flex-col items-center">
        <div className={`w-3 h-3 rounded-full ${dot} ring-2 ring-white shrink-0 mt-1`} />
        {!isLast && <div className={`w-0.5 flex-1 mt-1 ${line} min-h-[2rem]`} />}
      </div>

      {/* Content */}
      <div className={`pb-5 flex-1 min-w-0 ${isLast ? '' : ''}`}>
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900">{entry.authorName}</span>
            <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
              {entry.authorType === 'SVV_ADMIN' ? 'Admin' : 'Developer'}
            </span>
            {entry.newStatus && <StatusBadge status={entry.newStatus} />}
          </div>
          <span className="text-xs text-gray-400 shrink-0 mt-0.5">{formatDateTime(entry.createdAt)}</span>
        </div>

        {/* Action label */}
        <p className="text-sm font-medium text-blue-700 mb-1">{entry.action}</p>

        {/* Comment */}
        {entry.comment && (
          <div className={`text-sm mt-1.5 ${isComment ? 'bg-white border border-gray-100 rounded-lg p-3 shadow-sm' : 'text-gray-600'}`}>
            <RichTextView html={entry.comment} />
          </div>
        )}

        {/* Root cause / fix details / deployment */}
        {(entry.rootCause || entry.fixDetails || entry.deploymentDetails) && (
          <div className="mt-2 bg-teal-50 border border-teal-100 rounded-lg p-3 space-y-1 text-xs">
            {entry.rootCause && <p><strong className="text-teal-800">Root Cause:</strong> <span className="text-teal-700">{entry.rootCause}</span></p>}
            {entry.fixDetails && <p><strong className="text-teal-800">Fix:</strong> <span className="text-teal-700">{entry.fixDetails}</span></p>}
            {entry.deploymentDetails && <p><strong className="text-teal-800">Deployment:</strong> <span className="text-teal-700">{entry.deploymentDetails}</span></p>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Comment Composer ─────────────────────────────────────────
function CommentComposer({ issueId, onSuccess }: { issueId: string; onSuccess: () => void }) {
  const addComment = useAddDevIssueComment();
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async () => {
    const plainText = text.replace(/<[^>]*>/g, '').trim();
    if (!plainText && files.length === 0) return;
    setUploading(true);
    try {
      await addComment.mutateAsync({ id: issueId, comment: text, attachmentFiles: files });
      setText('');
      setFiles([]);
      onSuccess();
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="border-t pt-4 space-y-3">
      <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2">
        <MessageSquare className="w-4 h-4" /> Add Comment
      </h4>
      <RichTextEditor value={text} onChange={setText} placeholder="Type your comment…" minHeight="80px" />

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-1.5 bg-gray-100 rounded-lg px-2 py-1 text-xs">
              <Paperclip className="w-3 h-3 text-gray-500" />
              <span className="truncate max-w-[120px]">{f.name}</span>
              <button onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}>
                <X className="w-3 h-3 text-gray-400 hover:text-red-500" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between items-center">
        <label className="cursor-pointer text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1.5 transition-colors">
          <Paperclip className="w-4 h-4" /> Attach files
          <input type="file" multiple accept="image/*,video/*,application/pdf" className="hidden"
            onChange={e => { if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)]); }} />
        </label>
        <Button
          onClick={handleSubmit}
          disabled={uploading || addComment.isPending || (!text.replace(/<[^>]*>/g, '').trim() && files.length === 0)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
          size="sm"
        >
          {uploading || addComment.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
          Post Comment
        </Button>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────
export default function IssueDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: issue, isLoading, refetch } = useDevIssueDetails(id as string);
  const { data: allIssues } = useDevIssues();
  const updateStatus = useUpdateDevIssueStatus();
  const updateIssue = useUpdateDevIssue();
  const deleteIssue = useDeleteDevIssue();
  const addAttachment = useAddDevIssueAttachment();

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPriority, setEditPriority] = useState('');

  // Status change
  const [newStatus, setNewStatus] = useState('');
  const [statusComment, setStatusComment] = useState('');
  const [showStatusPanel, setShowStatusPanel] = useState(false);

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Attachment upload
  const attachRef = useRef<HTMLInputElement>(null);

  if (isLoading) return (
    <div className="flex justify-center items-center min-h-[400px]">
      <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
    </div>
  );
  if (!issue) return (
    <div className="text-center py-16">
      <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500">Ticket not found.</p>
      <Link to="/settings/dev-hub" className="text-blue-600 text-sm mt-2 block">← Back to Hub</Link>
    </div>
  );

  const pCfg = PRIORITY_CONFIG[issue.priority] || { label: issue.priority, color: 'text-gray-600 bg-gray-100' };
  const sCfg = STATUS_CONFIG[issue.status] || STATUS_CONFIG.OPEN;
  const age = Math.floor((Date.now() - new Date(issue.createdAt).getTime()) / 86400000);

  const startEdit = () => {
    setEditTitle(issue.title);
    setEditDesc(issue.description);
    setEditPriority(issue.priority);
    setIsEditing(true);
  };

  const saveEdit = async () => {
    await updateIssue.mutateAsync({ id: issue.id, title: editTitle, description: editDesc, priority: editPriority });
    setIsEditing(false);
    refetch();
  };

  const handleStatusUpdate = async () => {
    if (!newStatus) return;
    await updateStatus.mutateAsync({ id: issue.id, status: newStatus, comment: statusComment || undefined });
    setNewStatus(''); setStatusComment(''); setShowStatusPanel(false);
    refetch();
  };

  const handleDelete = async () => {
    await deleteIssue.mutateAsync(issue.id);
    navigate('/settings/dev-hub');
  };

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    for (const file of Array.from(e.target.files)) {
      await addAttachment.mutateAsync({ issueId: issue.id, file }).catch(console.error);
    }
    refetch();
    e.target.value = '';
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start gap-4">
        <Link to="/settings/dev-hub">
          <Button variant="outline" size="icon" className="shrink-0"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{issue.ticketCode}</span>
            <StatusBadge status={issue.status} />
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${pCfg.color}`}>{pCfg.label}</span>
          </div>
          {isEditing ? (
            <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="text-lg font-bold" />
          ) : (
            <h1 className="text-xl font-bold text-gray-900 leading-tight">{issue.title}</h1>
          )}
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
            <span>Created by <strong>{issue.createdBy}</strong></span>
            <span>{new Date(issue.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            <span>Age: {age} day{age !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <ShareIssueButton issue={issue} allIssues={allIssues} />
          {!isEditing && (
            <Button variant="outline" size="sm" onClick={startEdit}>
              <Edit2 className="w-4 h-4 mr-1" /> Edit
            </Button>
          )}
          {isEditing && (
            <>
              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={saveEdit} disabled={updateIssue.isPending}>
                {updateIssue.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-1" />} Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                <X className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Main content ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Description */}
          <Card>
            <CardContent className="p-5">
              <h2 className="text-sm font-bold text-gray-600 mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> Description
              </h2>
              {isEditing ? (
                <RichTextEditor value={editDesc} onChange={setEditDesc} minHeight="120px" />
              ) : (
                <div className="prose prose-sm max-w-none text-gray-700">
                  {issue.description && issue.description !== 'No description provided' ? (
                    <RichTextView html={issue.description} />
                  ) : (
                    <p className="text-gray-400 italic">No description provided</p>
                  )}
                </div>
              )}
              {isEditing && (
                <div className="mt-3">
                  <label className="block text-xs font-bold mb-1 text-gray-600">Priority</label>
                  <div className="flex gap-2">
                    {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(p => (
                      <button key={p} type="button" onClick={() => setEditPriority(p)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-colors ${editPriority === p ? PRIORITY_CONFIG[p]?.color + ' border-current' : 'border-gray-200 text-gray-500'}`}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attachments */}
          {(issue.attachments?.length > 0 || true) && (
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-gray-600 flex items-center gap-2">
                    <Paperclip className="w-4 h-4" /> Attachments ({issue.attachments?.length || 0})
                  </h2>
                  <label className="cursor-pointer text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5" /> Add
                    <input ref={attachRef} type="file" multiple accept="image/*,video/*,application/pdf"
                      className="hidden" onChange={handleAttachmentUpload} />
                  </label>
                </div>
                {issue.attachments?.length > 0 ? (
                  <AttachmentGrid attachments={issue.attachments} />
                ) : (
                  <label className="cursor-pointer block border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-blue-300 transition-colors"
                    onClick={() => attachRef.current?.click()}>
                    <Upload className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">Click to upload images, videos, or documents</p>
                  </label>
                )}
              </CardContent>
            </Card>
          )}

          {/* Activity Timeline */}
          <Card>
            <CardContent className="p-5">
              <h2 className="text-sm font-bold text-gray-600 mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Activity Timeline
                <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                  {issue.timeline?.length || 0}
                </span>
              </h2>

              {/* Timeline entries — newest on top */}
              <div>
                {issue.timeline?.length > 0 ? (
                  issue.timeline.map((entry: any, i: number) => (
                    <TimelineEntry key={entry.id} entry={entry} isLast={i === issue.timeline.length - 1} />
                  ))
                ) : (
                  <p className="text-sm text-gray-400 italic">No activity yet.</p>
                )}
              </div>

              {/* Comment composer */}
              <CommentComposer issueId={issue.id} onSuccess={refetch} />
            </CardContent>
          </Card>
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-5">

          {/* Ticket Info */}
          <Card>
            <CardContent className="p-5 space-y-3">
              <h2 className="text-sm font-bold text-gray-600 mb-1">Ticket Info</h2>
              <InfoRow label="Status" value={<StatusBadge status={issue.status} />} />
              <InfoRow label="Priority" value={
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${pCfg.color}`}>{pCfg.label}</span>
              } />
              <InfoRow label="Category" value={issue.category?.name || '—'} />
              <InfoRow label="Assigned Team" value={issue.assignedTeam?.name || 'Unassigned'} />
              <InfoRow label="Created" value={new Date(issue.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} />
              <InfoRow label="Updated" value={new Date(issue.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} />
              <InfoRow label="Attachments" value={`${issue.attachments?.length || 0} files`} />
              <InfoRow label="Activity" value={`${issue.timeline?.length || 0} entries`} />
            </CardContent>
          </Card>

          {/* Admin Actions */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <h2 className="text-sm font-bold text-gray-600">Admin Actions</h2>

              {/* Status change */}
              <div>
                <button
                  onClick={() => setShowStatusPanel(!showStatusPanel)}
                  className="w-full flex items-center justify-between text-sm font-medium text-gray-700 hover:text-blue-600 py-1.5 transition-colors"
                >
                  Change Status <ChevronDown className={`w-4 h-4 transition-transform ${showStatusPanel ? 'rotate-180' : ''}`} />
                </button>

                {showStatusPanel && (
                  <div className="mt-2 space-y-2">
                    <div className="grid grid-cols-1 gap-1.5">
                      {ALL_STATUSES.map(s => (
                        <button
                          key={s}
                          onClick={() => setNewStatus(s === newStatus ? '' : s)}
                          className={`text-left px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                            newStatus === s ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-100 hover:border-gray-200 text-gray-600'
                          } ${issue.status === s ? 'opacity-50 cursor-not-allowed' : ''}`}
                          disabled={issue.status === s}
                        >
                          {STATUS_CONFIG[s]?.label || s}
                          {ADMIN_ONLY_STATUSES.includes(s) && <span className="ml-1 text-gray-400">(Admin only)</span>}
                        </button>
                      ))}
                    </div>

                    {newStatus && (
                      <div className="space-y-2">
                        <textarea
                          value={statusComment}
                          onChange={e => setStatusComment(e.target.value)}
                          placeholder="Optional: reason for status change…"
                          className="w-full text-xs p-2 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
                          rows={2}
                        />
                        <Button
                          onClick={handleStatusUpdate}
                          disabled={updateStatus.isPending}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                          size="sm"
                        >
                          {updateStatus.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                          Update to {STATUS_CONFIG[newStatus]?.label || newStatus}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Close / Reopen — admin only */}
              {issue.status !== 'CLOSED' ? (
                <Button
                  onClick={() => updateStatus.mutateAsync({ id: issue.id, status: 'CLOSED', comment: 'Closed by Admin' }).then(() => refetch())}
                  disabled={updateStatus.isPending}
                  className="w-full bg-gray-800 hover:bg-gray-900 text-white"
                  size="sm"
                >
                  <Lock className="w-4 h-4 mr-1" /> Close Ticket
                </Button>
              ) : (
                <Button
                  onClick={() => updateStatus.mutateAsync({ id: issue.id, status: 'REOPENED', comment: 'Reopened by Admin' }).then(() => refetch())}
                  disabled={updateStatus.isPending}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                  size="sm"
                >
                  <RefreshCw className="w-4 h-4 mr-1" /> Reopen Ticket
                </Button>
              )}

              {/* Delete */}
              {!confirmDelete ? (
                <Button
                  onClick={() => setConfirmDelete(true)}
                  variant="outline"
                  className="w-full text-red-600 border-red-200 hover:bg-red-50"
                  size="sm"
                >
                  <Trash2 className="w-4 h-4 mr-1" /> Delete Ticket
                </Button>
              ) : (
                <div className="border border-red-200 rounded-lg p-3 bg-red-50 space-y-2">
                  <p className="text-xs text-red-700 font-medium">Permanently delete this ticket?</p>
                  <div className="flex gap-2">
                    <Button onClick={handleDelete} disabled={deleteIssue.isPending}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white" size="sm">
                      {deleteIssue.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Yes, Delete'}
                    </Button>
                    <Button onClick={() => setConfirmDelete(false)} variant="outline" className="flex-1" size="sm">Cancel</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Helper ──────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs font-medium text-gray-800">{value}</span>
    </div>
  );
}
