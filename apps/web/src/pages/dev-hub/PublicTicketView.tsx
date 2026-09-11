import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDevIssueDetails } from '@/api/devHub.api';
import { RichTextView } from '@/components/ui/RichTextEditor';
import {
  Loader2, AlertCircle, Clock, User, Tag, Paperclip,
  ExternalLink, MessageSquare, CheckCircle2, XCircle,
  RefreshCw, Play, Lock, Rocket, Circle, Film, FileText, ImageIcon
} from 'lucide-react';

// ── Status config ─────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  OPEN:             { label: 'Open',               color: 'text-blue-700',   bg: 'bg-blue-100' },
  ASSIGNED:         { label: 'Assigned',           color: 'text-purple-700', bg: 'bg-purple-100' },
  IN_PROGRESS:      { label: 'In Progress',        color: 'text-orange-700', bg: 'bg-orange-100' },
  DEV_COMPLETED:    { label: 'Dev Completed',      color: 'text-teal-700',   bg: 'bg-teal-100' },
  TESTING:          { label: 'Testing',            color: 'text-yellow-700', bg: 'bg-yellow-100' },
  TEST_FAILED:      { label: 'Test Failed',        color: 'text-red-700',    bg: 'bg-red-100' },
  REOPENED:         { label: 'Reopened',           color: 'text-orange-700', bg: 'bg-orange-100' },
  READY_FOR_DEPLOY: { label: 'Ready for Deploy',   color: 'text-indigo-700', bg: 'bg-indigo-100' },
  CLOSED:           { label: 'Closed',             color: 'text-gray-600',   bg: 'bg-gray-200' },
  NEED_INFO:        { label: 'Need Info',          color: 'text-amber-700',  bg: 'bg-amber-100' },
  COMPLETED_BY_DEV: { label: 'Dev Completed',      color: 'text-teal-700',   bg: 'bg-teal-100' },
  VERIFIED_BY_SVV:  { label: 'Verified',           color: 'text-green-700',  bg: 'bg-green-100' },
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

// ── Timeline Entry ─────────────────────────────────────────────
function TimelineEntry({ entry, isLast }: { entry: any; isLast: boolean }) {
  const { dot, ring } = getTimelineStyle(entry.action);
  const isAdminAction = entry.authorType === 'SVV_ADMIN';
  const isComment = entry.action === 'Comment Added' || entry.action === 'Developer Comment' || entry.action === 'Admin Comment';

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
      <div className="pb-6 flex-1 min-w-0">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className={`text-sm font-bold ${isAdminAction ? 'text-gray-900' : 'text-purple-800'}`}>
            {entry.authorName}
          </span>
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
            isAdminAction ? 'bg-gray-100 text-gray-600' : 'bg-purple-100 text-purple-700'
          }`}>
            {isAdminAction ? '⚙ Admin' : '👨‍💻 Developer'}
          </span>
          {entry.newStatus && <StatusBadge status={entry.newStatus} />}
          <span className="text-xs text-gray-400 ml-auto">{fmtDate(entry.createdAt)}</span>
        </div>

        {/* Action label */}
        <p className={`text-sm font-semibold mb-1.5 ${
          isAdminAction ? 'text-blue-700' : 'text-purple-700'
        }`}>
          {entry.action}
        </p>

        {/* Comment text */}
        {cleanComment && (
          <div className={`rounded-xl p-3 text-sm ${
            isComment
              ? isAdminAction
                ? 'bg-blue-50 border border-blue-100'
                : 'bg-purple-50 border border-purple-100'
              : 'bg-gray-50 border border-gray-100'
          }`}>
            <RichTextView html={cleanComment} />
          </div>
        )}

        {/* Embedded attachment URLs from comment */}
        {commentUrls.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {commentUrls.map((url, i) => {
              const isImg = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
              return isImg ? (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                  <img src={url} alt="attachment" className="w-24 h-24 object-cover rounded-lg border border-gray-200 hover:opacity-90" />
                </a>
              ) : (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-blue-600 hover:bg-blue-50">
                  <FileText className="w-3.5 h-3.5" />
                  Attachment {i + 1}
                </a>
              );
            })}
          </div>
        )}

        {/* Root cause / fix details box */}
        {(entry.rootCause || entry.fixDetails || entry.deploymentDetails) && (
          <div className="mt-2 bg-teal-50 border border-teal-200 rounded-xl p-3 space-y-1.5 text-sm">
            {entry.rootCause && (
              <div><span className="font-bold text-teal-800">Root Cause:</span> <span className="text-teal-700">{entry.rootCause}</span></div>
            )}
            {entry.fixDetails && (
              <div><span className="font-bold text-teal-800">Fix Applied:</span> <span className="text-teal-700">{entry.fixDetails}</span></div>
            )}
            {entry.deploymentDetails && (
              <div><span className="font-bold text-teal-800">Deployment:</span> <span className="text-teal-700">{entry.deploymentDetails}</span></div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function PublicTicketView() {
  const { id } = useParams<{ id: string }>();
  const { data: issue, isLoading } = useDevIssueDetails(id as string);
  const [copiedLink, setCopiedLink] = useState(false);

  const publicUrl = `${window.location.origin}/public/ticket/${id}`;

  const copyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // ── Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading ticket…</p>
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

  const pCfg = PRIORITY_CONFIG[issue.priority] || { label: issue.priority, color: 'text-gray-700 bg-gray-100', strip: 'bg-gray-400' };
  const sCfg = STATUS_CONFIG[issue.status] || STATUS_CONFIG.OPEN;
  const age = Math.floor((Date.now() - new Date(issue.createdAt).getTime()) / 86400000);
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
              <span className="font-black text-lg text-blue-400 tracking-tight">'PAY</span>
            </div>
            <div className="w-px h-6 bg-white/20" />
            <div>
              <p className="text-xs font-bold text-blue-200">Developer Issue Hub</p>
              <p className="text-[10px] text-white/50">Track • Collaborate • Resolve</p>
            </div>
          </div>
          <button
            onClick={copyLink}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
          >
            {copiedLink ? '✓ Copied!' : '🔗 Copy Link'}
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
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
              {issue.category?.name && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                  {issue.category.name}
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight mb-4">
              {issue.title || 'Developer Issue'}
            </h1>

            {/* Meta grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <MetaCell icon={<User className="w-4 h-4 text-blue-500" />} label="Assigned To" value={issue.assignedTeam?.name || 'SVV Dev Team'} />
              <MetaCell icon={<Clock className="w-4 h-4 text-orange-500" />} label="Created" value={fmtDateShort(issue.createdAt)} />
              <MetaCell icon={<Tag className="w-4 h-4 text-purple-500" />} label="Age" value={`${age} day${age !== 1 ? 's' : ''}`} />
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
            SVV'PAY — Developer Issue Hub &nbsp;•&nbsp; svvdigitalhub-svv.vercel.app
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
