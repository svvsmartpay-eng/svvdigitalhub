import React, { useState, useRef } from 'react';
import { Share2, X, Download, Link2, CheckCheck, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ── Helpers ──────────────────────────────────────────────────
function getPriorityColor(p: string) {
  return ({ CRITICAL: '#EF4444', HIGH: '#F97316', MEDIUM: '#EAB308', LOW: '#22C55E' } as any)[p] || '#6B7280';
}
function getStatusLabel(s: string) {
  return ({ OPEN: 'Open', ASSIGNED: 'Assigned', IN_PROGRESS: 'In Progress', NEED_INFO: 'Need Info',
    TESTING: 'Testing', COMPLETED_BY_DEV: 'Fixed by Dev', VERIFIED_BY_SVV: 'Verified', CLOSED: 'Closed' } as any)[s] || s;
}
function getAgeDays(d: string) {
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}

// ── Canvas rounded rect ───────────────────────────────────────
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

// ── Ticket PNG Image Generator (Canvas 2D) ────────────────────
async function generateTicketPNG(
  issue: any,
  stats?: { total: number; open: number; inProgress: number; overdue: number; completed: number }
): Promise<Blob> {
  const W = 1080;
  const H = stats ? 820 : 680;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  const pColor = getPriorityColor(issue.priority || 'MEDIUM');
  const age = getAgeDays(issue.createdAt);
  const category = issue.category?.name || 'General';
  const team = issue.assignedTeam?.name || 'SVV Dev Team';
  const dateStr = new Date(issue.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const statusLabel = getStatusLabel(issue.status || 'OPEN');
  const ticketCode = issue.ticketCode || '#DEV-???';
  const title = (issue.title || 'Developer Issue').substring(0, 48);
  const rawDesc = (issue.description || '').replace(/<[^>]*>/g, '').trim();
  const desc = rawDesc !== 'No description provided' ? rawDesc.substring(0, 120) : '';

  // ─ Shadow
  ctx.fillStyle = '#E2E8F0';
  rrect(ctx, 6, 6, W - 6, H - 6, 20); ctx.fill();

  // ─ White card
  ctx.fillStyle = '#FFFFFF';
  rrect(ctx, 0, 0, W - 6, H - 6, 20); ctx.fill();

  // ─ Priority left strip
  ctx.fillStyle = pColor;
  ctx.fillRect(0, 20, 8, H - 26);
  ctx.fillStyle = pColor;
  rrect(ctx, 0, 0, 20, 20, 10); ctx.fill();
  ctx.fillRect(0, 10, 8, 30);

  // ─ Header
  const HDR = 96;
  ctx.save();
  ctx.beginPath();
  ctx.rect(8, 0, W - 14, HDR);
  ctx.clip();
  // gradient
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, '#081B3A');
  grad.addColorStop(1, '#0D2B5E');
  ctx.fillStyle = grad;
  ctx.fillRect(8, 0, W, HDR);
  ctx.restore();

  // SVV'PAY
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 28px Arial';
  ctx.fillText('SVV', 40, 56);
  ctx.fillStyle = '#60A5FA';
  ctx.fillText("'PAY", 90, 56);
  ctx.fillStyle = '#93C5FD';
  ctx.font = '11px Arial';
  ctx.fillText('Digital Services for Everyone', 40, 76);

  // Right header text
  ctx.textAlign = 'right';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 15px Arial';
  ctx.fillText('Developer Issue Hub', W - 40, 42);
  ctx.fillStyle = '#93C5FD';
  ctx.font = '12px Arial';
  ctx.fillText('Track  •  Collaborate  •  Resolve', W - 40, 64);
  ctx.textAlign = 'left';

  // ─ Ticket code
  ctx.fillStyle = '#0D6EFD';
  ctx.font = 'bold 22px Arial';
  ctx.fillText(ticketCode, 40, 146);

  // ─ Title
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 36px Arial';
  ctx.fillText(title + (issue.title?.length > 48 ? '...' : ''), 40, 202);

  // ─ Badges
  let bx = 40;
  const badgeY = 225;
  const drawBadge = (text: string, bg: string, fg: string) => {
    ctx.font = 'bold 14px Arial';
    const tw = ctx.measureText(text).width + 26;
    ctx.fillStyle = bg;
    rrect(ctx, bx, badgeY, tw, 32, 16); ctx.fill();
    ctx.fillStyle = fg;
    ctx.fillText(text, bx + 13, badgeY + 21);
    bx += tw + 10;
  };

  const pLabel = { CRITICAL: '● CRITICAL', HIGH: '● HIGH', MEDIUM: '● MEDIUM', LOW: '● LOW' }[issue.priority as string] || issue.priority;
  drawBadge(pLabel || 'MEDIUM', pColor + '33', pColor);
  drawBadge(statusLabel, '#DBEAFE', '#1D4ED8');
  drawBadge(category, '#EDE9FE', '#6D28D9');

  // ─ Description
  let nextY = 290;
  if (desc) {
    ctx.fillStyle = '#64748B';
    ctx.font = '16px Arial';
    const words = desc.split(' ');
    let line = '';
    let lines = 0;
    for (const word of words) {
      const test = line + word + ' ';
      if (ctx.measureText(test).width > W - 80 && line && lines < 2) {
        ctx.fillText(line.trim(), 40, nextY);
        nextY += 24; lines++;
        line = word + ' ';
      } else { line = test; }
    }
    if (line && lines < 2) { ctx.fillText(line.trim(), 40, nextY); nextY += 24; }
    nextY += 8;
  }

  // ─ Divider
  ctx.strokeStyle = '#E2E8F0'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(40, nextY); ctx.lineTo(W - 40, nextY); ctx.stroke();
  nextY += 26;

  // ─ Info row
  ctx.font = '15px Arial'; ctx.fillStyle = '#64748B';
  const infoW = (W - 80) / 3;
  [`Assigned: ${team}`, `Date: ${dateStr}`, `Age: ${age} day${age !== 1 ? 's' : ''}`]
    .forEach((t, i) => ctx.fillText(t, 40 + i * infoW, nextY + 14));
  nextY += 44;

  // ─ Stats
  if (stats) {
    ctx.strokeStyle = '#E2E8F0';
    ctx.beginPath(); ctx.moveTo(40, nextY); ctx.lineTo(W - 40, nextY); ctx.stroke();
    nextY += 24;
    ctx.font = 'bold 13px Arial'; ctx.fillStyle = '#475569';
    ctx.fillText('PROJECT SUMMARY (SVV Pay)', 40, nextY + 12);
    nextY += 34;
    const cols = [
      { l: 'Total', v: stats.total, c: '#0F172A' },
      { l: 'Open', v: stats.open, c: '#16A34A' },
      { l: 'In Progress', v: stats.inProgress, c: '#F97316' },
      { l: 'Overdue', v: stats.overdue, c: '#DC2626' },
      { l: 'Done', v: stats.completed, c: '#7C3AED' },
    ];
    const sw = (W - 80) / 5;
    ctx.textAlign = 'center';
    cols.forEach(({ l, v, c }, i) => {
      const cx = 40 + i * sw + sw / 2;
      ctx.fillStyle = c; ctx.font = 'bold 32px Arial';
      ctx.fillText(String(v), cx, nextY + 32);
      ctx.fillStyle = '#94A3B8'; ctx.font = '12px Arial';
      ctx.fillText(l, cx, nextY + 52);
    });
    ctx.textAlign = 'left';
    nextY += 70;
  }

  // ─ View Full Ticket button
  const btnY = nextY + 18;
  const btnW = W - 80;
  ctx.fillStyle = '#0D6EFD';
  rrect(ctx, 40, btnY, btnW, 52, 12); ctx.fill();
  ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 19px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('View Full Ticket', W / 2 - 4, btnY + 33);
  ctx.textAlign = 'left';

  // ─ Footer
  ctx.fillStyle = '#CBD5E1'; ctx.font = '13px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('svvdigitalhub-svv.vercel.app', W / 2 - 4, btnY + 72);
  ctx.textAlign = 'left';

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob returned null'))),
      'image/png',
      0.96
    );
  });
}

// ── Component ─────────────────────────────────────────────────
interface Props { issue: any; allIssues?: any[]; }

export default function ShareIssueButton({ issue, allIssues }: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [imgBlob, setImgBlob] = useState<Blob | null>(null);
  const [copied, setCopied] = useState(false);
  const [genError, setGenError] = useState(false);

  const stats = allIssues ? {
    total: allIssues.length,
    open: allIssues.filter((i: any) => ['OPEN', 'ASSIGNED'].includes(i.status)).length,
    inProgress: allIssues.filter((i: any) => i.status === 'IN_PROGRESS').length,
    overdue: allIssues.filter((i: any) => i.dueDate && new Date(i.dueDate) < new Date() && i.status !== 'CLOSED').length,
    completed: allIssues.filter((i: any) => ['CLOSED', 'COMPLETED_BY_DEV'].includes(i.status)).length,
  } : undefined;

  const portalToken = issue.assignedTeam?.publicToken;
  const ogUrl = (() => {
    const p = new URLSearchParams({ id: issue.id });
    if (portalToken) p.set('token', portalToken);
    return `${window.location.origin}/api/ticket?${p.toString()}`;
  })();

  // Generate image
  const generateImage = async () => {
    setLoading(true);
    setGenError(false);
    try {
      const blob = await generateTicketPNG(issue, stats);
      const url = URL.createObjectURL(blob);
      setImgBlob(blob);
      setImgUrl(url);
    } catch (e) {
      console.error('Ticket image generation failed:', e);
      setGenError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setOpen(true);
    generateImage();
  };

  const handleClose = () => {
    setOpen(false);
    setImgUrl(null);
    setImgBlob(null);
    setGenError(false);
  };

  // ── Share as image to WhatsApp ──
  const handleWhatsAppShare = async () => {
    const link = ogUrl;

    // If image available → share image + link
    if (imgBlob) {
      const file = new File([imgBlob], `${issue.ticketCode || 'ticket'}.png`, { type: 'image/png' });

      // Try Web Share API (mobile: Android Chrome / Safari iOS)
      if (typeof navigator.share === 'function') {
        try {
          const shareData: ShareData = { text: link };
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            (shareData as any).files = [file];
          }
          await navigator.share(shareData);
          handleClose();
          return;
        } catch (e: any) {
          if (e.name === 'AbortError') return;
          // fall through
        }
      }

      // Desktop fallback: download image first, then open WhatsApp
      const a = document.createElement('a');
      a.href = URL.createObjectURL(imgBlob);
      a.download = `${issue.ticketCode || 'ticket'}.png`;
      a.click();
      setTimeout(() => window.open(`https://wa.me/?text=${encodeURIComponent(link)}`, '_blank'), 700);
    } else {
      // No image → just open WhatsApp with link
      window.open(`https://wa.me/?text=${encodeURIComponent(link)}`, '_blank');
    }
  };

  const handleDownload = () => {
    if (!imgBlob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(imgBlob);
    a.download = `${issue.ticketCode || 'ticket'}.png`;
    a.click();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(ogUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* ── Trigger: visible Share button on each card ── */}
      <button
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors px-2.5 py-1 rounded-full"
        title="Share ticket via WhatsApp"
      >
        <Share2 className="w-3.5 h-3.5" />
        Share
      </button>

      {/* ── Modal ── */}
      {open && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 p-3"
          onClick={handleClose}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
            style={{ maxHeight: '95vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#081B3A] to-[#0D6EFD] text-white px-5 py-4 flex items-center justify-between shrink-0">
              <div>
                <div className="font-bold text-base">Share Ticket Image</div>
                <div className="text-xs text-blue-200 mt-0.5">
                  {issue.ticketCode} — {(issue.title || '').substring(0, 28)}{(issue.title?.length ?? 0) > 28 ? '…' : ''}
                </div>
              </div>
              <button onClick={handleClose} className="text-white/70 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Image preview area */}
            <div className="overflow-y-auto flex-1">
              <div className="bg-slate-50 flex items-center justify-center" style={{ minHeight: 180 }}>
                {loading ? (
                  <div className="flex flex-col items-center gap-2 py-10">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    <p className="text-sm text-gray-500">Generating ticket card…</p>
                  </div>
                ) : genError ? (
                  <div className="flex flex-col items-center gap-2 py-8 px-4 text-center">
                    <div className="text-3xl">⚠️</div>
                    <p className="text-sm text-gray-500">Image generation failed.<br />You can still share the link.</p>
                    <button
                      onClick={generateImage}
                      className="text-xs text-blue-600 underline mt-1"
                    >
                      Try again
                    </button>
                  </div>
                ) : imgUrl ? (
                  <img
                    src={imgUrl}
                    alt="Ticket card"
                    className="w-full object-contain"
                    style={{ maxHeight: 300 }}
                  />
                ) : null}
              </div>

              {/* Link info */}
              <div className="px-4 py-2.5 bg-white border-t border-gray-100">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Shareable link (caption)</p>
                <p className="text-xs text-blue-600 break-all font-mono leading-relaxed">{ogUrl}</p>
              </div>

              {/* Actions */}
              <div className="px-4 pb-5 pt-3 space-y-2.5">

                {/* PRIMARY: Share Image via WhatsApp */}
                <button
                  onClick={handleWhatsAppShare}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2.5 bg-[#25D366] hover:bg-[#1da850] active:bg-[#17943f] disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition-colors text-sm shadow-md"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  )}
                  {loading ? 'Generating…' : imgBlob ? 'Share Image via WhatsApp' : 'Share Link via WhatsApp'}
                </button>

                {/* Secondary: Save + Copy */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleDownload}
                    disabled={!imgBlob}
                    className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-semibold py-2.5 rounded-xl transition-colors text-xs"
                  >
                    <Download className="w-4 h-4" />
                    Save Image
                  </button>
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl transition-colors text-xs"
                  >
                    {copied ? <CheckCheck className="w-4 h-4 text-green-600" /> : <Link2 className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy Link'}
                  </button>
                </div>

                {/* Tip text */}
                <p className="text-center text-[11px] text-gray-400 pt-1">
                  {imgBlob
                    ? '📱 On mobile: picks WhatsApp from share sheet\n💻 On desktop: image downloads, then WhatsApp opens'
                    : '🔗 Link will be sent as WhatsApp message'}
                </p>

                {/* Admin link */}
                <button
                  onClick={() => { handleClose(); navigate(`/settings/dev-hub/issues/${issue.id}`); }}
                  className="w-full text-center text-[11px] text-gray-400 hover:text-blue-600 py-1 transition-colors"
                >
                  Open full admin ticket →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
