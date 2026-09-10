// /api/og.js — Generates a branded OG preview image as SVG (served as image/svg+xml)
// WhatsApp, Telegram, Discord all support SVG OG images
// URL: /api/og?title=DEV-1003&sub=Title&priority=HIGH&status=Open&cat=AEPS

export default function handler(req, res) {
  const {
    title = '#DEV-???',
    sub = 'Developer Issue',
    priority = 'MEDIUM',
    status = 'Open',
    cat = 'General',
  } = req.query;

  // Priority colors
  const priorityColors = {
    CRITICAL: '#EF4444',
    HIGH: '#F97316',
    MEDIUM: '#EAB308',
    LOW: '#22C55E',
  };
  const priorityColor = priorityColors[priority] || '#6B7280';
  const priorityEmoji = { CRITICAL: '🔴', HIGH: '🟠', MEDIUM: '🟡', LOW: '🟢' }[priority] || '⚪';

  // Truncate long strings
  const shortTitle = String(title).substring(0, 20);
  const shortSub = String(sub).substring(0, 48);
  const shortCat = String(cat).substring(0, 20);
  const shortStatus = String(status).substring(0, 15);
  const shortPriority = String(priority).substring(0, 10);

  const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#081B3A"/>
      <stop offset="100%" stop-color="#0D2B5A"/>
    </linearGradient>
    <linearGradient id="card" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(255,255,255,0.08)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0.03)"/>
    </linearGradient>
    <filter id="blur">
      <feGaussianBlur stdDeviation="60"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Decorative circles -->
  <circle cx="1100" cy="80" r="200" fill="#1E40AF" opacity="0.15" filter="url(#blur)"/>
  <circle cx="100" cy="550" r="180" fill="#0D6EFD" opacity="0.1" filter="url(#blur)"/>

  <!-- Left accent bar -->
  <rect x="0" y="0" width="6" height="630" fill="${priorityColor}"/>

  <!-- Top brand bar -->
  <rect x="0" y="0" width="1200" height="80" fill="rgba(255,255,255,0.04)"/>

  <!-- SVV PAY logo text -->
  <text x="60" y="52" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="28" fill="white">SVV</text>
  <text x="108" y="52" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="28" fill="#3B82F6">'PAY</text>

  <!-- Developer Issue Hub -->
  <text x="1140" y="38" font-family="Arial, sans-serif" font-weight="700" font-size="16" fill="white" text-anchor="end">Developer Issue Hub</text>
  <text x="1140" y="60" font-family="Arial, sans-serif" font-size="13" fill="#93C5FD" text-anchor="end">Track • Collaborate • Resolve</text>

  <!-- Ticket code badge -->
  <rect x="60" y="115" width="220" height="40" rx="8" fill="#1E3A8A"/>
  <text x="170" y="141" font-family="Arial, sans-serif" font-weight="700" font-size="20" fill="#60A5FA" text-anchor="middle">${shortTitle}</text>

  <!-- Main title -->
  <text x="60" y="215" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="42" fill="white">${shortSub}</text>

  <!-- Priority badge -->
  <rect x="60" y="258" width="${shortPriority.length * 10 + 80}" height="38" rx="19" fill="${priorityColor}22"/>
  <rect x="60" y="258" width="${shortPriority.length * 10 + 80}" height="38" rx="19" fill="none" stroke="${priorityColor}" stroke-width="1.5"/>
  <text x="${60 + (shortPriority.length * 10 + 80) / 2}" y="282" font-family="Arial, sans-serif" font-weight="700" font-size="16" fill="${priorityColor}" text-anchor="middle">${shortPriority} Priority</text>

  <!-- Status badge -->
  <rect x="${60 + shortPriority.length * 10 + 95}" y="258" width="${shortStatus.length * 9 + 40}" height="38" rx="19" fill="#0D6EFD22"/>
  <rect x="${60 + shortPriority.length * 10 + 95}" y="258" width="${shortStatus.length * 9 + 40}" height="38" rx="19" fill="none" stroke="#3B82F6" stroke-width="1.5"/>
  <text x="${60 + shortPriority.length * 10 + 95 + (shortStatus.length * 9 + 40) / 2}" y="282" font-family="Arial, sans-serif" font-weight="700" font-size="16" fill="#60A5FA" text-anchor="middle">${shortStatus}</text>

  <!-- Category badge -->
  <rect x="${60 + shortPriority.length * 10 + shortStatus.length * 9 + 155}" y="258" width="${shortCat.length * 9 + 40}" height="38" rx="19" fill="#7C3AED22"/>
  <rect x="${60 + shortPriority.length * 10 + shortStatus.length * 9 + 155}" y="258" width="${shortCat.length * 9 + 40}" height="38" rx="19" fill="none" stroke="#8B5CF6" stroke-width="1.5"/>
  <text x="${60 + shortPriority.length * 10 + shortStatus.length * 9 + 155 + (shortCat.length * 9 + 40) / 2}" y="282" font-family="Arial, sans-serif" font-weight="700" font-size="16" fill="#A78BFA" text-anchor="middle">${shortCat}</text>

  <!-- Divider -->
  <line x1="60" y1="328" x2="1140" y2="328" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>

  <!-- Bottom section: View Full Ticket button style -->
  <rect x="60" y="355" width="320" height="56" rx="12" fill="#0D6EFD"/>
  <text x="220" y="389" font-family="Arial, sans-serif" font-weight="700" font-size="20" fill="white" text-anchor="middle">🔗  View Full Ticket</text>

  <!-- Domain -->
  <text x="60" y="450" font-family="Arial, sans-serif" font-size="15" fill="rgba(255,255,255,0.4)">svvdigitalhub-svv.vercel.app</text>

  <!-- Bottom footer -->
  <rect x="0" y="590" width="1200" height="40" fill="rgba(0,0,0,0.3)"/>
  <text x="60" y="616" font-family="Arial, sans-serif" font-size="14" fill="rgba(255,255,255,0.5)">Better Tracking  •  Faster Solutions  •  Stronger Collaboration</text>
  <text x="1140" y="616" font-family="Arial, sans-serif" font-size="14" fill="rgba(255,255,255,0.5)" text-anchor="end">SVV DevHub</text>
</svg>`;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
  res.status(200).send(svg);
}
