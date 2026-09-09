import React, { useState } from 'react';
import { MessageCircle, Copy, Share2, X, CheckCheck, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ShareIssueProps {
  issue: any;
  allIssues?: any[];
}

function getPriorityIcon(priority: string) {
  switch (priority) {
    case 'CRITICAL': return '🔴';
    case 'HIGH': return '🟠';
    case 'MEDIUM': return '🟡';
    case 'LOW': return '🟢';
    default: return '⚪';
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'OPEN': return 'Open';
    case 'ASSIGNED': return 'Assigned';
    case 'IN_PROGRESS': return 'In Progress';
    case 'NEED_INFO': return 'Need Info';
    case 'TESTING': return 'Testing';
    case 'COMPLETED_BY_DEV': return 'Fixed by Dev';
    case 'VERIFIED_BY_SVV': return 'Verified';
    case 'CLOSED': return 'Closed';
    default: return status;
  }
}

function getAgeDays(createdAt: string) {
  const diff = new Date().getTime() - new Date(createdAt).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function buildWhatsAppMessage(issue: any, stats?: { total: number; open: number; inProgress: number; overdue: number; completed: number }) {
  // Use dev portal link if team has publicToken, else admin portal
  const portalToken = issue.assignedTeam?.publicToken;
  const ticketUrl = portalToken
    ? `${window.location.origin}/dev-portal/${portalToken}/issues/${issue.id}`
    : `${window.location.origin}/settings/dev-hub/issues/${issue.id}`;

  const age = getAgeDays(issue.createdAt);
  const priorityIcon = getPriorityIcon(issue.priority);
  const statusLabel = getStatusLabel(issue.status);
  const createdDate = new Date(issue.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const createdTime = new Date(issue.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const lines = [
    `🏢 *SVV Pay – Developer Issue Hub*`,
    `Track • Collaborate • Resolve`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━`,
    `*${issue.ticketCode} | ${issue.title || 'Untitled Issue'}*`,
    `━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `📁 *Category:* ${issue.category?.name || 'General'}`,
    `${priorityIcon} *Priority:* ${issue.priority || 'MEDIUM'}`,
    `📌 *Status:* ${statusLabel}`,
    ``,
  ];

  if (issue.description && issue.description !== 'No description provided') {
    lines.push(`📝 *Issue:*`);
    lines.push(issue.description.substring(0, 200) + (issue.description.length > 200 ? '...' : ''));
    lines.push('');
  }

  if (issue.currentResult) lines.push(`⚠️ *Current:* ${issue.currentResult}`);
  if (issue.expectedResult) lines.push(`✅ *Expected:* ${issue.expectedResult}`);
  if (issue.currentResult || issue.expectedResult) lines.push('');

  lines.push(`👤 *Assigned:* ${issue.assignedTeam?.name || 'SVV Dev Team'}`);
  lines.push(`📅 *Created:* ${createdDate}, ${createdTime}`);
  lines.push(`⏱️ *Age:* ${age} Day${age !== 1 ? 's' : ''}`);
  lines.push('');

  if (stats) {
    lines.push(`📊 *Project Summary (SVV Pay)*`);
    lines.push(`Total: ${stats.total}  |  Open: ${stats.open}  |  In Progress: ${stats.inProgress}  |  Overdue: ${stats.overdue}  |  Completed: ${stats.completed}`);
    lines.push('');
  }

  lines.push(`🔗 *View Full Ticket:*`);
  lines.push(ticketUrl);
  lines.push('');
  lines.push(`_Please check and update. 🙏_`);

  return lines.join('\n');
}

export default function ShareIssueButton({ issue, allIssues }: ShareIssueProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const stats = allIssues ? {
    total: allIssues.length,
    open: allIssues.filter((i: any) => i.status === 'OPEN' || i.status === 'ASSIGNED').length,
    inProgress: allIssues.filter((i: any) => i.status === 'IN_PROGRESS').length,
    overdue: allIssues.filter((i: any) => i.dueDate && new Date(i.dueDate) < new Date() && i.status !== 'CLOSED').length,
    completed: allIssues.filter((i: any) => i.status === 'CLOSED' || i.status === 'COMPLETED_BY_DEV').length,
  } : undefined;

  const message = buildWhatsAppMessage(issue, stats);
  const portalToken = issue.assignedTeam?.publicToken;
  const ticketUrl = portalToken
    ? `${window.location.origin}/dev-portal/${portalToken}/issues/${issue.id}`
    : `${window.location.origin}/settings/dev-hub/issues/${issue.id}`;

  const handleWhatsApp = () => {
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
    setOpen(false);
  };

  const handleViewFullTicket = () => {
    setOpen(false);
    // Navigate to admin portal details (admin context)
    navigate(`/settings/dev-hub/issues/${issue.id}`);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(ticketUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-green-600 transition-colors px-2 py-1 rounded hover:bg-green-50"
        title="Share via WhatsApp"
      >
        <Share2 className="w-3.5 h-3.5" />
        <span>Share</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setOpen(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#081B3A] to-[#0D6EFD] text-white px-5 py-4 flex items-center justify-between">
              <div>
                <div className="font-bold text-lg">Share Ticket</div>
                <div className="text-xs opacity-80">{issue.ticketCode} — {(issue.title || '').substring(0, 30)}{(issue.title?.length || 0) > 30 ? '...' : ''}</div>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Preview card - WhatsApp style */}
            <div className="p-4 bg-[#ECE5DD]">
              <div className="bg-white rounded-xl shadow-sm overflow-hidden border">
                {/* Card Header */}
                <div className="bg-[#081B3A] px-4 py-2 flex items-center justify-between">
                  <div className="text-white font-bold text-sm">SVV'PAY</div>
                  <div className="text-right">
                    <div className="text-white font-bold text-xs">Developer Issue Hub</div>
                    <div className="text-blue-300 text-[10px]">Track • Collaborate • Resolve</div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="px-4 py-3 space-y-2">
                  <div className="text-[#0D6EFD] font-bold text-sm">{issue.ticketCode}</div>
                  <div className="font-bold text-[#081B3A] text-base leading-tight">{issue.title || 'Untitled Issue'}</div>

                  <div className="flex gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      issue.priority === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                      issue.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                      issue.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {getPriorityIcon(issue.priority)} {issue.priority} Priority
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">
                      {issue.category?.name || 'General'}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-semibold">
                      {getStatusLabel(issue.status)}
                    </span>
                  </div>

                  {issue.description && issue.description !== 'No description provided' && (
                    <p className="text-xs text-gray-600 line-clamp-2">{issue.description}</p>
                  )}

                  <div className="grid grid-cols-2 gap-1 text-[11px] text-gray-500 pt-1">
                    <span>👤 {issue.assignedTeam?.name || 'SVV Dev Team'}</span>
                    <span>📎 {issue.attachments?.length || 0} attachments</span>
                    <span>📅 {new Date(issue.createdAt).toLocaleDateString('en-IN')}</span>
                    <span>⏱️ Age: {getAgeDays(issue.createdAt)} days</span>
                  </div>

                  {stats && (
                    <div className="mt-2 pt-2 border-t">
                      <div className="text-[11px] font-bold text-gray-600 mb-1">📊 Project Summary (SVV Pay)</div>
                      <div className="grid grid-cols-5 gap-1 text-center">
                        <div><div className="text-[10px] text-gray-500">Total</div><div className="font-black text-sm text-[#081B3A]">{stats.total}</div></div>
                        <div><div className="text-[10px] text-green-600">Open</div><div className="font-black text-sm text-green-600">{stats.open}</div></div>
                        <div><div className="text-[10px] text-orange-500">In Prog</div><div className="font-black text-sm text-orange-500">{stats.inProgress}</div></div>
                        <div><div className="text-[10px] text-red-500">Overdue</div><div className="font-black text-sm text-red-500">{stats.overdue}</div></div>
                        <div><div className="text-[10px] text-purple-600">Done</div><div className="font-black text-sm text-purple-600">{stats.completed}</div></div>
                      </div>
                    </div>
                  )}

                  {/* FIX: View Full Ticket navigates properly */}
                  <button
                    onClick={handleViewFullTicket}
                    className="flex items-center justify-center gap-2 bg-[#0D6EFD] hover:bg-blue-700 text-white text-sm font-bold py-2.5 rounded-lg mt-2 w-full transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Full Ticket
                  </button>
                  <div className="text-center text-[10px] text-gray-400">svvdigitalhub-svv.vercel.app</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="px-4 pb-4 space-y-2 bg-[#ECE5DD]">
              <button
                onClick={handleWhatsApp}
                className="w-full flex items-center justify-center gap-3 bg-[#25D366] hover:bg-[#1da850] text-white font-bold py-3 rounded-xl transition-colors text-sm"
              >
                <MessageCircle className="w-5 h-5" />
                Send via WhatsApp
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleCopyLink}
                  className="flex items-center justify-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium py-2 rounded-xl transition-colors text-xs"
                >
                  {copied ? <CheckCheck className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
                <button
                  onClick={handleCopyMessage}
                  className="flex items-center justify-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium py-2 rounded-xl transition-colors text-xs"
                >
                  <Copy className="w-4 h-4" />
                  Copy Message
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
