// apps/web/api/ticket.js
// Vercel Serverless Function - serves OG meta tags for WhatsApp/social rich previews
// URL: /api/ticket?id=ISSUE_ID&token=TEAM_PUBLIC_TOKEN
// - WhatsApp bot crawls this URL → gets OG tags → shows rich preview card
// - Human clicking the link → HTML redirect → lands on /dev-portal/:token/issues/:id (no login needed)

const { createClient } = require('@supabase/supabase-js');

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
  switch (priority) {
    case 'CRITICAL': return '🔴';
    case 'HIGH': return '🟠';
    case 'MEDIUM': return '🟡';
    case 'LOW': return '🟢';
    default: return '⚪';
  }
}

function getStatusLabel(status) {
  const map = {
    OPEN: 'Open',
    ASSIGNED: 'Assigned',
    IN_PROGRESS: 'In Progress',
    NEED_INFO: 'Need Info',
    TESTING: 'Testing',
    COMPLETED_BY_DEV: 'Fixed by Dev',
    VERIFIED_BY_SVV: 'Verified',
    CLOSED: 'Closed',
  };
  return map[status] || status;
}

function getAgeDays(createdAt) {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
}

module.exports = async (req, res) => {
  const { id, token } = req.query;

  if (!id) {
    res.status(400).send('Missing ticket id');
    return;
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // Fetch the ticket with category and team
    const { data: issue, error } = await supabase
      .from('DevIssue')
      .select('*, category:DevIssueCategory(name), assignedTeam:DevTeam(name, publicToken)')
      .eq('id', id)
      .single();

    if (error || !issue) {
      res.status(404).send('Ticket not found');
      return;
    }

    // Determine the portal token - use passed token, or the team's publicToken, or admin portal
    const portalToken = token || issue.assignedTeam?.publicToken;
    const portalUrl = portalToken
      ? `${BASE_URL}/dev-portal/${portalToken}/issues/${id}`
      : `${BASE_URL}/settings/dev-hub/issues/${id}`;

    // Build OG meta content
    const title = `${issue.ticketCode} — ${issue.title || 'Developer Issue'}`;
    const priorityEmoji = getPriorityEmoji(issue.priority);
    const statusLabel = getStatusLabel(issue.status);
    const age = getAgeDays(issue.createdAt);
    const category = issue.category?.name || 'General';
    const description = [
      `${priorityEmoji} ${issue.priority} Priority  |  📌 ${statusLabel}  |  📁 ${category}`,
      issue.description && issue.description !== 'No description provided'
        ? issue.description.substring(0, 160)
        : null,
      `👤 ${issue.assignedTeam?.name || 'SVV Dev Team'}  |  ⏱️ Age: ${age} day${age !== 1 ? 's' : ''}`,
    ].filter(Boolean).join('\n');

    // OG Image: Use placehold.co to generate a branded image with ticket info
    // Format: 1200x630 dark navy background, white text
    const imageText = encodeURIComponent(`SVV Pay • Developer Hub\n${issue.ticketCode}\n${(issue.title || '').substring(0, 50)}\n${priorityEmoji} ${issue.priority}  |  📌 ${statusLabel}`);
    const ogImageUrl = `https://placehold.co/1200x630/081B3A/ffffff/png?text=${imageText}&font=montserrat`;

    // Fetch first attachment as OG image if available
    const { data: attachments } = await supabase
      .from('DevIssueAttachment')
      .select('url')
      .eq('issueId', id)
      .limit(1);
    const attachmentImage = attachments?.[0]?.url;
    const finalOgImage = attachmentImage || ogImageUrl;

    const safeTitle = escapeHtml(title);
    const safeDesc = escapeHtml(description);
    const safeUrl = escapeHtml(portalUrl);
    const safeImage = escapeHtml(finalOgImage);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>

  <!-- ===== Open Graph Meta Tags (WhatsApp, Facebook, LinkedIn) ===== -->
  <meta property="og:type"        content="website" />
  <meta property="og:site_name"   content="SVV Pay — Developer Issue Hub" />
  <meta property="og:title"       content="${safeTitle}" />
  <meta property="og:description" content="${safeDesc}" />
  <meta property="og:image"       content="${safeImage}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url"         content="${safeUrl}" />

  <!-- ===== Twitter Card Meta Tags ===== -->
  <meta name="twitter:card"        content="summary_large_image" />
  <meta name="twitter:title"       content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDesc}" />
  <meta name="twitter:image"       content="${safeImage}" />

  <!-- ===== WhatsApp specific: description fallback ===== -->
  <meta name="description" content="${safeDesc}" />

  <!-- ===== Redirect browsers (not WhatsApp bot) to the portal ===== -->
  <meta http-equiv="refresh" content="0;url=${safeUrl}" />

  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #081B3A;
      color: white;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      text-align: center;
      padding: 2rem;
    }
    .logo { font-size: 2rem; font-weight: 900; margin-bottom: 0.5rem; }
    .logo span { color: #3B82F6; }
    .ticket { font-size: 1.25rem; font-weight: 700; color: #60A5FA; margin: 1rem 0 0.25rem; }
    .title { font-size: 1.5rem; font-weight: 800; margin-bottom: 1rem; }
    .badge { display: inline-block; background: rgba(255,255,255,0.1); border-radius: 999px; padding: 0.25rem 0.75rem; font-size: 0.875rem; margin: 0.25rem; }
    .redirect-link { margin-top: 2rem; color: #93C5FD; text-decoration: none; font-size: 0.875rem; }
    .spinner { width: 2rem; height: 2rem; border: 3px solid rgba(255,255,255,0.2); border-top-color: #3B82F6; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 2rem auto 0; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="logo">SVV<span>'PAY</span></div>
  <div style="font-size:0.75rem; opacity:0.6; margin-bottom:1.5rem">Developer Issue Hub • Track • Collaborate • Resolve</div>
  <div class="ticket">${escapeHtml(issue.ticketCode)}</div>
  <div class="title">${escapeHtml(issue.title || 'Developer Issue')}</div>
  <div>
    <span class="badge">${priorityEmoji} ${escapeHtml(issue.priority)}</span>
    <span class="badge">📌 ${escapeHtml(statusLabel)}</span>
    <span class="badge">📁 ${escapeHtml(category)}</span>
  </div>
  <div class="spinner"></div>
  <a class="redirect-link" href="${safeUrl}">Opening ticket... Click here if not redirected automatically →</a>
  <script>
    // Redirect after small delay so OG bots can read meta tags
    setTimeout(function() {
      window.location.replace('${safeUrl.replace(/'/g, "\\'")}');
    }, 300);
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    // Allow WhatsApp bot to cache the OG preview for 1 hour, but serve fresh to users
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.status(200).send(html);

  } catch (err) {
    console.error('OG ticket error:', err);
    res.status(500).send('Internal server error');
  }
};
