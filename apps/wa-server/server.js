const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const QRCode = require('qrcode');
const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeInMemoryStore,
  downloadMediaMessage,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// ─── Config ─────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kxacmxxktuvildjjvnjs.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4YWNteHhrdHV2aWxkamp2bmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNzc5NjgsImV4cCI6MjEwMzc1Mzk2OH0.bz5ObWxHckEg-9FanAP8sOz6VNPa7gKgKvEkzV0Rl74';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const app = express();
const logger = pino({ level: 'info' }, pino.destination('./wa-server.log'));

app.use(cors({ origin: '*' }));
app.use(express.json());

// ─── In-memory store per branch ─────────────────────────────────────────────
// branchId → { sock, qrCode, status, store }
const sessions = new Map();
const AUTH_DIR = path.join(__dirname, 'auth_sessions');
if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });

// ─── Helper: Update status in Supabase ───────────────────────────────────────
async function updateBranchStatus(branchId, status, phoneNumber = null) {
  const now = new Date().toISOString();

  await supabase.from('whatsapp_sessions').upsert({
    branchId,
    phoneNumber: phoneNumber || 'unknown',
    sessionId: `session_${branchId}`,
    status,
    connectedAt: status === 'CONNECTED' ? now : undefined,
    lastSeen: now,
    updatedAt: now,
  }, { onConflict: 'branchId' });

  await supabase.from('branch_whatsapp_configs')
    .update({ status: status === 'CONNECTED' ? 'CONNECTED' : 'DISCONNECTED', updatedAt: now })
    .eq('branchId', branchId);
}

// ─── Helper: Unwrap Baileys nested messages ─────────────────────────────────
function unwrapMessage(msgObj) {
  if (!msgObj) return null;
  let inner = msgObj;
  for (let depth = 0; depth < 5; depth++) {
    if (!inner) break;
    if (inner.ephemeralMessage?.message) {
      inner = inner.ephemeralMessage.message;
    } else if (inner.viewOnceMessage?.message) {
      inner = inner.viewOnceMessage.message;
    } else if (inner.viewOnceMessageV2?.message) {
      inner = inner.viewOnceMessageV2.message;
    } else if (inner.viewOnceMessageV2Extension?.message) {
      inner = inner.viewOnceMessageV2Extension.message;
    } else if (inner.documentWithCaptionMessage?.message) {
      inner = inner.documentWithCaptionMessage.message;
    } else {
      break;
    }
  }
  return inner;
}

// ─── Helper: Format IST Date string (DD-MMM-YY) ──────────────────────────────
function getISTDateStr(date = new Date()) {
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const d = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const day = String(d.getDate()).padStart(2, '0');
  const mon = months[d.getMonth()];
  const yr = String(d.getFullYear()).slice(-2);
  return `${day}-${mon}-${yr}`;
}

// ─── Helper: Generate Smart Ticket Number (e.g., SVV1-02-MAR-26-T01) ─────────
async function generateSmartTicketNumber(branchId, branchCode = 'SVV1') {
  const dateStr = getISTDateStr();
  const cleanCode = (branchCode || 'SVV1').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const prefix = `${cleanCode}-${dateStr}-T`;

  // Count existing tickets with this prefix in print_orders
  const { count } = await supabase
    .from('print_orders')
    .select('id', { count: 'exact', head: true })
    .ilike('tokenNumber', `${prefix}%`);

  const nextSeq = (count || 0) + 1;
  const seqPadded = String(nextSeq).padStart(2, '0');
  return `${prefix}${seqPadded}`;
}

// ─── Standardized Customer Notifications (Strictly 4 Templates) ──────────────
const NOTIFICATION_TEMPLATES = {
  DOCUMENTS_RECEIVED: (ticketNo) =>
    `*SVV Communications*\n\nThank you! Your documents have been received.\n\n🎫 *Ticket No:* *${ticketNo}*\n\nWe will process and keep you updated.`,
  WAITING_FOR_CUSTOMER: (ticketNo) =>
    `*SVV Communications*\n\nWe need some additional information to proceed with your service.\n\n🎫 *Ticket No:* *${ticketNo}*\n\nPlease share the required details.`,
  SERVICE_COMPLETED: (ticketNo) =>
    `*SVV Communications*\n\nYour service work has been completed.\n\n🎫 *Ticket No:* *${ticketNo}*\n\nPlease confirm if you need any further changes.`,
  TICKET_CLOSED: (ticketNo) =>
    `*SVV Communications*\n\nYour ticket is now closed.\n\n🎫 *Ticket No:* *${ticketNo}*\n\nThank you for using SVV Communications. We look forward to serving you again!`,
};

async function sendCustomerNotification(branchId, phoneOrJid, type, ticketNo, customSock = null) {
  try {
    const session = sessions.get(branchId);
    const sock = customSock || session?.sock;
    if (!sock) {
      console.warn(`[Notification] No active WhatsApp session for branch ${branchId}`);
      return false;
    }

    const templateFn = NOTIFICATION_TEMPLATES[type];
    if (!templateFn) {
      console.warn(`[Notification] Unknown notification type: ${type}`);
      return false;
    }

    let targetJid = phoneOrJid;
    // If targetJid contains @lid or does not contain @, normalize to @s.whatsapp.net
    if (!targetJid.includes('@') || targetJid.endsWith('@lid')) {
      const cleanDigits = phoneOrJid.replace(/[^0-9]/g, '');
      const standardPhone = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;
      targetJid = `${standardPhone}@s.whatsapp.net`;
    }

    const messageText = templateFn(ticketNo);
    await sock.sendMessage(targetJid, { text: messageText });
    console.log(`💬 Notification [${type}] sent to ${targetJid} (Ticket: ${ticketNo})`);
    return true;
  } catch (err) {
    console.error(`Error sending notification [${type}]:`, err.message);
    return false;
  }
}

// ─── Helper: Create or Append to Print Order Ticket from WA Message ──────────
async function createTicketFromMessage(branchId, message, sock) {
  try {
    const jid = message.key.remoteJid;
    const from = jid ? jid.replace('@s.whatsapp.net', '').replace('@lid', '') : 'unknown';
    const now = new Date().toISOString();

    const rawMessage = message.message;
    if (!rawMessage) {
      console.log(`[WA] Empty message object received from ${from}`);
      return;
    }

    // Unwrap ephemeral, view-once, document-with-caption wrappers
    const unwrapped = unwrapMessage(rawMessage) || rawMessage;
    const msgKeys = Object.keys(unwrapped || {});
    console.log(`📩 Incoming message from ${from}. Content keys:`, msgKeys);

    let fileUrl = null;
    let fileName = `doc_${Date.now()}`;
    let notes = '';
    let msgType = 'unknown';

    // 1. Image
    if (unwrapped.imageMessage) {
      msgType = 'imageMessage';
      const img = unwrapped.imageMessage;
      notes = img.caption || 'Photo / Image';
      fileName = `photo_${Date.now()}.jpg`;
      try {
        const fakeMsg = { ...message, message: { imageMessage: img } };
        const buffer = await downloadMediaMessage(fakeMsg, 'buffer', {}, { logger, reuploadRequest: sock.updateMediaMessage });
        fileUrl = `data:image/jpeg;base64,${buffer.toString('base64')}`;
      } catch (e) {
        console.error('Media download error (image):', e.message);
        fileUrl = '/uploads/sample.pdf';
      }
    }
    // 2. Document (PDF, Word, Excel, etc.)
    else if (unwrapped.documentMessage) {
      msgType = 'documentMessage';
      const doc = unwrapped.documentMessage;
      notes = doc.title || doc.fileName || 'Document';
      // Preserve real fileName; never default to .pdf for Excel/Word files
      if (doc.fileName) {
        fileName = doc.fileName;
      } else {
        // Derive extension from MIME type when fileName is missing
        const mimeExtMap = {
          'application/pdf': 'pdf',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
          'application/vnd.ms-excel': 'xls',
          'text/csv': 'csv',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
          'application/msword': 'doc',
        };
        const docMime = doc.mimetype || 'application/pdf';
        const ext = mimeExtMap[docMime] || 'pdf';
        fileName = `doc_${Date.now()}.${ext}`;
      }
      const mime = doc.mimetype || 'application/pdf';
      try {
        const fakeMsg = { ...message, message: { documentMessage: doc } };
        const buffer = await downloadMediaMessage(fakeMsg, 'buffer', {}, { logger, reuploadRequest: sock.updateMediaMessage });
        fileUrl = `data:${mime};base64,${buffer.toString('base64')}`;
      } catch (e) {
        console.error('Document download error:', e.message);
        fileUrl = `/uploads/sample.${(fileName.split('.').pop() || 'pdf')}`;
      }
    }
    // 3. Plain text
    else if (unwrapped.conversation) {
      msgType = 'conversation';
      notes = unwrapped.conversation;
      fileName = 'Text_Message.txt';
    }
    // 4. Extended text (e.g. text with preview/formatting)
    else if (unwrapped.extendedTextMessage?.text) {
      msgType = 'extendedTextMessage';
      notes = unwrapped.extendedTextMessage.text;
      fileName = 'Text_Message.txt';
    }
    // 5. Check if any other key contains document or image
    else {
      for (const k of msgKeys) {
        if (k.toLowerCase().includes('document') && unwrapped[k]) {
          msgType = 'documentMessage';
          const d = unwrapped[k];
          notes = d.title || d.fileName || 'Document';
          fileName = d.fileName || `doc_${Date.now()}.pdf`;
          break;
        } else if (k.toLowerCase().includes('image') && unwrapped[k]) {
          msgType = 'imageMessage';
          notes = unwrapped[k].caption || 'Photo / Image';
          fileName = `photo_${Date.now()}.jpg`;
          break;
        }
      }

      if (msgType === 'unknown') {
        console.log(`ℹ️ Non-printable or metadata message from ${from} (keys: ${msgKeys.join(', ')}). Skipping ticket.`);
        return;
      }
    }

    console.log(`🎯 Processing ${msgType} for ticket workflow: "${fileName}"`);

    // Get branch org and branch code
    const { data: branchData } = await supabase
      .from('branches')
      .select('id, organizationId, name, code')
      .eq('id', branchId)
      .single();
    const orgId = branchData?.organizationId || 'svv-org-001';
    const branchCode = branchData?.code || 'SVV1';

    // Extract true customer phone number
    const senderPn = message.key?.senderPn || message.key?.participantPn || message.participantPn;
    let cleanPhone = senderPn ? senderPn.split('@')[0] : (jid.includes('@') ? jid.split('@')[0] : jid);
    
    if (jid.endsWith('@lid') && !senderPn) {
      if (message.key?.participant && !message.key.participant.endsWith('@lid')) {
        cleanPhone = message.key.participant.split('@')[0];
      }
    }
    const phoneFormatted = cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`;
    const rawDigits = phoneFormatted.replace(/[^0-9]/g, '');

    // Clean customer display name
    const rawPushName = message.pushName?.trim();
    const isBareEmoji = rawPushName && /^[\p{Emoji}\s]+$/u.test(rawPushName);
    const customerDisplayName = (rawPushName && !isBareEmoji) 
      ? rawPushName 
      : (cleanPhone.length >= 10 ? `Customer (+${cleanPhone.slice(-4)})` : 'WhatsApp Customer');

    const docExt = (fileName.split('.').pop() || '').toLowerCase();
    const docType = msgType === 'imageMessage' ? 'IMAGE'
      : ['xlsx', 'xls', 'csv'].includes(docExt) ? 'EXCEL'
      : ['docx', 'doc', 'rtf', 'odt'].includes(docExt) ? 'DOC'
      : docExt === 'pdf' ? 'PDF'
      : msgType === 'documentMessage' ? 'PDF'
      : 'TEXT';

    const inputDocObj = {
      id: crypto.randomUUID(),
      name: fileName,
      url: fileUrl || '/uploads/sample.pdf',
      type: docType,
      notes: notes,
      receivedAt: now
    };

    // ── PRINCIPLE: ONE CUSTOMER = ONE TICKET ─────────────────────────────────
    // Check if there is already an active (non-closed) ticket for this customer
    // created recently (within last 12 hours) so stale tickets don't hijack indefinitely
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
    const { data: existingTickets } = await supabase
      .from('print_orders')
      .select('*')
      .eq('branchId', branchId)
      .neq('status', 'DELIVERED')
      .neq('ticket_status', 'CLOSED')
      .gte('createdAt', twelveHoursAgo)
      .order('createdAt', { ascending: false })
      .limit(5);

    // Find ticket matching this customer's normalized phone
    const activeTicket = (existingTickets || []).find(t => {
      const tDigits = (t.customerPhone || '').replace(/[^0-9]/g, '');
      return tDigits.length >= 10 && rawDigits.length >= 10 && (tDigits.endsWith(rawDigits.slice(-10)) || rawDigits.endsWith(tDigits.slice(-10)));
    });

    // Compute standard customer JID for sending notifications
    const targetPhoneJid = rawDigits.length >= 10 
      ? `${rawDigits.length === 10 ? '91' + rawDigits : rawDigits}@s.whatsapp.net` 
      : jid;

    if (activeTicket) {
      // Customer has an existing open ticket! Append document to inputs without spawning new ticket.
      console.log(`📎 Appending input document to existing open ticket #${activeTicket.tokenNumber} for customer ${phoneFormatted}`);
      const updatedDocs = Array.isArray(activeTicket.input_documents) ? [...activeTicket.input_documents, inputDocObj] : [inputDocObj];

      await supabase.from('print_orders').update({
        input_documents: updatedDocs,
        // ✅ Update primary document fields so UI immediately shows the latest doc
        documentUrl: fileUrl || activeTicket.documentUrl,
        documentName: fileName || activeTicket.documentName,
        pageCount: 1,
        last_activity_at: now,
        updatedAt: now
      }).eq('id', activeTicket.id);

      console.log(`✅ Document "${fileName}" attached to ticket #${activeTicket.tokenNumber} (now ${updatedDocs.length} docs)`);
      
      // Send customer notification that their new document was received and attached to their ticket
      await sendCustomerNotification(branchId, targetPhoneJid, 'DOCUMENTS_RECEIVED', activeTicket.tokenNumber, sock);
      return;
    }

    // ── Generate Smart Ticket Number & Order Number ─────────────────────────
    const smartTicketNo = await generateSmartTicketNumber(branchId, branchCode);
    const dateStrDigits = new Date().toISOString().slice(0,10).replace(/-/g, '');
    const orderNo = `PRN-${dateStrDigits}-${Math.floor(1000 + Math.random() * 9000)}`;

    const insertPayload = {
      id: crypto.randomUUID(),
      orderNo: orderNo,
      organizationId: orgId,
      branchId: branchId,
      customerName: customerDisplayName,
      customerPhone: phoneFormatted,
      source: 'WHATSAPP',
      documentUrl: fileUrl || '/uploads/sample.pdf',
      documentName: fileName,
      pageCount: 1,
      colorMode: 'BW',
      copies: 1,
      doubleSided: false,
      paperSize: 'A4',
      notes: notes || 'Received via WhatsApp Auto-Desk',
      totalAmount: 10,
      isPaid: false,
      tokenNumber: smartTicketNo,
      ticket_code: smartTicketNo,
      status: 'PENDING',
      ticket_status: 'RECEIVED',
      received_at: now,
      last_activity_at: now,
      input_documents: [inputDocObj],
      createdAt: now,
      updatedAt: now,
    };

    // Insert print order
    const { data: newOrder, error } = await supabase.from('print_orders').insert(insertPayload).select().single();

    if (error) {
      console.error('❌ Failed to create ticket in DB:', error.message);
    } else {
      console.log(`✅ Ticket #${smartTicketNo} created in DB for branch ${branchId} from ${from} (${phoneFormatted})`);
      
      // Auto reply: Standard Notification 1: Documents Received
      await sendCustomerNotification(branchId, targetPhoneJid, 'DOCUMENTS_RECEIVED', smartTicketNo, sock);
    }
  } catch (err) {
    console.error('Error in createTicketFromMessage:', err);
  }
}

// ─── Connect/Create Baileys session ──────────────────────────────────────────
async function connectBranch(branchId) {
  const authDir = path.join(AUTH_DIR, branchId);
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    auth: state,
    printQRInTerminal: false,
    generateHighQualityLinkPreview: false,
    browser: ['SVV AMS', 'Chrome', '120.0.0'],
  });

  const session = { sock, qrCode: null, qrBase64: null, status: 'QR_PENDING' };
  sessions.set(branchId, session);

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      // New QR received
      session.qrCode = qr;
      session.qrBase64 = await QRCode.toDataURL(qr);
      session.status = 'QR_PENDING';
      console.log(`📱 QR Generated for branch ${branchId}`);
    }

    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode;
      session.status = 'DISCONNECTED';
      await updateBranchStatus(branchId, 'DISCONNECTED');

      // Reconnect if not logged out
      if (reason !== DisconnectReason.loggedOut) {
        console.log(`🔄 Reconnecting branch ${branchId}...`);
        setTimeout(() => connectBranch(branchId), 3000);
      } else {
        console.log(`🚪 Branch ${branchId} logged out.`);
        // Clean auth
        fs.rmSync(authDir, { recursive: true, force: true });
        sessions.delete(branchId);
      }
    }

    if (connection === 'open') {
      session.status = 'CONNECTED';
      session.qrCode = null;
      session.qrBase64 = null;
      const phone = sock.user?.id?.split(':')[0];
      console.log(`✅ WhatsApp CONNECTED for branch ${branchId} (${phone})`);
      await updateBranchStatus(branchId, 'CONNECTED', phone);
    }
  });

  // Incoming messages → create tickets
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (msg.key.fromMe) continue; // Skip our own messages
      if (msg.key.remoteJid && msg.key.remoteJid.endsWith('@g.us')) continue; // Skip group messages
      console.log(`📥 Upsert message received from ${msg.key.remoteJid}`);
      await createTicketFromMessage(branchId, msg, sock);
    }
  });

  return session;
}

// ─── API Routes ───────────────────────────────────────────────────────────────

// Health check
app.get('/health', (req, res) => res.json({ ok: true, sessions: sessions.size }));

// Get QR code for a branch
app.get('/api/wa/:branchId/qr', async (req, res) => {
  const { branchId } = req.params;
  let session = sessions.get(branchId);

  if (!session) {
    // Start new session
    session = await connectBranch(branchId);
  }

  // Wait up to 15 seconds for QR to be generated
  let waited = 0;
  while (!session.qrBase64 && session.status === 'QR_PENDING' && waited < 15000) {
    await new Promise(r => setTimeout(r, 500));
    waited += 500;
  }

  if (session.status === 'CONNECTED') {
    return res.json({ status: 'CONNECTED', qr: null });
  }

  if (!session.qrBase64) {
    return res.status(503).json({ error: 'QR not ready yet, retry in 3 seconds' });
  }

  res.json({
    status: 'QR_PENDING',
    qr: session.qrBase64,           // base64 PNG
    rawQr: session.qrCode,          // raw string for QRCodeSVG
  });
});

// Get status for a branch
app.get('/api/wa/:branchId/status', async (req, res) => {
  const { branchId } = req.params;
  const session = sessions.get(branchId);

  if (!session) {
    // Check if auth exists (previously connected)
    const authDir = path.join(AUTH_DIR, branchId);
    if (fs.existsSync(authDir) && fs.readdirSync(authDir).length > 0) {
      // Reconnect
      connectBranch(branchId);
      return res.json({ status: 'RECONNECTING' });
    }
    return res.json({ status: 'DISCONNECTED' });
  }

  res.json({ status: session.status });
});

// Disconnect a branch
app.post('/api/wa/:branchId/disconnect', async (req, res) => {
  const { branchId } = req.params;
  const session = sessions.get(branchId);

  if (session?.sock) {
    await session.sock.logout();
  }

  sessions.delete(branchId);
  await updateBranchStatus(branchId, 'DISCONNECTED');

  res.json({ ok: true });
});

// Start session (called from frontend when Scan QR button clicked)
app.post('/api/wa/:branchId/start', async (req, res) => {
  const { branchId } = req.params;

  if (!sessions.has(branchId)) {
    connectBranch(branchId); // Don't await — let it start in background
  }

  res.json({ status: 'STARTING', message: 'Session starting, poll /qr endpoint' });
});

// Send Standardized Customer Notification (DOCUMENTS_RECEIVED, WAITING_FOR_CUSTOMER, SERVICE_COMPLETED, TICKET_CLOSED)
app.post('/api/wa/:branchId/notify', async (req, res) => {
  const { branchId } = req.params;
  const { phone, type, ticketNo } = req.body;

  if (!phone || !type || !ticketNo) {
    return res.status(400).json({ error: 'phone, type, and ticketNo are required' });
  }

  const success = await sendCustomerNotification(branchId, phone, type, ticketNo);
  if (success) {
    res.json({ ok: true, message: `Notification ${type} sent to ${phone}` });
  } else {
    res.status(500).json({ error: 'Failed to send WhatsApp notification. Session may be disconnected.' });
  }
});

// ─── Auto-Start Existing Connected Sessions on Boot ───────────────────────────
async function autoStartSessions() {
  try {
    const entries = fs.readdirSync(AUTH_DIR, { withFileTypes: true });
    for (const ent of entries) {
      if (ent.isDirectory()) {
        const branchId = ent.name;
        const credsPath = path.join(AUTH_DIR, branchId, 'creds.json');
        if (fs.existsSync(credsPath)) {
          console.log(`🔌 Auto-connecting saved WhatsApp session for branch: ${branchId}`);
          await connectBranch(branchId);
        }
      }
    }
  } catch (e) {
    console.error('Error auto-starting sessions:', e.message);
  }
}

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`🚀 SVV AMS WhatsApp Server running on http://localhost:${PORT}`);
  console.log(`   Supabase: ${SUPABASE_URL}`);
  await autoStartSessions();
});
