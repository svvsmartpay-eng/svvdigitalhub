// Vercel Serverless Function - OG Meta Tags for WhatsApp/Social rich card previews
// URL: /api/ticket?id=ISSUE_ID&token=TEAM_PUBLIC_TOKEN
// - WhatsApp bot crawls this → gets OG tags → shows rich preview card
// - Human clicks link → gets HTML page → redirected to /dev-portal/:token/issues/:id

// NOTE: This file uses ESM because package.json has "type": "module"
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://kxacmxxktuvildjjvnjs.supabase.co';
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4YWNteHhrdHV2aWxkamp2bmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNzc5NjgsImV4cCI6MjEwMzc1Mzk2OH0.bz5ObWxHckEg-9FanAP8sOz6VNPa7gKgKvEkzV0Rl74';

const BASE_URL = 'https://svvdigitalhub-svv.vercel.app';

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function getPriorityEmoji(priority) {
  const map = { CRITICAL: '🔴', HIGH: '🟠', MEDIUM: '🟡', LOW: '🟢' };
  return map[priority] || '⚪';
}

function getStatusLabel(status) {
  const map = {
    OPEN: 'Open', ASSIGNED: 'Assigned', IN_PROGRESS: 'In Progress',
    NEED_INFO: 'Need Info', TESTING: 'Testing', COMPLETED_BY_DEV: 'Fixed by Dev',
    VERIFIED_BY_SVV: 'Verified', CLOSED: 'Closed',
  };
  return map[status] || status;
}

function getAgeDays(createdAt) {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
}

export default async function handler(req, res) {
  const { id, token } = req.query;

  if (!id) {
    res.status(400).send('Missing ticket id');
    return;
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const { data: issue, error } = await supabase
      .from('DevIssue')
      .select('*, category:DevIssueCategory(name), assignedTeam:DevTeam(name, publicToken)')
      .eq('id', id)
      .single();

    if (error || !issue) {
      res.status(404).send('Ticket not found');
      return;
    }

    const portalToken = token || issue.assignedTeam?.publicToken;
    // Always use the new public ticket view that requires no auth and shows full timeline
    const portalUrl = `${BASE_URL}/public/ticket/${id}`;

    const ticketCode = issue.ticketCode || '#DEV-???';
    const title = `${ticketCode} — ${issue.title || 'Developer Issue'}`;
    const priorityEmoji = getPriorityEmoji(issue.priority);
    const statusLabel = getStatusLabel(issue.status);
    const age = getAgeDays(issue.createdAt);
    const category = issue.category?.name || 'General';
    const team = issue.assignedTeam?.name || 'SVV Dev Team';

    const descSnippet = (issue.description && issue.description !== 'No description provided')
      ? issue.description.substring(0, 120)
      : '';

    const ogDescription = [
      `${priorityEmoji} ${issue.priority} Priority  |  ${statusLabel}  |  ${category}`,
      descSnippet,
      `👤 ${team}  |  Age: ${age} day${age !== 1 ? 's' : ''}`,
    ].filter(Boolean).join('\n');

    // Static branded OG image (SVG served inline, converted to img tag)
    // WhatsApp needs a real PNG/JPG. Use our own /api/og endpoint (see below)
    // or fallback to a reliable placeholder service
    const ogImageUrl = `${BASE_URL}/api/og?title=${encodeURIComponent(ticketCode)}&sub=${encodeURIComponent((issue.title || '').substring(0, 45))}&priority=${encodeURIComponent(issue.priority)}&status=${encodeURIComponent(statusLabel)}&cat=${encodeURIComponent(category)}`;

    // Fetch first attachment if available
    const { data: attachments } = await supabase
      .from('DevIssueAttachment')
      .select('url')
      .eq('issueId', id)
      .limit(1);
    const finalOgImage = attachments?.[0]?.url || ogImageUrl;

    const safe = (s) => escapeHtml(s);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safe(title)}</title>
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="SVV Pay — Developer Issue Hub">
  <meta property="og:title" content="${safe(title)}">
  <meta property="og:description" content="${safe(ogDescription)}">
  <meta property="og:image" content="${safe(finalOgImage)}">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${safe(portalUrl)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safe(title)}">
  <meta name="twitter:description" content="${safe(ogDescription)}">
  <meta name="twitter:image" content="${safe(finalOgImage)}">
  <meta name="description" content="${safe(ogDescription)}">
  <meta http-equiv="refresh" content="0;url=${safe(portalUrl)}">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #081B3A; color: #fff; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 2rem; }
    .logo { font-size: 1.75rem; font-weight: 900; letter-spacing: -0.5px; }
    .logo span { color: #3B82F6; }
    .sub { font-size: 0.75rem; color: #93C5FD; margin-top: 0.25rem; }
    .card { background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.15); border-radius: 1rem; padding: 1.5rem 2rem; margin: 1.5rem 0; max-width: 460px; width: 100%; }
    .ticket-code { color: #60A5FA; font-weight: 700; font-size: 0.875rem; margin-bottom: 0.5rem; }
    .ticket-title { font-size: 1.25rem; font-weight: 800; margin-bottom: 1rem; line-height: 1.3; }
    .badges { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
    .badge { padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; background: rgba(255,255,255,0.12); }
    .spinner { width: 2rem; height: 2rem; border: 3px solid rgba(255,255,255,0.15); border-top-color: #3B82F6; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 1.5rem auto 0.75rem; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .link { color: #93C5FD; font-size: 0.8rem; text-decoration: none; }
  </style>
</head>
<body>
  <div class="logo">SVV<span>'PAY</span></div>
  <div class="sub">Developer Issue Hub • Track • Collaborate • Resolve</div>
  <div class="card">
    <div class="ticket-code">${safe(ticketCode)}</div>
    <div class="ticket-title">${safe(issue.title || 'Developer Issue')}</div>
    <div class="badges">
      <span class="badge">${priorityEmoji} ${safe(issue.priority)}</span>
      <span class="badge">📌 ${safe(statusLabel)}</span>
      <span class="badge">📁 ${safe(category)}</span>
      <span class="badge">👤 ${safe(team)}</span>
    </div>
  </div>
  <div class="spinner"></div>
  <a class="link" href="${safe(portalUrl)}">Opening ticket... click here if not redirected →</a>
  <script>setTimeout(function(){ window.location.replace(${JSON.stringify(portalUrl)}); }, 200);</script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=3600');
    res.status(200).send(html);

  } catch (err) {
    console.error('OG ticket error:', err);
    res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
}
