import React, { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useIssue, useAddIssueComment, useUpdateIssueStatus, useAssignIssue } from '@/api/issues.api';
import { useGenerateServiceToken } from '@/api/portal.api';
import { useUsers } from '@/api/users.api';
import { useAuthStore } from '@/stores/auth.store';
import StatusBadge from '@/components/shared/StatusBadge';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { mediaUrl } from '@/lib/media';
import { QRCodeSVG } from 'qrcode.react';
import {
  AlertCircle, Paperclip, Send, CheckCircle2, User, Clock,
  X, FileText, ChevronRight, MessageSquare, Activity, UserPlus,
  ArrowUpRight, Check, XCircle, Tag, Maximize2, Box,
  Building2, RefreshCw, Timer, ShieldAlert, UserCheck,
  CornerDownRight, Zap, Info, FileImage, ExternalLink,
  QrCode, Copy, CheckCheck, Printer, Wrench, Phone, MapPin, Sparkles, IndianRupee
} from 'lucide-react';

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

function formatDateTime(d: Date | string | null | undefined) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
}

function getRoleBadge(role?: string) {
  switch (role) {
    case 'SUPER_ADMIN':
    case 'ADMIN':
      return { bg: 'bg-red-50 text-red-700 border-red-200', label: 'Admin', avatarBg: 'bg-red-600' };
    case 'BRANCH_MANAGER':
      return { bg: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Manager', avatarBg: 'bg-amber-600' };
    case 'TECHNICIAN':
      return { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', label: 'Tech', avatarBg: 'bg-indigo-600' };
    case 'STAFF':
      return { bg: 'bg-purple-50 text-purple-700 border-purple-200', label: 'Staff', avatarBg: 'bg-purple-600' };
    default:
      return { bg: 'bg-gray-50 text-gray-700 border-gray-200', label: role || 'User', avatarBg: 'bg-blue-600' };
  }
}

function parseTechReport(content: string) {
  if (!content) return null;
  if (content.includes('<!--TECH_REPORT_START-->')) {
    try {
      const jsonStr = content.split('<!--TECH_REPORT_START-->')[1].split('<!--TECH_REPORT_END-->')[0];
      return JSON.parse(jsonStr);
    } catch {
      return null;
    }
  }
  if (content.includes('[External Technician Service Report]') || content.includes('Field Service Update')) {
    // Parse legacy formatted text
    const lines = content.split('\n');
    const getVal = (prefix: string) => {
      const line = lines.find(l => l.toLowerCase().includes(prefix.toLowerCase()));
      return line ? line.replace(/\*\*/g, '').split(':')[1]?.trim() : '';
    };
    return {
      isTechReport: true,
      techName: getVal('Technician') || 'External Technician',
      company: getVal('Technician') ? 'Field Partner' : '',
      techPhone: getVal('Contact'),
      status: getVal('Status') || 'RESOLVED',
      diagnosisNote: getVal('Findings') || getVal('Root Cause'),
      actionsTaken: getVal('Actions Taken') || getVal('Work Done'),
    };
  }
  return null;
}

// ─── Live Duration Timer ──────────────────────────────────────────────────────

function LiveTimer({ since }: { since: Date }) {
  const [ms, setMs] = useState(() => Date.now() - since.getTime());
  useEffect(() => {
    const t = setInterval(() => setMs(Date.now() - since.getTime()), 60000);
    return () => clearInterval(t);
  }, [since]);
  return <span className="font-mono font-medium">{formatDuration(ms)}</span>;
}

// ─── SLA Countdown Badge ──────────────────────────────────────────────────────

function SlaBadge({ slaDate, status }: { slaDate: Date | null; status: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  if (!slaDate || ['CLOSED', 'CANCELLED'].includes(status)) {
    return <span className="text-gray-400 text-xs">—</span>;
  }
  const remaining = slaDate.getTime() - now;
  const isBreached = remaining < 0;
  const isNear = !isBreached && remaining < 4 * 3600000; // < 4 hours

  if (isBreached) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
        <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
        Overdue by {formatDuration(-remaining)}
      </span>
    );
  }
  if (isNear) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
        {formatDuration(remaining)} remaining
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
      {formatDuration(remaining)} left
    </span>
  );
}

// ─── Attachment Preview Thumbnail ─────────────────────────────────────────────

function AttachmentThumb({ url, onOpen }: { url: string; onOpen: (u: string) => void }) {
  const full = mediaUrl(url);
  const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(url);
  const isPdf = /\.pdf$/i.test(url);
  const fileName = url.split('/').pop() || 'Attachment';

  return (
    <div
      onClick={() => onOpen(full)}
      className="group relative cursor-pointer flex items-center gap-2 p-1.5 pr-3 bg-white border border-gray-200 hover:border-[#1e3a5f] rounded-lg shadow-2xs transition-all hover:shadow-xs"
    >
      <div className="w-10 h-10 rounded-md bg-gray-100 flex items-center justify-center overflow-hidden shrink-0 border">
        {isVideo ? (
          <video src={full} className="w-full h-full object-cover" />
        ) : isPdf ? (
          <FileText className="w-5 h-5 text-red-500" />
        ) : (
          <img src={full} alt="attachment" className="w-full h-full object-cover" />
        )}
      </div>
      <div className="min-w-0 max-w-[120px]">
        <div className="text-xs font-medium text-gray-800 truncate" title={fileName}>{fileName}</div>
        <div className="text-[10px] text-gray-400 flex items-center gap-1">
          {isPdf ? 'PDF Document' : isVideo ? 'Video' : 'Image'} · <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100" />
        </div>
      </div>
    </div>
  );
}

// ─── Assign Modal ─────────────────────────────────────────────────────────────

function AssignModal({ issue, onClose, onAssign }: { issue: any; onClose: () => void; onAssign: (id: string) => void }) {
  const { data: usersResponse, isLoading } = useUsers({ limit: 100 });
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState(issue.assignedToId || '');

  const rawUsers: any[] = Array.isArray(usersResponse)
    ? usersResponse
    : usersResponse?.data || [];

  const parsedUsers = rawUsers.map((u: any) => {
    const roleType = u.primaryRole || u.roles?.[0]?.type || u.userRoles?.[0]?.role?.type || 'STAFF';
    return {
      ...u,
      derivedRole: roleType,
    };
  });

  const filteredUsers = parsedUsers.filter((u: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      u.name?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term) ||
      u.derivedRole?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        <div className="flex justify-between items-center mb-2.5 shrink-0">
          <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-[#1e3a5f]" /> Assign Ticket
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 rounded-md p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-gray-500 mb-3 shrink-0">
          Select the responsible technician, staff, or manager to handle this ticket.
        </p>

        {/* Search input */}
        <div className="mb-3 shrink-0">
          <input
            type="text"
            placeholder="Search by name, email, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] bg-gray-50/50"
          />
        </div>

        {/* Users list */}
        <div className="space-y-1.5 overflow-y-auto flex-1 mb-4 pr-1 min-h-[160px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-xs text-gray-500">
              <LoadingSpinner size="sm" />
              <span>Loading team members...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-xs text-gray-400">
              No team members found matching "{searchTerm}".
            </div>
          ) : (
            filteredUsers.map((u: any) => {
              const rBadge = getRoleBadge(u.derivedRole);
              const isSelected = selected === u.id;
              return (
                <label
                  key={u.id}
                  className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[#1e3a5f] bg-blue-50/70 ring-1 ring-[#1e3a5f]'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/80'
                  }`}
                >
                  <input
                    type="radio"
                    name="assignee"
                    value={u.id}
                    checked={isSelected}
                    onChange={() => setSelected(u.id)}
                    className="accent-[#1e3a5f]"
                  />
                  <div className={`w-8 h-8 rounded-full ${rBadge.avatarBg} text-white text-xs flex items-center justify-center font-bold shrink-0 shadow-2xs`}>
                    {getInitials(u.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-xs text-gray-900 truncate flex items-center gap-1.5">
                      <span>{u.name}</span>
                      {u.isOnLeave && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-medium">On Leave</span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-500 truncate">{u.email}</div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-medium border shrink-0 ${rBadge.bg}`}>
                    {rBadge.label}
                  </span>
                </label>
              );
            })
          )}
        </div>

        {/* Footer buttons */}
        <div className="flex gap-2.5 pt-2 border-t border-gray-100 shrink-0">
          <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="flex-1 bg-[#1e3a5f] hover:bg-[#172d4a] text-white text-xs font-semibold"
            onClick={() => {
              if (selected) onAssign(selected);
              onClose();
            }}
            disabled={!selected}
          >
            Confirm Assignment
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function IssueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: issue, isLoading, isError, error, refetch } = useIssue(id!);
  const { user } = useAuthStore();

  const addComment = useAddIssueComment();
  const updateStatus = useUpdateIssueStatus();
  const assignIssue = useAssignIssue();
  const generateToken = useGenerateServiceToken();

  // All React Hooks at top
  const [replyContent, setReplyContent] = useState('');
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const [activeTab, setActiveTab] = useState<'conversation' | 'activity'>('conversation');
  const [showAssign, setShowAssign] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ label: string; status: string; description: string } | null>(null);

  // Cost Recording Modal States
  const [costModalOpen, setCostModalOpen] = useState(false);
  const [targetStatusForCost, setTargetStatusForCost] = useState<'RESOLVED' | 'CLOSED'>('CLOSED');
  const [serviceCharge, setServiceCharge] = useState('');
  const [partsCost, setPartsCost] = useState('');
  const [travelCost, setTravelCost] = useState('');
  const [otherCost, setOtherCost] = useState('');
  const [partsNote, setPartsNote] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');

  const openCostModal = (status: 'RESOLVED' | 'CLOSED') => {
    setTargetStatusForCost(status);
    setServiceCharge('');
    setPartsCost('');
    setTravelCost('');
    setOtherCost('');
    setPartsNote('');
    setInvoiceNumber(`INV-${issue?.issueNo || 'TKT'}`);
    setCostModalOpen(true);
  };

  const handleConfirmStatusWithCost = (skipCost: boolean = false) => {
    const sc = parseFloat(serviceCharge) || 0;
    const pc = parseFloat(partsCost) || 0;
    const tc = parseFloat(travelCost) || 0;
    const oc = parseFloat(otherCost) || 0;
    const total = sc + pc + tc + oc;

    const costsPayload = !skipCost && total > 0 ? {
      serviceCharge: sc,
      partsCost: pc,
      travelCost: tc,
      otherCost: oc,
      invoiceNumber: invoiceNumber.trim() || undefined,
      partsUsed: partsNote.trim() ? [{ name: partsNote.trim(), quantity: 1, cost: pc }] : undefined,
    } : undefined;

    updateStatus.mutate(
      {
        id: issue.id,
        status: targetStatusForCost,
        note: total > 0 ? `Completed with maintenance cost ₹${total.toLocaleString('en-IN')}` : undefined,
        costs: costsPayload,
      },
      {
        onSuccess: () => {
          setCostModalOpen(false);
        },
        onError: (err: any) => {
          alert(err?.response?.data?.error || err?.message || 'Failed to update ticket status');
        },
      }
    );
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleOpenQRModal = () => {
    if (!issue?.serviceToken && issue?.id) {
      generateToken.mutate(issue.id, {
        onSuccess: () => setShowQRModal(true),
      });
    } else {
      setShowQRModal(true);
    }
  };

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (scrollRef.current && activeTab === 'conversation') {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [issue?.IssueComment?.length, issue?.statusHistory?.length, activeTab]);

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (isError || !issue) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-red-700 font-semibold">Failed to load ticket</p>
        <p className="text-red-500 text-xs">{(error as any)?.response?.data?.error || (error as any)?.message}</p>
        <Button onClick={() => refetch()} variant="outline" size="sm"><RefreshCw className="w-3.5 h-3.5 mr-2" /> Retry</Button>
      </div>
    );
  }

  const role = user?.primaryRole || 'STAFF';
  const isManagerOrAdmin = ['ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'].includes(role);

  // ── Unified Timeline Engine ─────────────────────────────────────────────────

  type TTimelineItem = {
    id: string;
    type: 'INITIAL' | 'COMMENT' | 'STATUS' | 'NOTE';
    timestamp: Date;
    user?: string;
    userId?: string;
    userRole?: string;
    content: string;
    attachments?: string[];
    isMe?: boolean;
  };

  const timeline: TTimelineItem[] = [];

  // 1. Initial Issue Post
  timeline.push({
    id: 'initial',
    type: 'INITIAL',
    timestamp: new Date(issue.createdAt),
    user: issue.raisedBy?.name || 'Requester',
    userId: issue.raisedById,
    userRole: issue.raisedBy?.primaryRole,
    content: issue.description,
    attachments: issue.photos || [],
    isMe: issue.raisedById === user?.sub,
  });

  // 2. Comments / Replies
  (issue.IssueComment || []).forEach((c: any) => {
    timeline.push({
      id: c.id,
      type: 'COMMENT',
      timestamp: new Date(c.createdAt),
      user: c.user?.name || 'User',
      userId: c.userId,
      userRole: c.user?.primaryRole,
      content: c.content,
      attachments: c.attachments || [],
      isMe: c.userId === user?.sub,
    });
  });

  // 3. Status History
  (issue.statusHistory || []).forEach((h: any, idx: number) => {
    const isInitial = h.toStatus === 'OPEN' && (!h.fromStatus || h.note === 'Issue raised');
    if (isInitial) return;
    if (h.note && !h.note.startsWith('Status changed')) {
      timeline.push({
        id: `note-${idx}`,
        type: 'NOTE',
        timestamp: new Date(h.changedAt),
        user: h.changedBy || 'System',
        content: h.note,
        attachments: [],
      });
    } else {
      timeline.push({
        id: `status-${idx}`,
        type: 'STATUS',
        timestamp: new Date(h.changedAt),
        content: `Status updated: ${h.fromStatus || 'Draft'} → ${h.toStatus}`,
        user: h.changedBy,
      });
    }
  });

  timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const activityLog = timeline.filter(t => t.type === 'STATUS' || t.type === 'NOTE');
  const allAttachments: string[] = [];
  (issue.photos || []).forEach((p: string) => allAttachments.push(p));
  (issue.IssueComment || []).forEach((c: any) => (c.attachments || []).forEach((a: string) => allAttachments.push(a)));

  // ── Calculated Context & Next Action ────────────────────────────────────────

  const slaDate = issue.slaResolutionDue ? new Date(issue.slaResolutionDue) : null;
  const isSlaBreached = slaDate ? slaDate.getTime() < Date.now() : false;

  let pendingWith = 'Unassigned';
  let nextAction = 'Assign ticket to a Technician or Branch Manager.';
  let nextActionType: 'warning' | 'info' | 'success' | 'danger' = 'warning';

  if (issue.status === 'OPEN' && !issue.assignedToId) {
    pendingWith = 'Branch Manager';
    nextAction = 'Pending assignment. Branch Manager must assign a technician to start resolution.';
    nextActionType = 'warning';
  } else if (issue.status === 'OPEN' && issue.assignedToId) {
    pendingWith = issue.assignedTo?.name || 'Technician';
    nextAction = `Assigned to ${pendingWith}. Waiting for technician to acknowledge and begin work.`;
    nextActionType = 'info';
  } else if (issue.status === 'IN_PROGRESS' || issue.status === 'ASSIGNED') {
    pendingWith = issue.assignedTo?.name || 'Technician';
    nextAction = `Work in progress by ${pendingWith}. Technician must resolve the asset issue and report findings.`;
    nextActionType = 'info';
  } else if (issue.status === 'ESCALATED') {
    pendingWith = 'Admin / Senior Management';
    nextAction = 'Ticket Escalated! Priority intervention required from Management.';
    nextActionType = 'danger';
  } else if (issue.status === 'RESOLVED') {
    pendingWith = issue.raisedBy?.name || 'Staff Reporter';
    nextAction = 'Work reported complete. Reporter must inspect and verify to close the ticket.';
    nextActionType = 'success';
  } else if (issue.status === 'CLOSED') {
    pendingWith = 'None';
    nextAction = 'Ticket closed and archived. All maintenance actions completed.';
    nextActionType = 'info';
  }

  // ── Form Handlers ───────────────────────────────────────────────────────────

  const handleSendReply = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!replyContent.trim() && replyFiles.length === 0) return;
    addComment.mutate(
      {
        id: issue.id,
        content: replyContent.trim(),
        attachments: replyFiles.length > 0 ? replyFiles : undefined,
      },
      {
        onSuccess: () => {
          setReplyContent('');
          setReplyFiles([]);
          if (textareaRef.current) textareaRef.current.style.height = 'auto';
        },
      }
    );
  };

  const triggerStatusConfirm = (status: string, label: string, description: string) => {
    setConfirmAction({ label, status, description });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] -m-4 md:-m-6 bg-slate-100 overflow-hidden font-sans">

      {/* ═════════════════════════════════════════════════════════════════════════
          1. COMPACT UNIFIED TOP HEADER
      ═════════════════════════════════════════════════════════════════════════ */}
      <div className="bg-white border-b border-gray-200 px-4 py-2.5 shrink-0 shadow-2xs z-10 flex flex-col gap-2">
        {/* Row 1: Title, Badges, Quick Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Link
              to="/issues"
              className="p-1 rounded-md text-gray-500 hover:text-[#1e3a5f] hover:bg-gray-100 transition-colors"
              title="Back to Tickets"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
            </Link>
            <span className="px-2.5 py-0.5 bg-[#1e3a5f]/10 text-[#1e3a5f] font-mono text-xs font-bold rounded-md border border-[#1e3a5f]/20 shrink-0">
              {issue.issueNo}
            </span>
            <h1 className="text-base md:text-lg font-bold text-gray-900 truncate max-w-sm md:max-w-md lg:max-w-xl" title={issue.title}>
              {issue.title}
            </h1>
            <StatusBadge status={issue.status} size="sm" />
            <StatusBadge status={issue.priority} size="sm" />
          </div>

          {/* Quick Actions Strip */}
          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            {/* Technician QR Portal Link (Only for active unresolved issues) */}
            {issue.status !== 'RESOLVED' && issue.status !== 'CLOSED' && issue.status !== 'CANCELLED' && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-medium bg-blue-50/80 hover:bg-blue-100/80 text-[#1e3a5f] border-blue-200 shadow-2xs"
                onClick={handleOpenQRModal}
                loading={generateToken.isPending}
              >
                <QrCode className="w-3.5 h-3.5 mr-1 text-[#1e3a5f]" />
                Technician QR
              </Button>
            )}

            {isManagerOrAdmin && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-medium bg-white hover:bg-gray-50 text-gray-700"
                onClick={() => setShowAssign(true)}
              >
                <UserPlus className="w-3.5 h-3.5 mr-1 text-[#1e3a5f]" />
                {issue.assignedTo ? 'Reassign' : 'Assign'}
              </Button>
            )}

            {isManagerOrAdmin && issue.status !== 'ESCALATED' && issue.status !== 'CLOSED' && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-medium text-amber-700 border-amber-200 hover:bg-amber-50"
                onClick={() => triggerStatusConfirm('ESCALATED', 'Escalate Ticket', 'Are you sure you want to mark this ticket as ESCALATED? It will notify high-level admins.')}
              >
                <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
                Escalate
              </Button>
            )}

            {issue.status !== 'RESOLVED' && issue.status !== 'CLOSED' && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-medium text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                onClick={() => openCostModal('RESOLVED')}
              >
                <Check className="w-3.5 h-3.5 mr-1" />
                Resolve
              </Button>
            )}

            {issue.status !== 'CLOSED' ? (
              <Button
                size="sm"
                className="h-8 text-xs font-medium bg-[#1e3a5f] hover:bg-[#172d4a] text-white"
                onClick={() => openCostModal('CLOSED')}
              >
                <XCircle className="w-3.5 h-3.5 mr-1" />
                Close Ticket
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-medium text-blue-700 border-blue-200 hover:bg-blue-50"
                onClick={() => triggerStatusConfirm('OPEN', 'Reopen Ticket', 'Reopening will move the status back to OPEN and allow further replies.')}
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                Reopen Ticket
              </Button>
            )}
          </div>
        </div>

        {/* Row 2: Comprehensive 1-line Meta Strip (Answers Who, Where, When, SLA at a glance) */}
        <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-gray-600 bg-gray-50/80 px-2.5 py-1.5 rounded-lg border border-gray-200/70">
          <div className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="text-gray-400">Branch:</span>
            <span className="font-semibold text-gray-800">{issue.branch?.name || '—'}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Box className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="text-gray-400">Asset:</span>
            <span className="font-semibold text-gray-800 truncate max-w-[120px]">{issue.asset?.name || 'other'}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="text-gray-400">Raised By:</span>
            <span className="font-semibold text-gray-800">{issue.raisedBy?.name || '—'}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-[#1e3a5f] shrink-0" />
            <span className="text-gray-400">Assigned To:</span>
            <span className={`font-semibold ${issue.assignedTo ? 'text-gray-900' : 'text-amber-600 italic'}`}>
              {issue.assignedTo?.name || 'Unassigned'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="text-gray-400">Open For:</span>
            <LiveTimer since={new Date(issue.createdAt)} />
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <Timer className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="text-gray-400">SLA:</span>
            <SlaBadge slaDate={slaDate} status={issue.status} />
          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════════
          2. TWO-COLUMN SPLIT WORKSPACE (Fits in single viewport, No Body Scroll)
      ═════════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row gap-3 p-3 min-h-0">

        {/* ── LEFT PANE (68% - 70%): Chat Timeline + Fixed Composer ──────────── */}
        <div className="flex-1 flex flex-col min-w-0 bg-white rounded-xl shadow-2xs border border-gray-200 overflow-hidden h-full">

          {/* Timeline Tab Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-3 shrink-0 bg-white">
            <div className="flex items-center gap-1">
              <button
                className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === 'conversation'
                    ? 'border-[#1e3a5f] text-[#1e3a5f]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('conversation')}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Conversation
                <span className="ml-1 bg-gray-100 text-gray-600 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                  {(issue.IssueComment || []).length + 1}
                </span>
              </button>

              <button
                className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === 'activity'
                    ? 'border-[#1e3a5f] text-[#1e3a5f]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('activity')}
              >
                <Activity className="w-3.5 h-3.5" />
                Activity & Audit
                <span className="ml-1 bg-gray-100 text-gray-600 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                  {activityLog.length}
                </span>
              </button>
            </div>

            <button
              onClick={() => refetch()}
              className="text-gray-400 hover:text-gray-600 p-1.5 rounded-md hover:bg-gray-100 transition-colors"
              title="Refresh conversation"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Scrollable Conversation Stream */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-3.5 md:p-4 bg-[#f0f2f5] space-y-3.5 min-h-0"
          >
            {activeTab === 'conversation' ? (
              <>
                {timeline.map((item, idx) => {
                  // System Status Event Capsule
                  if (item.type === 'STATUS') {
                    return (
                      <div key={item.id} className="flex justify-center my-1.5">
                        <div className="inline-flex items-center gap-1.5 bg-white/95 border border-gray-200/80 text-gray-600 text-[11px] px-3 py-1 rounded-full shadow-2xs">
                          <Activity className="w-3 h-3 text-[#1e3a5f]" />
                          <span>{item.content}</span>
                          <span className="text-gray-400">· {formatDateTime(item.timestamp)}</span>
                        </div>
                      </div>
                    );
                  }

                  // Internal System Note Capsule
                  if (item.type === 'NOTE') {
                    return (
                      <div key={item.id} className="flex justify-center my-1.5">
                        <div className="bg-amber-50 border border-amber-200/80 text-amber-900 text-xs px-3.5 py-2 rounded-xl max-w-lg shadow-2xs flex items-start gap-2">
                          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <div className="font-semibold text-[11px] text-amber-800">System Note ({item.user})</div>
                            <div className="text-xs mt-0.5 leading-relaxed">{item.content}</div>
                            <div className="text-[10px] text-amber-600/80 mt-1">{formatDateTime(item.timestamp)}</div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Check for Technician Field Report
                  const techReport = parseTechReport(item.content);
                  if (techReport) {
                    return (
                      <div key={item.id} className="flex gap-2.5 max-w-[92%] mr-auto my-2">
                        {/* Technician Avatar */}
                        <div
                          className="w-8 h-8 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold shrink-0 shadow-2xs mt-0.5"
                          title="Field Technician"
                        >
                          <Wrench className="w-4 h-4" />
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Header Line */}
                          <div className="flex items-center gap-1.5 mb-1 justify-start">
                            <span className="text-xs font-bold text-gray-900">{techReport.techName || 'Field Technician'}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {techReport.company || 'Service Partner'}
                            </span>
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded font-bold">
                              Verified Field Report
                            </span>
                            <span className="text-[10px] text-gray-400 ml-auto">
                              {formatDateTime(item.timestamp)}
                            </span>
                          </div>

                          {/* Field Report Card Body */}
                          <div className="bg-white rounded-2xl p-3.5 shadow-2xs border-2 border-indigo-200/90 rounded-tl-xs space-y-2.5 text-xs text-gray-800">
                            {/* Technician Identity Strip */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-gray-100 bg-slate-50/70 -mx-3.5 -mt-3.5 p-3 rounded-t-xl">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 text-xs">{techReport.techName}</span>
                                {techReport.techPhone && (
                                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                                    <Phone className="w-3 h-3 text-slate-400" /> {techReport.techPhone}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                                Status: {techReport.status || 'RESOLVED'}
                              </span>
                            </div>

                            {/* GPS Location Pill */}
                            {techReport.location && (
                              <div className="bg-emerald-50/80 p-2 rounded-xl border border-emerald-200/70 flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1.5 text-emerald-950">
                                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span className="font-mono text-[11px]">
                                    GPS: {techReport.location.lat}, {techReport.location.lng} {techReport.location.accuracy ? `(±${techReport.location.accuracy}m)` : ''}
                                  </span>
                                </div>
                                {techReport.location.mapsUrl && (
                                  <a
                                    href={techReport.location.mapsUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[11px] text-blue-700 font-bold hover:underline flex items-center gap-0.5 shrink-0"
                                  >
                                    View Map <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            )}

                            {/* What He Did / Actions Taken */}
                            {techReport.actionsTaken && (
                              <div className="bg-blue-50/70 p-2.5 rounded-xl border border-blue-200/60">
                                <strong className="text-[#1e3a5f] block text-[11px] uppercase font-bold mb-1 flex items-center gap-1">
                                  <Sparkles className="w-3 h-3 text-blue-600" /> What Was Done (Actions Taken):
                                </strong>
                                <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">{techReport.actionsTaken}</p>
                              </div>
                            )}

                            {/* Findings & Root Cause */}
                            {techReport.diagnosisNote && (
                              <div className="bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/60">
                                <strong className="text-amber-900 block text-[11px] uppercase font-bold mb-1">
                                  Findings & Root Cause:
                                </strong>
                                <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">{techReport.diagnosisNote}</p>
                              </div>
                            )}

                            {/* Verification Checklist */}
                            {techReport.checklist && techReport.checklist.length > 0 && (
                              <div className="p-2.5 rounded-xl border border-gray-100 bg-gray-50/60 space-y-1.5">
                                <strong className="text-gray-700 block text-[11px] uppercase font-bold">
                                  Inspection Checklist:
                                </strong>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                  {techReport.checklist.map((c: any, ci: number) => (
                                    <div key={ci} className="flex items-center gap-1.5 text-[11px] bg-white p-1 rounded-md border border-gray-200/50">
                                      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 ${c.status === 'PASS' ? 'bg-emerald-600' : 'bg-red-600'}`}>
                                        {c.status === 'PASS' ? '✓' : '✕'}
                                      </span>
                                      <span className="truncate text-gray-700">{c.label}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Parts Replaced */}
                            {techReport.partsUsed && techReport.partsUsed.length > 0 && (
                              <div className="p-2.5 rounded-xl border border-gray-100 bg-gray-50/60">
                                <strong className="text-gray-700 block text-[11px] uppercase font-bold mb-1">
                                  Parts Replaced:
                                </strong>
                                <div className="flex flex-wrap gap-1.5">
                                  {techReport.partsUsed.map((p: any, pi: number) => (
                                    <span key={pi} className="px-2 py-0.5 bg-white border border-gray-200 rounded text-[11px] font-semibold text-gray-800">
                                      {p.name} (Qty: {p.quantity})
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Photo Attachments */}
                            {item.attachments && item.attachments.length > 0 && (
                              <div className="pt-2 border-t border-gray-100">
                                <strong className="text-gray-700 block text-[11px] uppercase font-bold mb-1.5">
                                  Work Photos & Evidence:
                                </strong>
                                <div className="flex flex-wrap gap-2">
                                  {item.attachments.map((att, j) => (
                                    <AttachmentThumb key={j} url={att} onOpen={(u) => setLightboxUrl(u)} />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Chat Message / Opening Description
                  const rBadge = getRoleBadge(item.userRole);
                  const isOpeningTicket = item.type === 'INITIAL';

                  return (
                    <div
                      key={item.id}
                      className={`flex gap-2.5 max-w-[88%] ${item.isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                    >
                      {/* User Avatar */}
                      <div
                        className={`w-8 h-8 rounded-full ${rBadge.avatarBg} text-white text-xs flex items-center justify-center font-bold shrink-0 shadow-2xs mt-0.5`}
                        title={`${item.user} (${rBadge.label})`}
                      >
                        {getInitials(item.user || '?')}
                      </div>

                      {/* Bubble */}
                      <div className="flex-1 min-w-0">
                        <div className={`flex items-center gap-1.5 mb-1 ${item.isMe ? 'justify-end' : 'justify-start'}`}>
                          <span className="text-xs font-bold text-gray-800">{item.isMe ? 'You' : item.user}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium border ${rBadge.bg}`}>
                            {rBadge.label}
                          </span>
                          {isOpeningTicket && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                              Original Issue
                            </span>
                          )}
                          <span className="text-[10px] text-gray-400">
                            {formatDateTime(item.timestamp)}
                          </span>
                        </div>

                        <div
                          className={`p-3.5 rounded-2xl shadow-2xs text-xs md:text-sm leading-relaxed break-words ${
                            item.isMe
                              ? 'bg-[#dcf8c6] text-gray-900 rounded-tr-xs border border-[#cbebb2]'
                              : isOpeningTicket
                              ? 'bg-white text-gray-900 rounded-tl-xs border-2 border-blue-200 shadow-xs'
                              : 'bg-white text-gray-900 rounded-tl-xs border border-gray-200'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{item.content}</p>

                          {/* Inline Attachments */}
                          {item.attachments && item.attachments.length > 0 && (
                            <div className="mt-2.5 pt-2 border-t border-gray-200/60 flex flex-wrap gap-2">
                              {item.attachments.map((att, j) => (
                                <AttachmentThumb key={j} url={att} onOpen={(u) => setLightboxUrl(u)} />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              /* Activity Tab Content */
              <div className="space-y-2 py-2">
                {activityLog.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-xs">No activity entries recorded yet.</div>
                ) : (
                  activityLog.map((log) => (
                    <div key={log.id} className="bg-white border border-gray-200 p-3 rounded-lg text-xs shadow-2xs flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-blue-50 text-[#1e3a5f] flex items-center justify-center shrink-0 mt-0.5">
                        <Activity className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-800">{log.content}</div>
                        <div className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1.5">
                          <span>Updated by {log.user || 'System'}</span>
                          <span>·</span>
                          <span>{formatDateTime(log.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Fixed Reply Composer at Bottom (WhatsApp / Helpdesk Style) */}
          <div className="bg-white border-t border-gray-200 p-2.5 shrink-0">
            {issue.status === 'CLOSED' ? (
              <div className="text-center py-2.5 text-xs text-gray-500 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center gap-1.5">
                <XCircle className="w-4 h-4 text-gray-400" />
                This ticket is closed. Click "Reopen Ticket" in the top bar to continue the conversation.
              </div>
            ) : (
              <form onSubmit={handleSendReply} className="flex flex-col gap-1.5">
                {/* Selected attachment previews before sending */}
                {replyFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 px-1 pb-1">
                    {replyFiles.map((file, i) => {
                      const isImage = file.type.startsWith('image/');
                      const isVideo = file.type.startsWith('video/');
                      const previewUrl = URL.createObjectURL(file);
                      return (
                        <div
                          key={i}
                          className="relative group w-12 h-12 border-2 border-[#1e3a5f] rounded-lg overflow-hidden bg-gray-100 shadow-2xs"
                        >
                          <button
                            type="button"
                            onClick={() => setReplyFiles(prev => prev.filter((_, idx) => idx !== i))}
                            className="absolute top-0.5 right-0.5 bg-black/70 text-white rounded-full p-0.5 opacity-90 hover:opacity-100 z-10"
                            title="Remove file"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                          {isImage ? (
                            <img src={previewUrl} alt="preview" className="w-full h-full object-cover" />
                          ) : isVideo ? (
                            <video src={previewUrl} className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <FileText className="w-4 h-4 text-gray-500" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Input row */}
                <div className="flex items-end gap-2 bg-gray-50 rounded-xl p-1.5 border border-gray-300 focus-within:border-[#1e3a5f] focus-within:bg-white focus-within:ring-1 focus-within:ring-[#1e3a5f] transition-all">
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files) {
                        setReplyFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                      }
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-gray-500 hover:text-[#1e3a5f] hover:bg-gray-200/60 rounded-lg transition-colors shrink-0"
                    title="Attach image, video or document (Max 20MB)"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={replyContent}
                    onChange={(e) => {
                      setReplyContent(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply();
                      }
                    }}
                    placeholder="Type your reply here... (Press Enter to send, Shift+Enter for newline)"
                    className="flex-1 bg-transparent border-none outline-none text-xs md:text-sm py-1.5 px-1 resize-none placeholder-gray-400 max-h-24 leading-relaxed"
                  />

                  <Button
                    type="submit"
                    loading={addComment.isPending}
                    disabled={!replyContent.trim() && replyFiles.length === 0}
                    className="rounded-lg px-4 h-8 bg-[#1e3a5f] hover:bg-[#172d4a] text-white shrink-0 text-xs font-semibold shadow-2xs"
                  >
                    <Send className="w-3.5 h-3.5 mr-1" />
                    Send
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* ── RIGHT PANE (30% - 32%): Ticket Intelligence Panel ─────────────── */}
        <div className="w-full lg:w-80 xl:w-96 shrink-0 flex flex-col gap-2.5 overflow-y-auto h-full pr-0.5">

          {/* 0. Manager Verification & Approval Banner (When Resolved or Technician Info present) */}
          {(issue.status === 'RESOLVED' || issue.technicianInfo) && issue.status !== 'CLOSED' && (
            <div className="bg-emerald-50 border border-emerald-300 p-3 rounded-xl shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-emerald-950 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  Work Completed (Pending Verification)
                </span>
              </div>
              {issue.technicianInfo && (
                <div className="text-xs text-emerald-900 bg-white/80 p-2.5 rounded-lg border border-emerald-200 space-y-1">
                  <div>Reported By: <strong>{issue.technicianInfo.name}</strong> ({issue.technicianInfo.company || 'External'})</div>
                  {issue.technicianInfo.phone && <div className="text-slate-600">Contact: {issue.technicianInfo.phone}</div>}
                  {issue.technicianInfo.actionsTaken && (
                    <div className="text-slate-800">
                      <strong>Work Done:</strong> {issue.technicianInfo.actionsTaken}
                    </div>
                  )}
                  {issue.technicianInfo.location && (
                    <div className="text-blue-700 flex items-center gap-1 font-mono text-[11px] pt-0.5">
                      <MapPin className="w-3 h-3 text-emerald-600" />
                      GPS: {issue.technicianInfo.location.lat}, {issue.technicianInfo.location.lng}
                    </div>
                  )}
                </div>
              )}
              {isManagerOrAdmin && (
                <div className="flex gap-1.5 pt-1">
                  <Button
                    size="sm"
                    onClick={() => triggerStatusConfirm('CLOSED', 'Verify & Close Ticket', 'Confirm you have verified that the issue is completely resolved and the asset is operational.')}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-7"
                  >
                    <Check className="w-3.5 h-3.5 mr-1" /> Approve & Close
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => triggerStatusConfirm('IN_PROGRESS', 'Request Re-work', 'Move ticket back to IN_PROGRESS so the technician can address incomplete items.')}
                    className="text-xs border-emerald-300 text-emerald-900 hover:bg-emerald-100 h-7"
                  >
                    Re-work
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* 1. Next Action Banner (High Visibility Context at Top) */}
          <div className="bg-white rounded-xl shadow-2xs border border-gray-200 p-3">
            <div className="flex items-center gap-1.5 font-bold text-xs text-gray-900 mb-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>Immediate Next Action</span>
            </div>
            <div
              className={`text-xs p-2.5 rounded-lg border font-medium leading-relaxed ${
                nextActionType === 'warning'
                  ? 'bg-amber-50 text-amber-900 border-amber-200'
                  : nextActionType === 'danger'
                  ? 'bg-red-50 text-red-900 border-red-200'
                  : nextActionType === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : 'bg-blue-50 text-blue-900 border-blue-200'
              }`}
            >
              {nextAction}
            </div>
          </div>

          {/* Technician QR Portal Card (Only for active unresolved issues) */}
          {issue.status !== 'RESOLVED' && issue.status !== 'CLOSED' && issue.status !== 'CANCELLED' && (
            <div className="bg-gradient-to-br from-blue-50/70 to-indigo-50/70 rounded-xl shadow-2xs border border-blue-200/80 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#1e3a5f] flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-[#1e3a5f]" />
                  Technician QR Access
                </span>
                <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-mono font-semibold">
                  No Login Required
                </span>
              </div>
              <p className="text-[11px] text-gray-600 leading-relaxed">
                Share QR code or service link with external technicians to log work status, checklists, and photos.
              </p>
              <Button
                size="sm"
                onClick={handleOpenQRModal}
                loading={generateToken.isPending}
                className="w-full h-7 bg-[#1e3a5f] hover:bg-[#172d4a] text-white text-xs font-semibold"
              >
                <QrCode className="w-3 h-3 mr-1.5" /> View QR / Share Portal Link
              </Button>
            </div>
          )}

          {/* 2. Key Attributes & SLA Grid */}
          <div className="bg-white rounded-xl shadow-2xs border border-gray-200 p-3">
            <h3 className="font-bold text-xs text-gray-900 mb-2.5 pb-1.5 border-b border-gray-100 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-[#1e3a5f]" /> Ticket Attributes
              </span>
              <span className="font-mono text-[10px] text-gray-400">ID: {issue.id.slice(0, 8)}</span>
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Status</span>
                <StatusBadge status={issue.status} size="sm" />
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-500">Priority</span>
                <StatusBadge status={issue.priority} size="sm" />
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-500">Issue Type</span>
                <span className="font-semibold text-gray-800 capitalize">{issue.issueType?.toLowerCase() || 'General'}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-500">Branch</span>
                <span className="font-medium text-gray-800 truncate max-w-[140px]">{issue.branch?.name || '—'}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-500">Asset</span>
                <span className="font-semibold text-[#1e3a5f] truncate max-w-[140px]">{issue.asset?.name || 'other'}</span>
              </div>

              <hr className="border-gray-100 my-1" />

              <div className="flex justify-between items-center">
                <span className="text-gray-500">SLA Due</span>
                <span className={`font-semibold ${isSlaBreached ? 'text-red-600' : 'text-gray-800'}`}>
                  {formatDateTime(issue.slaResolutionDue)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-500">Open Duration</span>
                <LiveTimer since={new Date(issue.createdAt)} />
              </div>

              {issue.resolvedAt && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Resolved In</span>
                  <span className="font-semibold text-emerald-600">
                    {formatDuration(new Date(issue.resolvedAt).getTime() - new Date(issue.createdAt).getTime())}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 3. People & Assignment Card */}
          <div className="bg-white rounded-xl shadow-2xs border border-gray-200 p-3">
            <h3 className="font-bold text-xs text-gray-900 mb-2 pb-1.5 border-b border-gray-100 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#1e3a5f]" /> People Involved
              </span>
              {isManagerOrAdmin && (
                <button
                  onClick={() => setShowAssign(true)}
                  className="text-[11px] text-[#1e3a5f] font-semibold hover:underline flex items-center gap-0.5"
                >
                  <UserPlus className="w-3 h-3" /> Change
                </button>
              )}
            </h3>

            <div className="space-y-2.5 text-xs">
              {/* Assigned Technician */}
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Assigned To:</span>
                <div className="flex items-center gap-1.5 font-semibold text-gray-900">
                  <div className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">
                    {getInitials(issue.assignedTo?.name || '?')}
                  </div>
                  <span>{issue.assignedTo?.name || <span className="text-amber-600 font-normal">Unassigned</span>}</span>
                </div>
              </div>

              {/* Pending With */}
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Pending With:</span>
                <span className="font-semibold text-[#1e3a5f]">{pendingWith}</span>
              </div>

              {/* Reporter */}
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Reported By:</span>
                <div className="flex items-center gap-1.5 font-medium text-gray-800">
                  <div className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] flex items-center justify-center font-bold">
                    {getInitials(issue.raisedBy?.name || '?')}
                  </div>
                  <span>{issue.raisedBy?.name || '—'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. All Attachments Gallery */}
          <div className="bg-white rounded-xl shadow-2xs border border-gray-200 p-3">
            <h3 className="font-bold text-xs text-gray-900 mb-2 pb-1.5 border-b border-gray-100 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-[#1e3a5f]" /> Attachments
              </span>
              <span className="text-gray-400 font-mono text-[10px]">({allAttachments.length})</span>
            </h3>

            {allAttachments.length === 0 ? (
              <div className="text-center py-3 text-gray-400 text-xs">No attachments uploaded</div>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {allAttachments.slice(0, 6).map((att, idx) => (
                  <div
                    key={idx}
                    onClick={() => setLightboxUrl(mediaUrl(att))}
                    className="aspect-square rounded-md overflow-hidden border border-gray-200 bg-gray-50 hover:opacity-85 cursor-pointer relative group"
                  >
                    {/\.(mp4|webm|ogg|mov)$/i.test(att) ? (
                      <video src={mediaUrl(att)} className="w-full h-full object-cover" />
                    ) : /\.pdf$/i.test(att) ? (
                      <div className="flex flex-col items-center justify-center h-full gap-0.5 text-red-500">
                        <FileText className="w-5 h-5" />
                        <span className="text-[9px] font-bold">PDF</span>
                      </div>
                    ) : (
                      <img src={mediaUrl(att)} alt="att" className="w-full h-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <Maximize2 className="w-3.5 h-3.5 text-white opacity-0 group-hover:opacity-100" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 5. Classification Tags */}
          <div className="bg-white rounded-xl shadow-2xs border border-gray-200 p-3">
            <h3 className="font-bold text-xs text-gray-900 mb-2 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-[#1e3a5f]" /> Classification Tags
            </h3>
            <div className="flex flex-wrap gap-1.5">
              <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded text-[11px] font-medium capitalize">
                {issue.issueType?.toLowerCase() || 'general'}
              </span>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[11px] font-medium capitalize">
                {issue.priority?.toLowerCase()} priority
              </span>
              {issue.asset?.category?.name && (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-700 border border-gray-200 rounded text-[11px] font-medium">
                  {issue.asset.category.name}
                </span>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════════
          3. MODALS (ASSIGNMENT, STATUS CONFIRMATION, LIGHTBOX)
      ═════════════════════════════════════════════════════════════════════════ */}

      {/* Assign Modal */}
      {showAssign && (
        <AssignModal
          issue={issue}
          onClose={() => setShowAssign(false)}
          onAssign={(assigneeId) => assignIssue.mutate({ id: issue.id, assigneeId })}
        />
      )}

      {/* Technician QR Portal Modal */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 animate-in zoom-in-95 duration-150 text-center space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <div className="flex items-center gap-1.5 font-bold text-sm text-[#1e3a5f]">
                <QrCode className="w-4 h-4" />
                <span>Technician Service QR</span>
              </div>
              <button onClick={() => setShowQRModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Scan with any smartphone camera to open the secure Technician Update Portal. No AMS account required.
            </p>

            {/* QR Code Graphic */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 inline-block mx-auto shadow-inner">
              {issue.serviceToken ? (
                <QRCodeSVG
                  value={`${window.location.origin}/portal/service/${issue.serviceToken}`}
                  size={180}
                  level="H"
                  includeMargin={false}
                />
              ) : (
                <div className="w-44 h-44 flex items-center justify-center">
                  <LoadingSpinner size="md" />
                </div>
              )}
            </div>

            <div className="text-xs font-mono font-bold text-gray-800">
              {issue.issueNo} · {issue.asset?.name || 'Asset'}
            </div>

            {/* Copy Link & Open Link */}
            <div className="space-y-2 pt-1">
              <Button
                size="sm"
                className="w-full bg-[#1e3a5f] hover:bg-[#172d4a] text-white text-xs font-semibold h-9"
                onClick={() => {
                  if (issue.serviceToken) {
                    navigator.clipboard.writeText(`${window.location.origin}/portal/service/${issue.serviceToken}`);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }
                }}
              >
                {copiedLink ? (
                  <>
                    <CheckCheck className="w-3.5 h-3.5 mr-1.5 text-emerald-400" /> Link Copied to Clipboard!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy Service Access Link
                  </>
                )}
              </Button>

              <a
                href={`/portal/service/${issue.serviceToken}`}
                target="_blank"
                rel="noreferrer"
                className="block text-center text-xs font-semibold text-blue-700 hover:underline flex items-center justify-center gap-1 py-1"
              >
                Open Portal in New Tab <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-5 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-base text-gray-900 mb-1.5">{confirmAction.label}</h3>
            <p className="text-xs text-gray-600 leading-relaxed mb-4">{confirmAction.description}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setConfirmAction(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-[#1e3a5f] hover:bg-[#172d4a] text-white"
                loading={updateStatus.isPending}
                onClick={() => {
                  updateStatus.mutate(
                    { id: issue.id, status: confirmAction.status },
                    {
                      onError: (err: any) => {
                        alert(err?.response?.data?.error || err?.message || 'Failed to update ticket status');
                      },
                    }
                  );
                  setConfirmAction(null);
                }}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Maintenance Cost & Completion Modal ── */}
      {costModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-base text-gray-900 flex items-center gap-1.5">
                  <IndianRupee className="w-4 h-4 text-[#1e3a5f]" /> Record Maintenance Cost & {targetStatusForCost === 'RESOLVED' ? 'Resolve' : 'Close'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Costs automatically update the asset ledger, financial ROI, and health score.
                </p>
              </div>
              <button onClick={() => setCostModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-gray-700 block mb-1">Service / Labor (₹)</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={serviceCharge}
                  onChange={(e) => setServiceCharge(e.target.value)}
                  className="text-xs h-8"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-700 block mb-1">Spare Parts Cost (₹)</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={partsCost}
                  onChange={(e) => setPartsCost(e.target.value)}
                  className="text-xs h-8"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-700 block mb-1">Travel / Conveyance (₹)</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={travelCost}
                  onChange={(e) => setTravelCost(e.target.value)}
                  className="text-xs h-8"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-700 block mb-1">Other / Incidental (₹)</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={otherCost}
                  onChange={(e) => setOtherCost(e.target.value)}
                  className="text-xs h-8"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-gray-700 block mb-1">Spare Parts Description (Optional)</label>
              <Input
                placeholder="e.g. Power Supply Unit, Ethernet Cable (x2)"
                value={partsNote}
                onChange={(e) => setPartsNote(e.target.value)}
                className="text-xs h-8"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-gray-700 block mb-1">Invoice / Reference #</label>
              <Input
                placeholder="e.g. INV-2026-001"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="text-xs h-8"
              />
            </div>

            {/* Real-time Total Cost Calculation */}
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg flex justify-between items-center text-xs">
              <span className="font-bold text-gray-700">Total Ticket Maintenance Cost:</span>
              <span className="font-mono font-bold text-base text-[#1e3a5f]">
                ₹{((parseFloat(serviceCharge) || 0) + (parseFloat(partsCost) || 0) + (parseFloat(travelCost) || 0) + (parseFloat(otherCost) || 0)).toLocaleString('en-IN')}
              </span>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-gray-500 hover:text-gray-700"
                onClick={() => handleConfirmStatusWithCost(true)}
                loading={updateStatus.isPending}
              >
                Skip Cost & {targetStatusForCost === 'RESOLVED' ? 'Resolve' : 'Close'}
              </Button>
              <div className="flex-1" />
              <Button variant="outline" size="sm" className="text-xs" onClick={() => setCostModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-[#1e3a5f] hover:bg-[#172d4a] text-white text-xs font-semibold"
                loading={updateStatus.isPending}
                onClick={() => handleConfirmStatusWithCost(false)}
              >
                Record & {targetStatusForCost === 'RESOLVED' ? 'Resolve' : 'Close'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Media Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-4 right-4 text-white bg-white/20 hover:bg-white/30 rounded-full p-2 backdrop-blur-xs z-10 transition-colors"
            onClick={() => setLightboxUrl(null)}
          >
            <X className="w-5 h-5" />
          </button>
          {/\.(mp4|webm|ogg|mov)$/i.test(lightboxUrl) ? (
            <video
              src={lightboxUrl}
              controls
              autoPlay
              className="max-w-full max-h-[88vh] rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img
              src={lightboxUrl}
              alt="Preview"
              className="max-w-full max-h-[88vh] rounded-lg object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}

    </div>
  );
}
