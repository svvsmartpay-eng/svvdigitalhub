import React, { useState, useRef } from 'react';
import { Share2, X, Download, Link2, CheckCheck, ImageIcon, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
function getPriorityColor(priority: string): string {
  return { CRITICAL: '#EF4444', HIGH: '#F97316', MEDIUM: '#EAB308', LOW: '#22C55E' }[priority] || '#6B7280';
}
function getPriorityLabel(priority: string): string {
  return { CRITICAL: '● CRITICAL', HIGH: '● HIGH', MEDIUM: '● MEDIUM', LOW: '● LOW' }[priority] || priority;
}
function getStatusLabel(status: string): string {
  return { OPEN: 'Open', ASSIGNED: 'Assigned', IN_PROGRESS: 'In Progress', NEED_INFO: 'Need Info',
    TESTING: 'Testing', COMPLETED_BY_DEV: 'Fixed by Dev', VERIFIED_BY_SVV: 'Verified', CLOSED: 'Closed' }[status] || status;
}
function getAgeDays(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
}

// ──────────────────────────────────────────────
// Canvas rounded rectangle helper
// ──────────────────────────────────────────────
function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ──────────────────────────────────────────────
// Canvas ticket image generator
// ──────────────────────────────────────────────
async function generateTicketImage(
  issue: any,
  stats?: { total: number; open: number; inProgress: number; overdue: number; completed: number }
): Promise<Blob> {
  const W = 1080;
  const hasStats = !!stats;
  const H = hasStats ? 800 : 660;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const pColor = getPriorityColor(issue.priority || 'MEDIUM');
  const age = getAgeDays(issue.createdAt);
  const category = issue.category?.name || 'General';
  const team = issue.assignedTeam?.name || 'SVV Dev Team';
  const date = new Date(issue.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const statusLabel = getStatusLabel(issue.status || 'OPEN');
  const priorityLabel = getPriorityLabel(issue.priority || 'MEDIUM');
  const ticketCode = issue.ticketCode || '#DEV-???';
  const title = (issue.title || 'Developer Issue').substring(0, 50);

  // Strip HTML from description
  const rawDesc = (issue.description || '').replace(/<[^>]*>/g, '').trim();
  const desc = rawDesc && rawDesc !== 'No description provided' ? rawDesc.substring(0, 130) + (rawDesc.length > 130 ? '…' : '') : '';

  // ── SHADOW ──
  ctx.fillStyle = '#E2E8F0';
  rrect(ctx, 8, 8, W - 8, H - 8, 20);
  ctx.fill();

  // ── CARD BACKGROUND ──
  ctx.fillStyle = '#FFFFFF';
  rrect(ctx, 0, 0, W - 8, H - 8, 20);
  ctx.fill();

  // ── LEFT PRIORITY STRIP ──
  ctx.fillStyle = pColor;
  ctx.beginPath();
  ctx.moveTo(0, 20);
  ctx.arcTo(0, 0, 20, 0, 20);
  ctx.lineTo(10, 0);
  ctx.lineTo(10, H - 8);
  ctx.lineTo(0, H - 8);
  ctx.closePath();
  ctx.fill();

  // ── HEADER (navy) ──
  const HDR = 100;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(10, 0);
  ctx.lineTo(W - 28, 0);
  ctx.quadraticCurveTo(W - 8, 0, W - 8, 20);
  ctx.lineTo(W - 8, HDR);
  ctx.lineTo(10, HDR);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = '#081B3A';
  ctx.fillRect(0, 0, W, HDR);
  ctx.restore();

  // Logo text "SVV'PAY"
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 28px "Arial Black", Arial, sans-serif';
  ctx.fillText('SVV', 40, 60);
  ctx.fillStyle = '#60A5FA';
  ctx.fillText("'PAY", 87, 60);

  // Digital services tagline
  ctx.fillStyle = '#93C5FD';
  ctx.font = '11px Arial, sans-serif';
  ctx.fillText('Digital Services for Everyone', 40, 80);

  // Right: hub label
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 14px Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('Developer Issue Hub', W - 40, 45);
  ctx.fillStyle = '#93C5FD';
  ctx.font = '12px Arial, sans-serif';
  ctx.fillText('Track  •  Collaborate  •  Resolve', W - 40, 65);
  ctx.textAlign = 'left';

  // ── TICKET CODE ──
  ctx.fillStyle = '#0D6EFD';
  ctx.font = 'bold 22px Arial, sans-serif';
  ctx.fillText(ticketCode, 40, 148);

  // ── TITLE ──
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 34px "Arial Black", Arial, sans-serif';
  ctx.fillText(title, 40, 200);

  // ── BADGE HELPER ──
  function drawBadge(text: string, x: number, y: number, bg: string, fg: string): number {
    ctx.font = 'bold 14px Arial, sans-serif';
    const tw = ctx.measureText(text).width;
    const bw = tw + 24;
    const bh = 30;
    ctx.fillStyle = bg;
    rrect(ctx, x, y, bw, bh, 15);
    ctx.fill();
    ctx.fillStyle = fg;
    ctx.fillText(text, x + 12, y + 20);
    return bw + 10;
  }

  let bx = 40;
  bx += drawBadge(priorityLabel, bx, 220, pColor + '22', pColor);
  bx += drawBadge(statusLabel, bx, 220, '#EFF6FF', '#0D6EFD');
  drawBadge(category, bx, 220, '#F5F3FF', '#7C3AED');

  // ── DESCRIPTION ──
  let nextY = 290;
  if (desc) {
    ctx.fillStyle = '#64748B';
    ctx.font = '16px Arial, sans-serif';
    // Word-wrap description
    const words = desc.split(' ');
    let line = '';
    const maxW = W - 80;
    let lineCount = 0;
    for (const word of words) {
      const test = line + word + ' ';
      if (ctx.measureText(test).width > maxW && line !== '' && lineCount < 2) {
        ctx.fillText(line.trimEnd(), 40, nextY);
        line = word + ' ';
        nextY += 24;
        lineCount++;
      } else {
        line = test;
      }
    }
    if (line && lineCount < 2) {
      ctx.fillText(line.trimEnd(), 40, nextY);
      nextY += 24;
    }
    nextY += 10;
  }

  // ── DIVIDER ──
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, nextY);
  ctx.lineTo(W - 48, nextY);
  ctx.stroke();
  nextY += 24;

  // ── INFO ROW ──
  ctx.fillStyle = '#64748B';
  ctx.font = '15px Arial, sans-serif';
  const infoItems = [`Assigned: ${team}`, `Created: ${date}`, `Age: ${age} day${age !== 1 ? 's' : ''}`];
  const colW = (W - 80) / 3;
  infoItems.forEach((item, i) => {
    ctx.fillText(item, 40 + i * colW, nextY + 14);
  });
  nextY += 40;

  // ── PROJECT STATS (if available) ──
  if (hasStats && stats) {
    ctx.strokeStyle = '#E2E8F0';
    ctx.beginPath();
    ctx.moveTo(40, nextY);
    ctx.lineTo(W - 48, nextY);
    ctx.stroke();
    nextY += 24;

    ctx.fillStyle = '#475569';
    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.fillText('Project Summary (SVV Pay)', 40, nextY + 10);
    nextY += 30;

    const statCols = [
      { label: 'Total', value: stats.total, color: '#0F172A' },
      { label: 'Open', value: stats.open, color: '#16A34A' },
      { label: 'In Progress', value: stats.inProgress, color: '#F97316' },
      { label: 'Overdue', value: stats.overdue, color: '#DC2626' },
      { label: 'Done', value: stats.completed, color: '#7C3AED' },
    ];
    const sW = (W - 80) / 5;
    ctx.textAlign = 'center';
    statCols.forEach((s, i) => {
      const cx = 40 + i * sW + sW / 2;
      ctx.fillStyle = s.color;
      ctx.font = 'bold 30px "Arial Black", Arial, sans-serif';
      ctx.fillText(String(s.value), cx, nextY + 28);
      ctx.fillStyle = '#94A3B8';
      ctx.font = '12px Arial, sans-serif';
      ctx.fillText(s.label, cx, nextY + 48);
    });
    ctx.textAlign = 'left';
    nextY += 70;
  }

  // ── VIEW FULL TICKET BUTTON ──
  const btnY = nextY + 16;
  const btnH = 52;
  ctx.fillStyle = '#0D6EFD';
  rrect(ctx, 40, btnY, W - 88, btnH, 12);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 18px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('View Full Ticket', (W - 48) / 2, btnY + 33);
  ctx.textAlign = 'left';

  // ── FOOTER ──
  const footerY = btnY + btnH + 26;
  ctx.fillStyle = '#CBD5E1';
  ctx.font = '13px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('svvdigitalhub-svv.vercel.app', (W - 48) / 2, footerY);
  ctx.textAlign = 'left';

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
      'image/png',
      0.95
    );
  });
}

// ──────────────────────────────────────────────
// Component Props
// ──────────────────────────────────────────────
interface ShareIssueProps {
  issue: any;
  allIssues?: any[];
}

// ──────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────
export default function ShareIssueButton({ issue, allIssues }: ShareIssueProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const blobRef = useRef<Blob | null>(null);

  const stats = allIssues ? {
    total: allIssues.length,
    open: allIssues.filter((i: any) => ['OPEN', 'ASSIGNED'].includes(i.status)).length,
    inProgress: allIssues.filter((i: any) => i.status === 'IN_PROGRESS').length,
    overdue: allIssues.filter((i: any) => i.dueDate && new Date(i.dueDate) < new Date() && i.status !== 'CLOSED').length,
    completed: allIssues.filter((i: any) => ['CLOSED', 'COMPLETED_BY_DEV'].includes(i.status)).length,
  } : undefined;

  // OG-enabled URL (WhatsApp bot gets OG tags, user gets portal)
  const portalToken = issue.assignedTeam?.publicToken;
  const ogShareUrl = (() => {
    const params = new URLSearchParams({ id: issue.id });
    if (portalToken) params.set('token', portalToken);
    return `${window.location.origin}/api/ticket?${params.toString()}`;
  })();

  // Generate the image when modal opens
  const handleOpen = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
    setGenerating(true);
    try {
      const blob = await generateTicketImage(issue, stats);
      blobRef.current = blob;
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (err) {
      console.error('Image generation failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    blobRef.current = null;
  };

  // ── Share as image via Web Share API (mobile) or download + link (desktop) ──
  const handleShareToWhatsApp = async () => {
    if (!blobRef.current) return;

    const fileName = `${issue.ticketCode || 'ticket'}.png`;
    const file = new File([blobRef.current], fileName, { type: 'image/png' });

    // Web Share API — works on Android Chrome, Safari iOS
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          // Only the link as text — no extra message, per user request
          text: ogShareUrl,
        });
        handleClose();
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return; // User cancelled
        // Fall through to fallback
      }
    }

    // Desktop fallback: download image + open WhatsApp web with link
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blobRef.current);
    a.download = fileName;
    a.click();
    // Open WhatsApp with ONLY the link (no text)
    setTimeout(() => {
      window.open(`https://wa.me/?text=${encodeURIComponent(ogShareUrl)}`, '_blank');
    }, 600);
  };

  // ── Download image ──
  const handleDownload = () => {
    if (!blobRef.current) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blobRef.current);
    a.download = `${issue.ticketCode || 'ticket'}.png`;
    a.click();
  };

  // ── Copy link ──
  const handleCopyLink = () => {
    navigator.clipboard.writeText(ogShareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleViewFull = () => {
    handleClose();
    navigate(`/settings/dev-hub/issues/${issue.id}`);
  };

  return (
    <>
      {/* ── Trigger button ── */}
      <button
        onClick={handleOpen}
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-green-600 transition-colors px-2 py-1 rounded hover:bg-green-50"
        title="Share via WhatsApp"
      >
        <Share2 className="w-3.5 h-3.5" />
        <span>Share</span>
      </button>

      {/* ── Modal ── */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={handleClose}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#081B3A] to-[#0D6EFD] text-white px-5 py-4 flex items-center justify-between">
              <div>
                <div className="font-bold text-lg">Share Ticket</div>
                <div className="text-xs opacity-70">
                  {issue.ticketCode} — {(issue.title || '').substring(0, 32)}
                  {(issue.title?.length ?? 0) > 32 ? '…' : ''}
                </div>
              </div>
              <button onClick={handleClose} className="text-white/70 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Image Preview */}
            <div className="bg-slate-100 flex items-center justify-center" style={{ minHeight: 220 }}>
              {generating ? (
                <div className="flex flex-col items-center gap-3 py-10">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                  <p className="text-sm text-gray-500">Generating ticket image…</p>
                </div>
              ) : previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Ticket card preview"
                  className="w-full max-h-72 object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 py-10 text-gray-400">
                  <ImageIcon className="w-8 h-8" />
                  <p className="text-sm">Preview unavailable</p>
                </div>
              )}
            </div>

            {/* Link preview */}
            <div className="px-5 py-3 bg-gray-50 border-t border-b border-gray-100">
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-1">Link to be shared</p>
              <p className="text-xs text-blue-600 break-all font-mono">{ogShareUrl}</p>
            </div>

            {/* Actions */}
            <div className="px-5 py-4 space-y-3">
              {/* Primary: Share as Image to WhatsApp */}
              <button
                onClick={handleShareToWhatsApp}
                disabled={generating || !blobRef.current}
                className="w-full flex items-center justify-center gap-3 bg-[#25D366] hover:bg-[#1da850] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-colors text-sm"
              >
                {generating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                )}
                Share as Image to WhatsApp
              </button>

              {/* Secondary buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleDownload}
                  disabled={generating || !blobRef.current}
                  className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-medium py-2.5 rounded-xl transition-colors text-xs"
                >
                  <Download className="w-4 h-4" />
                  Save Image
                </button>
                <button
                  onClick={handleCopyLink}
                  className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 rounded-xl transition-colors text-xs"
                >
                  {copied ? <CheckCheck className="w-4 h-4 text-green-600" /> : <Link2 className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
              </div>

              {/* View Full Ticket */}
              <button
                onClick={handleViewFull}
                className="w-full text-center text-xs text-gray-400 hover:text-blue-600 py-1 transition-colors"
              >
                Open admin ticket view →
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
