import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDevIssueDetails, useVendorTickets, useAddDevIssueComment } from '@/api/devHub.api';
import { RichTextView } from '@/components/ui/RichTextEditor';
import RichTextEditor from '@/components/ui/RichTextEditor';
import { Button } from '@/components/ui/button';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import {
  Loader2, AlertCircle, Clock, User, Tag, Paperclip,
  ExternalLink, MessageSquare, CheckCircle2, XCircle,
  RefreshCw, Play, Lock, Rocket, Circle, Film, FileText, ImageIcon, X
} from 'lucide-react';

// ── Status config ──────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  OPEN:             { label: 'Open',               color: 'text-blue-700',   bg: 'bg-blue-100' },
  ASSIGNED:         { label: 'Assigned',           color: 'text-purple-700', bg: 'bg-purple-100' },
  IN_PROGRESS:      { label: 'In Progress',        color: 'text-orange-700', bg: 'bg-orange-100' },
  WAITING_VENDOR:   { label: 'Waiting Vendor',     color: 'text-amber-700',  bg: 'bg-amber-100' },
  WAITING_CUSTOMER: { label: 'Waiting Customer',   color: 'text-pink-700',   bg: 'bg-pink-100' },
  RESOLVED:         { label: 'Resolved',           color: 'text-green-700',  bg: 'bg-green-100' },
  REOPENED:         { label: 'Reopened',           color: 'text-orange-700', bg: 'bg-orange-100' },
  CLOSED:           { label: 'Closed',             color: 'text-gray-600',   bg: 'bg-gray-200' },
  // Legacy
  DEV_COMPLETED:    { label: 'Dev Completed',      color: 'text-teal-700',   bg: 'bg-teal-100' },
  TESTING:          { label: 'Testing',            color: 'text-yellow-700', bg: 'bg-yellow-100' },
  TEST_FAILED:      { label: 'Test Failed',        color: 'text-red-700',    bg: 'bg-red-100' },
  READY_FOR_DEPLOY: { label: 'Ready for Deploy',   color: 'text-indigo-700', bg: 'bg-indigo-100' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; strip: string }> = {
  CRITICAL: { label: 'Critical', color: 'text-red-700 bg-red-100',    strip: 'bg-red-500' },
  HIGH:     { label: 'High',     color: 'text-orange-700 bg-orange-100', strip: 'bg-orange-500' },
  MEDIUM:   { label: 'Medium',   color: 'text-yellow-700 bg-yellow-100', strip: 'bg-yellow-500' },
  LOW:      { label: 'Low',      color: 'text-green-700 bg-green-100', strip: 'bg-green-500' },
};

// ── Timeline dot color per action ─────────────────────────────
function getTimelineStyle(action: string): { dot: string; ring: string } {
  if (action.includes('Created'))   return { dot: 'bg-blue-500', ring: 'ring-blue-100' };
  if (action.includes('Closed'))    return { dot: 'bg-gray-500', ring: 'ring-gray-100' };
  if (action.includes('Failed') || action.includes('Reopen'))
    return { dot: 'bg-red-500', ring: 'ring-red-100' };
  if (action.includes('Completed') || action.includes('Verified') || action.includes('Fixed'))
    return { dot: 'bg-green-500', ring: 'ring-green-100' };
  if (action.includes('Testing'))   return { dot: 'bg-yellow-500', ring: 'ring-yellow-100' };
  if (action.includes('Deploy') || action.includes('Ready'))
    return { dot: 'bg-indigo-500', ring: 'ring-indigo-100' };
  if (action.includes('Comment') || action.includes('Developer Comment'))
    return { dot: 'bg-purple-500', ring: 'ring-purple-100' };
  if (action.includes('Updated') || action.includes('Attachment'))
    return { dot: 'bg-gray-400', ring: 'ring-gray-100' };
  return { dot: 'bg-blue-400', ring: 'ring-blue-100' };
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

// ── Status Badge ──────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: 'text-gray-600', bg: 'bg-gray-100' };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

// ── Attachment Item ────────────────────────────────────────────
function AttachmentItem({ att }: { att: any }) {
  if (att.type === 'IMAGE') {
    return (
      <a href={att.url} target="_blank" rel="noopener noreferrer"
        className="block rounded-xl overflow-hidden border border-gray-200 hover:border-blue-300 transition-colors shadow-sm">
        <img src={att.url} alt="Attachment" className="w-full h-40 object-cover" />
        <div className="px-2 py-1.5 bg-gray-50 flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs text-gray-500 truncate">Image</span>
          <ExternalLink className="w-3 h-3 text-gray-400 ml-auto" />
        </div>
      </a>
    );
  }
  if (att.type === 'VIDEO') {
    return (
      <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
        <video src={att.url} controls className="w-full h-40 object-cover bg-black" />
        <div className="px-2 py-1.5 bg-gray-50 flex items-center gap-1.5">
          <Film className="w-3.5 h-3.5 text-purple-500" />
          <span className="text-xs text-gray-500">Video</span>
        </div>
      </div>
    );
  }
  // Document / PDF
  return (
    <a href={att.url} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors shadow-sm group">
      <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
        <FileText className="w-5 h-5 text-red-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate group-hover:text-blue-700">
          {att.url.split('/').pop()?.split('?')[0] || 'Document'}
        </p>
        <p className="text-xs text-gray-400">PDF / Document</p>
      </div>
      <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-500 shrink-0" />
    </a>
  );
}

// ── Vendor Summary Card ───────────────────────────────────────
function VendorSummaryCard({ vendorId, vendorName }: { vendorId: string; vendorName: string }) {
  const { data: tickets, isLoading } = useVendorTickets(vendorId);

  if (isLoading || !tickets) return null;

  const total = tickets.length;
  const open = tickets.filter(t => ['OPEN', 'ASSIGNED'].includes(t.status)).length;
  const inProgress = tickets.filter(t => t.status === 'IN_PROGRESS').length;
  const waiting = tickets.filter(t => ['WAITING_VENDOR', 'WAITING_CUSTOMER'].includes(t.status)).length;
  const resolved = tickets.filter(t => t.status === 'RESOLVED').length;
  const closed = tickets.filter(t => t.status === 'CLOSED').length;
  
  const overdueCount = tickets.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'CLOSED').length;
  const openTickets = tickets.filter(t => !['CLOSED', 'RESOLVED'].includes(t.status)).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const oldestOpen = openTickets.length > 0 ? Math.floor((Date.now() - new Date(openTickets[0].createdAt).getTime()) / 86400000) + ' Days' : 'N/A';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        <User className="w-5 h-5 text-blue-600" />
        {vendorName} — Vendor Summary
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-blue-50 p-3 rounded-xl border border-blue-100"><p className="text-xs text-blue-600 font-bold uppercase">Total</p><p className="text-2xl font-black text-blue-900">{total}</p></div>
        <div className="bg-orange-50 p-3 rounded-xl border border-orange-100"><p className="text-xs text-orange-600 font-bold uppercase">Open/Assigned</p><p className="text-2xl font-black text-orange-900">{open}</p></div>
        <div className="bg-amber-50 p-3 rounded-xl border border-amber-100"><p className="text-xs text-amber-600 font-bold uppercase">In Progress</p><p className="text-2xl font-black text-amber-900">{inProgress}</p></div>
        <div className="bg-pink-50 p-3 rounded-xl border border-pink-100"><p className="text-xs text-pink-600 font-bold uppercase">Waiting Resp.</p><p className="text-2xl font-black text-pink-900">{waiting}</p></div>
        <div className="bg-teal-50 p-3 rounded-xl border border-teal-100"><p className="text-xs text-teal-600 font-bold uppercase">Resolved</p><p className="text-2xl font-black text-teal-900">{resolved}</p></div>
        <div className="bg-gray-50 p-3 rounded-xl border border-gray-200"><p className="text-xs text-gray-500 font-bold uppercase">Closed</p><p className="text-2xl font-black text-gray-700">{closed}</p></div>
        <div className="bg-purple-50 p-3 rounded-xl border border-purple-100"><p className="text-xs text-purple-600 font-bold uppercase">Oldest Open</p><p className="text-xl font-black text-purple-900 mt-1">{oldestOpen}</p></div>
        <div className="bg-red-50 p-3 rounded-xl border border-red-100"><p className="text-xs text-red-600 font-bold uppercase">Overdue</p><p className="text-2xl font-black text-red-900">{overdueCount}</p></div>
      </div>
    </div>
  );
}

// ── Comment Composer ──────────────────────────────────────────
function VendorCommentComposer({ issueId, vendorName, onSuccess }: { issueId: string; vendorName: string; onSuccess: () => void }) {
  const addComment = useAddDevIssueComment();
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async () => {
    const plainText = text.replace(/<[^>]*>/g, '').trim();
    if (!plainText && files.length === 0) return;
    setUploading(true);
    try {
      await addComment.mutateAsync({ id: issueId, comment: text, attachmentFiles: files, authorType: 'VENDOR', authorName: vendorName });
      setText('');
      setFiles([]);
      onSuccess();
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mt-6 space-y-4">
      <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-blue-600" /> Reply to Admin
      </h4>
      <RichTextEditor value={text} onChange={setText} placeholder="Type your reply to SVV Admin..." minHeight="120px" />

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-1.5 bg-gray-100 rounded-lg px-2 py-1 text-xs border border-gray-200">
              <Paperclip className="w-3 h-3 text-gray-500" />
              <span className="truncate max-w-[120px]">{f.name}</span>
              <button onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}>
                <X className="w-3 h-3 text-gray-400 hover:text-red-500" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between items-center border-t border-gray-100 pt-3">
        <label className="cursor-pointer text-xs font-semibold text-gray-600 hover:text-blue-600 flex items-center gap-1.5 transition-colors bg-gray-50 hover:bg-blue-50 px-3 py-2 rounded-lg border border-gray-200 hover:border-blue-200">
          <Paperclip className="w-4 h-4" /> Attach Files (Images/PDFs/Video)
          <input type="file" multiple accept="image/*,video/*,application/pdf" className="hidden"
            onChange={e => { if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)]); }} />
        </label>
        <Button
          onClick={handleSubmit}
          disabled={uploading || addComment.isPending || (!text.replace(/<[^>]*>/g, '').trim() && files.length === 0)}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
        >
          {uploading || addComment.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Post Reply
        </Button>
      </div>
    </div>
  );
}

// ── Timeline Entry ─────────────────────────────────────────────
function TimelineEntry({ entry, isLast }: { entry: any; isLast: boolean }) {
  const getTimelineStyle = (action: string) => {
    const l = action.toLowerCase();
    if (l.includes('created') || l.includes('opened')) return { dot: 'bg-blue-500', ring: 'ring-blue-100' };
    if (l.includes('vendor')) return { dot: 'bg-purple-500', ring: 'ring-purple-100' };
    if (l.includes('admin comment') || l.includes('comment added')) return { dot: 'bg-indigo-500', ring: 'ring-indigo-100' };
    if (l.includes('resolved') || l.includes('completed')) return { dot: 'bg-green-500', ring: 'ring-green-100' };
    if (l.includes('failed') || l.includes('overdue')) return { dot: 'bg-red-500', ring: 'ring-red-100' };
    return { dot: 'bg-gray-400', ring: 'ring-gray-100' };
  };

  const { dot, ring } = getTimelineStyle(entry.action);
  const isAdminAction = entry.authorType === 'SVV_ADMIN';
  const isVendorAction = entry.authorType === 'VENDOR';
  const isComment = entry.action.includes('Comment');

  // Extract attachment URLs from comment if embedded
  const attachmentMatch = entry.comment?.match(/\[Attachments: ([^\]]+)\]/);
  const commentUrls: string[] = attachmentMatch
    ? attachmentMatch[1].split(', ').map((u: string) => u.trim())
    : [];
  const cleanComment = entry.comment?.replace(/\n\n\[Attachments: [^\]]+\]/, '').trim();

  return (
    <div className="flex gap-4">
      {/* Dot + vertical line */}
      <div className="flex flex-col items-center shrink-0">
        <div className={`w-4 h-4 rounded-full ${dot} ring-4 ${ring} shrink-0 mt-1`} />
        {!isLast && <div className="w-px flex-1 bg-gray-200 mt-2 min-h-[2rem]" />}
      </div>

      {/* Content */}
      <div className="flex-1 pb-6 min-w-0">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-semibold ${isAdminAction ? 'text-blue-900' : isVendorAction ? 'text-purple-900' : 'text-gray-900'}`}>
              {entry.authorName}
            </span>
            <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${isAdminAction ? 'bg-blue-100 text-blue-700' : isVendorAction ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>
              {isAdminAction ? 'Admin' : isVendorAction ? 'Vendor' : 'System'}
            </span>
            {entry.newStatus && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${STATUS_CONFIG[entry.newStatus]?.bg} ${STATUS_CONFIG[entry.newStatus]?.color}`}>
                {STATUS_CONFIG[entry.newStatus]?.label || entry.newStatus}
              </span>
            )}
          </div>
          <span className="text-xs text-gray-400 shrink-0 mt-0.5">
            {new Date(entry.createdAt).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Action label */}
        <p className="text-sm font-medium text-gray-500 mb-1">{entry.action}</p>

        {/* Comment */}
        {cleanComment && (
          <div className={`text-sm mt-2 ${isComment ? (isAdminAction ? 'bg-blue-50/50 border border-blue-100' : 'bg-purple-50/50 border border-purple-100') + ' rounded-xl p-4 shadow-sm' : 'text-gray-700'}`}>
            <RichTextView html={cleanComment} />
          </div>
        )}

        {/* Embedded Attachments inside Comment */}
        {commentUrls.length > 0 && (
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {commentUrls.map((url, i) => {
              const isImage = url.match(/\.(jpeg|jpg|gif|png|webp)$/i) || url.includes('token='); // Supabase urls
              const isVideo = url.match(/\.(mp4|webm|ogg)$/i);
              const isPdf = url.match(/\.pdf$/i);
              
              if (isImage) {
                return <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden border border-gray-200 hover:border-blue-400 transition-colors"><img src={url} alt="Attachment" className="w-full h-24 object-cover" /></a>;
              } else if (isVideo) {
                return <video key={i} src={url} controls className="w-full h-24 rounded-lg bg-black object-cover" />;
              } else if (isPdf) {
                return <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-blue-50 transition-colors h-24"><FileText className="w-6 h-6 text-red-500" /><span className="text-xs font-medium text-gray-700 break-all line-clamp-3">View PDF Document</span></a>;
              }
              return (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 p-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-blue-50 transition-colors h-24 text-xs font-medium text-gray-600">
                  <ExternalLink className="w-4 h-4" /> Open File
                </a>
              );
            })}
          </div>
        )}

        {/* Root cause / fix details / deployment */}
        {(entry.rootCause || entry.fixDetails || entry.deploymentDetails) && (
          <div className="mt-3 bg-teal-50 border border-teal-100 rounded-xl p-4 space-y-2 text-sm">
            {entry.rootCause && <div><span className="font-bold text-teal-800">Root Cause:</span> <span className="text-teal-700">{entry.rootCause}</span></div>}
            {entry.fixDetails && <div><span className="font-bold text-teal-800">Fix Applied:</span> <span className="text-teal-700">{entry.fixDetails}</span></div>}
            {entry.deploymentDetails && <div><span className="font-bold text-teal-800">Deployment:</span> <span className="text-teal-700">{entry.deploymentDetails}</span></div>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function PublicTicketView() {
  const { id } = useParams<{ id: string }>();
  const { data: issue, isLoading, refetch } = useDevIssueDetails(id as string);
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [vendorEmail, setVendorEmail] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  
  const [copiedLink, setCopiedLink] = useState(false);
  const publicUrl = `${window.location.origin}/public/ticket/${id}`;

  const copyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleGoogleSuccess = (credentialResponse: any) => {
    try {
      const decoded: any = jwtDecode(credentialResponse.credential);
      const email = decoded.email;
      
      const vendorEmailsStr = issue?.assignedTeam?.contactEmail || '';
      const authorizedEmails = vendorEmailsStr.split(',').map((e: string) => e.trim().toLowerCase());
      
      if (authorizedEmails.includes(email.toLowerCase())) {
        setIsAuthenticated(true);
        setVendorEmail(email);
        setAuthError(null);
      } else {
        setAuthError(`Email ${email} is not authorized for this vendor. Please ask the Admin to add it.`);
      }
    } catch (err) {
      setAuthError("Failed to decode Google token.");
    }
  };

  // ── Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm font-medium">Loading ticket…</p>
        </div>
      </div>
    );
  }

  // ── Not found
  if (!issue) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center px-4">
          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-gray-700 mb-2">Ticket Not Found</h1>
          <p className="text-gray-400 text-sm">This ticket may have been deleted or the link is invalid.</p>
        </div>
      </div>
    );
  }

  // ── Vendor Auth Gateway
  if (!isAuthenticated && issue.assignedTeamId) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <nav className="bg-[#081B3A] text-white shadow-lg py-3 px-4 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <div><span className="font-black text-lg">SVV</span><span className="font-black text-lg text-blue-400">&apos;PAY</span></div>
            <div className="w-px h-6 bg-white/20" />
            <p className="text-xs font-bold text-blue-200">Vendor Access</p>
          </div>
        </nav>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 max-w-sm w-full text-center">
            <Lock className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Secure Vendor Access</h2>
            <p className="text-sm text-gray-500 mb-6">
              This ticket is assigned to <strong>{issue.assignedTeam.name}</strong>. Please sign in with an authorized Google account to view it.
            </p>
            <div className="flex justify-center mb-4">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setAuthError("Google Login Failed.")}
                useOneTap
              />
            </div>
            {authError && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-100 p-3 rounded-lg text-left">
                <strong>Access Denied:</strong><br/>{authError}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const pCfg = PRIORITY_CONFIG[issue.priority] || { label: issue.priority, color: 'text-gray-700 bg-gray-100', strip: 'bg-gray-400' };
  const sCfg = STATUS_CONFIG[issue.status] || STATUS_CONFIG.OPEN;
  
  // Ticket Aging calculation
  const createdDate = new Date(issue.createdAt);
  const now = Date.now();
  const ageMs = now - createdDate.getTime();
  const ageDays = Math.floor(ageMs / 86400000);
  const ageHours = Math.floor((ageMs % 86400000) / 3600000);
  
  const isOverdue = issue.dueDate && new Date(issue.dueDate) < new Date() && issue.status !== 'CLOSED' && issue.status !== 'RESOLVED';
  
  let ageColor = 'text-green-700 bg-green-50 border-green-200';
  if (ageDays >= 1 && ageDays < 3) ageColor = 'text-yellow-700 bg-yellow-50 border-yellow-200';
  else if (ageDays >= 3 && ageDays < 7) ageColor = 'text-orange-700 bg-orange-50 border-orange-200';
  else if (ageDays >= 7) ageColor = 'text-red-700 bg-red-50 border-red-200';

  const images = (issue.attachments || []).filter((a: any) => a.type === 'IMAGE');
  const videos = (issue.attachments || []).filter((a: any) => a.type === 'VIDEO');
  const docs = (issue.attachments || []).filter((a: any) => a.type === 'DOCUMENT');
  const allAttachments = issue.attachments || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Top Navigation Bar ── */}
      <nav className="sticky top-0 z-20 bg-[#081B3A] text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <span className="font-black text-lg tracking-tight">SVV</span>
              <span className="font-black text-lg text-blue-400 tracking-tight">&apos;PAY</span>
            </div>
            <div className="w-px h-6 bg-white/20" />
            <div>
              <p className="text-xs font-bold text-blue-200">Vendor Collaboration Hub</p>
              <p className="text-[10px] text-white/50">Track • Collaborate • Resolve</p>
            </div>
          </div>
          <div className="flex gap-2">
            {isAuthenticated && (
              <div className="hidden sm:flex items-center gap-2 bg-blue-900/50 px-3 py-1 rounded-full border border-blue-800">
                <User className="w-4 h-4 text-blue-300" />
                <span className="text-xs font-medium text-blue-100">{vendorEmail}</span>
              </div>
            )}
            <button
              onClick={copyLink}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
            >
              {copiedLink ? '✓ Copied!' : '🔗 Copy Link'}
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        
        {/* Render Vendor Summary if assigned */}
        {issue.assignedTeamId && (
          <VendorSummaryCard vendorId={issue.assignedTeamId} vendorName={issue.assignedTeam.name} />
        )}

        {/* ── Ticket Header Card ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Priority strip */}
          <div className={`h-1.5 w-full ${pCfg.strip}`} />

          <div className="p-5 sm:p-6">
            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
                {issue.ticketCode}
              </span>
              <StatusBadge status={issue.status} />
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${pCfg.color}`}>
                {pCfg.label} Priority
              </span>
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                {issue.category?.name || 'General'}
              </span>
            </div>

            {/* Ticket Aging row */}
            <div className="flex flex-wrap items-center gap-2 mb-4 bg-gray-50 p-2.5 rounded-lg border border-gray-100 text-xs">
              <div className="flex items-center gap-1.5 text-gray-600">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <span>Created: <strong>{createdDate.toLocaleDateString()}</strong></span>
              </div>
              <div className="w-px h-3 bg-gray-300" />
              <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${ageColor}`}>
                <Clock className="w-3.5 h-3.5" />
                <span>Age: <strong>{ageDays} Days, {ageHours} Hours</strong></span>
              </div>
              {isOverdue && (
                <>
                  <div className="w-px h-3 bg-gray-300" />
                  <div className="flex items-center gap-1 text-red-700 font-bold bg-red-100 px-2 py-0.5 rounded-full">
                    <AlertCircle className="w-3 h-3" /> OVERDUE
                  </div>
                </>
              )}
            </div>            {/* Title */}
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight mb-4">
              {issue.title || 'Developer Issue'}
            </h1>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <MetaCell icon={<User className="w-4 h-4 text-blue-500" />} label="Assigned To" value={issue.assignedTeam?.name || 'SVV Dev Team'} />
              <MetaCell icon={<Clock className="w-4 h-4 text-orange-500" />} label="Created" value={createdDate.toLocaleDateString()} />
              <MetaCell icon={<Tag className="w-4 h-4 text-purple-500" />} label="Age" value={`${ageDays} day${ageDays !== 1 ? 's' : ''}`} />
              <MetaCell icon={<MessageSquare className="w-4 h-4 text-green-500" />} label="Activity" value={`${issue.timeline?.length || 0} entries`} />
            </div>
          </div>
        </div>

        {/* ── Description ── */}
        {issue.description && issue.description !== 'No description provided' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Description</h2>
            <div className="prose prose-sm max-w-none text-gray-700">
              <RichTextView html={issue.description} />
            </div>
          </div>
        )}

        {/* ── Attachments ── */}
        {allAttachments.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Paperclip className="w-4 h-4" />
              Attachments ({allAttachments.length})
            </h2>

            {/* Images grid */}
            {images.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5" /> Images ({images.length})
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {images.map((a: any, i: number) => <AttachmentItem key={i} att={a} />)}
                </div>
              </div>
            )}

            {/* Videos */}
            {videos.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5" /> Videos ({videos.length})
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {videos.map((a: any, i: number) => <AttachmentItem key={i} att={a} />)}
                </div>
              </div>
            )}

            {/* Documents */}
            {docs.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Documents ({docs.length})
                </p>
                <div className="space-y-2">
                  {docs.map((a: any, i: number) => <AttachmentItem key={i} att={a} />)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Full Conversation Timeline ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Full Conversation Timeline
          </h2>
          <p className="text-xs text-gray-400 mb-5">
            Showing all activity — Admin actions + Developer updates (newest first)
          </p>

          {/* Legend */}
          <div className="flex items-center gap-4 mb-5 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
              Admin (SVV)
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
              Developer
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
              Completed
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
              Failed / Reopened
            </div>
          </div>

          {issue.timeline?.length > 0 ? (
            issue.timeline.map((entry: any, i: number) => (
              <TimelineEntry key={entry.id} entry={entry} isLast={i === issue.timeline.length - 1} />
            ))
          ) : (
            <div className="text-center py-8">
              <Clock className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No activity yet</p>
            </div>
          )}

          {/* Interactive Reply for Vendor */}
          {isAuthenticated && (
            <VendorCommentComposer issueId={issue.id} vendorName={issue.assignedTeam?.name || 'Vendor'} onSuccess={refetch} />
          )}
        </div>

        {/* ── Share Link ── */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 text-white">
          <p className="text-sm font-bold mb-2">🔗 Shareable Ticket Link</p>
          <div className="flex items-center gap-3 bg-white/10 rounded-xl p-3">
            <p className="text-xs font-mono text-blue-100 flex-1 break-all">{publicUrl}</p>
            <button
              onClick={copyLink}
              className="shrink-0 bg-white text-blue-700 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
            >
              {copiedLink ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
          <p className="text-xs text-blue-200 mt-2">Share this link — no login required to view</p>
        </div>

        {/* ── Footer ── */}
        <div className="text-center py-4">
          <p className="text-xs text-gray-400">
            SVV&apos;PAY — Developer Issue Hub &nbsp;•&nbsp; svvdigitalhub-svv.vercel.app
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Meta cell helper ──────────────────────────────────────────
function MetaCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl">
      <div className="shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] text-gray-400 font-medium">{label}</p>
        <p className="text-xs font-bold text-gray-800 truncate">{value}</p>
      </div>
    </div>
  );
}
