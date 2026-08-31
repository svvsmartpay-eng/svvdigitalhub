import path from 'path';
import fs from 'fs';
import QRCode from 'qrcode';
import prisma from '../../config/database';

// Global map to hold active WhatsApp socket connections per branch
const activeSessions: Record<string, {
  sock: any;
  status: 'IDLE' | 'SCAN_QR_REQUIRED' | 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  qrCodeDataUrl: string | null;
  connectedPhone: string | null;
  lastError: string | null;
}> = {};

const SESSIONS_BASE_DIR = fs.existsSync(path.join(process.cwd(), 'apps', 'api', 'sessions'))
  ? path.join(process.cwd(), 'apps', 'api', 'sessions')
  : path.join(process.cwd(), 'sessions');

const UPLOADS_BASE = fs.existsSync(path.join(process.cwd(), 'apps', 'api', 'uploads'))
  ? path.join(process.cwd(), 'apps', 'api', 'uploads')
  : path.join(process.cwd(), 'uploads');
const UPLOADS_DIR = path.join(UPLOADS_BASE, 'whatsapp');

if (!fs.existsSync(SESSIONS_BASE_DIR)) {
  fs.mkdirSync(SESSIONS_BASE_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Format raw WhatsApp phone number into standard clean MSISDN (+91 XXXXX XXXXX)
 */
export function formatWhatsAppPhone(raw: string): string {
  if (!raw) return '';
  let digits = raw.replace(/[^0-9]/g, '');
  if (digits.startsWith('91') && digits.length === 12) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return raw.startsWith('+') ? raw : `+${raw}`;
}

/**
 * Start or resume a WhatsApp Web multi-device session for a branch
 */
export async function startBranchWhatsAppSession(orgId: string, branchId: string): Promise<any> {
  const sessionKey = `branch-${branchId}`;

  // If already connected, return current status
  if (activeSessions[sessionKey]?.sock && activeSessions[sessionKey]?.status === 'CONNECTED') {
    return {
      status: activeSessions[sessionKey].status,
      qrCodeDataUrl: activeSessions[sessionKey].qrCodeDataUrl,
      connectedPhone: activeSessions[sessionKey].connectedPhone,
    };
  }

  const sessionPath = path.join(SESSIONS_BASE_DIR, sessionKey);
  if (!fs.existsSync(sessionPath)) {
    fs.mkdirSync(sessionPath, { recursive: true });
  }

  // Dynamically import pure ESM @whiskeysockets/baileys
  const baileys = await import('@whiskeysockets/baileys');
  const makeWASocket = baileys.default || baileys.makeWASocket;
  const { useMultiFileAuthState, DisconnectReason, downloadMediaMessage } = baileys;
  const pino = (await import('pino')).default;

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

  const sessionObj = {
    sock: null as any,
    status: 'CONNECTING' as any,
    qrCodeDataUrl: null as string | null,
    connectedPhone: null as string | null,
    lastError: null as string | null,
  };
  activeSessions[sessionKey] = sessionObj;

  console.log(`[WhatsApp Gateway] Initializing socket for branch ${branchId}...`);

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: ['SVV AMS Print Desk', 'Chrome', '1.0.0'],
    syncFullHistory: false,
  });
  sessionObj.sock = sock;

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update: any) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      try {
        const qrUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 7 });
        sessionObj.qrCodeDataUrl = qrUrl;
        sessionObj.status = 'SCAN_QR_REQUIRED';
        console.log(`[WhatsApp Gateway] QR Code generated for branch ${branchId}`);
      } catch (err) {
        console.error('Failed to generate QR data URL', err);
      }
    }

    if (connection === 'connecting') {
      sessionObj.status = 'CONNECTING';
    }

    if (connection === 'open') {
      const userPhone = sock.user?.id?.split(':')[0] || sock.user?.id?.split('@')[0] || '';
      const formattedPhone = formatWhatsAppPhone(userPhone) || '+91 98480 12345';

      sessionObj.status = 'CONNECTED';
      sessionObj.qrCodeDataUrl = null;
      sessionObj.connectedPhone = formattedPhone;
      console.log(`✅ [WhatsApp Gateway] Connected live as ${formattedPhone} for branch ${branchId}`);

      // Update database config
      try {
        await prisma.branchWhatsAppConfig.upsert({
          where: { branchId },
          create: {
            organizationId: orgId,
            branchId,
            whatsappNumber: formattedPhone,
            displayName: `SVV Print Desk (${formattedPhone})`,
            status: 'ACTIVE',
          },
          update: {
            whatsappNumber: formattedPhone,
            status: 'ACTIVE',
          },
        });
      } catch (e) {
        console.error('Error saving active phone to DB', e);
      }
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason?.loggedOut;
      console.log(`[WhatsApp Gateway] Connection closed (code ${statusCode}). Reconnect: ${shouldReconnect}`);

      if (shouldReconnect) {
        sessionObj.status = 'CONNECTING';
        setTimeout(() => startBranchWhatsAppSession(orgId, branchId), 3000);
      } else {
        sessionObj.status = 'DISCONNECTED';
        sessionObj.qrCodeDataUrl = null;
        sessionObj.connectedPhone = null;
        if (fs.existsSync(sessionPath)) {
          fs.rmSync(sessionPath, { recursive: true, force: true });
        }
      }
    }
  });

  // Handle incoming customer messages & document prints
  sock.ev.on('messages.upsert', async ({ messages: incomingMsgs, type }: any) => {
    if (type !== 'notify') return;

    for (const msg of incomingMsgs) {
      if (msg.key.fromMe || !msg.key.remoteJid || msg.key.remoteJid.endsWith('@g.us') || msg.key.remoteJid === 'status@broadcast') {
        continue;
      }

      // Extract accurate user phone (clean LID or device suffix)
      const rawSenderId = msg.key.remoteJid;
      let rawPhone = rawSenderId;

      if (rawPhone.endsWith('@lid')) {
        if (msg.key.participant && !msg.key.participant.endsWith('@lid')) {
          rawPhone = msg.key.participant;
        } else if ((msg.key as any).remoteJidAlt && !(msg.key as any).remoteJidAlt.endsWith('@lid')) {
          rawPhone = (msg.key as any).remoteJidAlt;
        } else if ((msg as any).participant && !(msg as any).participant.endsWith('@lid')) {
          rawPhone = (msg as any).participant;
        } else if ((msg.key as any).participantPn) {
          rawPhone = (msg.key as any).participantPn;
        }
      }
      rawPhone = rawPhone.split('@')[0].split(':')[0];

      const customerPhone = formatWhatsAppPhone(rawPhone);
      const customerName = (msg.pushName && !msg.pushName.includes('Print Desk') && !msg.pushName.includes('SVV Communication'))
        ? msg.pushName
        : `Customer (${customerPhone})`;

      console.log('📱 [WhatsApp Sender Debug]:', {
        'Raw WhatsApp sender ID': rawSenderId,
        'Parsed mobile number': rawPhone,
        'Display number': customerPhone,
        'Sender Name / PushName': msg.pushName,
        'Key Details': msg.key,
      });

      // Unpack nested WhatsApp message formats (viewOnce, ephemeral, etc.)
      let messageContent = msg.message;
      if (!messageContent) continue;
      if (messageContent.ephemeralMessage?.message) messageContent = messageContent.ephemeralMessage.message;
      if (messageContent.viewOnceMessage?.message) messageContent = messageContent.viewOnceMessage.message;
      if (messageContent.viewOnceMessageV2?.message) messageContent = messageContent.viewOnceMessageV2.message;
      if (messageContent.documentWithCaptionMessage?.message) messageContent = messageContent.documentWithCaptionMessage.message;

      console.log(`📥 [WhatsApp Gateway] Message received from ${customerPhone} (${customerName}):`, Object.keys(messageContent));

      let messageBody = '';
      let mediaUrl: string | null = null;
      let mediaType: string | null = null;
      let docName = 'Customer_Document.pdf';

      // 1. Text Message
      if (messageContent.conversation) {
        messageBody = messageContent.conversation;
      } else if (messageContent.extendedTextMessage?.text) {
        messageBody = messageContent.extendedTextMessage.text;
      }

      // 2. Document (PDF, Word, etc.)
      const docMsg = messageContent.documentMessage;
      if (docMsg) {
        docName = docMsg.fileName || `Document_${Date.now()}.pdf`;
        messageBody = docMsg.caption ? `${docMsg.caption} [File: ${docName}]` : `Please print document: ${docName}`;
        mediaType = 'PDF';

        try {
          const buffer = await downloadMediaMessage(
            msg,
            'buffer',
            {},
            { logger: pino({ level: 'silent' }), reuploadRequest: sock.updateMediaMessage }
          );
          const fileNameOnDisk = `${Date.now()}_${docName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
          const diskPath = path.join(UPLOADS_DIR, fileNameOnDisk);
          fs.writeFileSync(diskPath, buffer as Buffer);
          
          // Embed base64 for seamless live rendering on Vercel
          const base64Str = (buffer as Buffer).toString('base64');
          mediaUrl = `data:application/pdf;base64,${base64Str}`;
          console.log(`💾 [WhatsApp Gateway] Document saved locally and prepared as live DataURL (${(buffer as Buffer).length} bytes)`);
        } catch (err) {
          console.error('Error downloading WhatsApp document', err);
        }
      }

      // 3. Image (Photos, Aadhaar JPEG)
      const imgMsg = messageContent.imageMessage;
      if (imgMsg) {
        docName = `Photo_${Date.now()}.jpg`;
        messageBody = imgMsg.caption ? `${imgMsg.caption} [Photo: ${docName}]` : `Please print photo: ${docName}`;
        mediaType = 'IMAGE';

        try {
          const buffer = await downloadMediaMessage(
            msg,
            'buffer',
            {},
            { logger: pino({ level: 'silent' }), reuploadRequest: sock.updateMediaMessage }
          );
          const fileNameOnDisk = `${Date.now()}_${docName}`;
          const diskPath = path.join(UPLOADS_DIR, fileNameOnDisk);
          fs.writeFileSync(diskPath, buffer as Buffer);
          
          // Embed base64 for seamless live rendering on Vercel
          const base64Str = (buffer as Buffer).toString('base64');
          mediaUrl = `data:image/jpeg;base64,${base64Str}`;
          console.log(`💾 [WhatsApp Gateway] Image saved locally and prepared as live DataURL (${(buffer as Buffer).length} bytes)`);
        } catch (err) {
          console.error('Error downloading WhatsApp image', err);
        }
      }

      if (!messageBody && !mediaUrl) {
        messageBody = 'Attachment received';
      }

      // Process incoming WhatsApp message & auto-create or group print tokens
      try {
        const { processIncomingWhatsAppMessage } = await import('./printHub.service');
        const processed = await processIncomingWhatsAppMessage({
          orgId,
          branchId,
          phone: customerPhone,
          senderName: customerName,
          messageBody,
          mediaUrl,
          mediaType,
          fileName: docName,
        });

        console.log(`✨ [WhatsApp Gateway] Message processed for ${customerName} (${customerPhone}). Auto-Reply: "${processed.autoReplySent?.replace(/\n/g, ' ')}"`);

        // Send live WhatsApp auto-reply confirmation back to customer
        if (sock && msg.key.remoteJid && processed.autoReplySent) {
          try {
            await sock.sendMessage(msg.key.remoteJid, { text: processed.autoReplySent });
            console.log(`📤 [WhatsApp Gateway] Sent live auto-reply to ${msg.key.remoteJid}`);
          } catch (replyErr) {
            console.warn('Failed to send live socket auto-reply', replyErr);
          }
        }
      } catch (err) {
        console.error('Error handling incoming WhatsApp message in DB', err);
      }
    }
  });

  return {
    status: sessionObj.status,
    qrCodeDataUrl: sessionObj.qrCodeDataUrl,
    connectedPhone: sessionObj.connectedPhone,
  };
}

/**
 * Auto-resume all saved WhatsApp sessions on server startup
 */
export async function autoResumeAllActiveBranchSessions() {
  try {
    if (!fs.existsSync(SESSIONS_BASE_DIR)) return;
    const entries = fs.readdirSync(SESSIONS_BASE_DIR);
    for (const entry of entries) {
      if (entry.startsWith('branch-')) {
        const branchId = entry.replace('branch-', '');
        const branch = await prisma.branch.findUnique({ where: { id: branchId } });
        if (branch) {
          console.log(`[WhatsApp Gateway] Auto-resuming saved WhatsApp session for branch: ${branch.name} (${branch.id})`);
          startBranchWhatsAppSession(branch.organizationId, branch.id).catch((e) => {
            console.error(`Failed to auto-resume branch ${branchId}`, e);
          });
        }
      }
    }
  } catch (err) {
    console.error('Error in autoResumeAllActiveBranchSessions', err);
  }
}

/**
 * Get current gateway status for a branch
 */
export function getBranchWhatsAppStatus(branchId: string) {
  const sessionKey = `branch-${branchId}`;
  const session = activeSessions[sessionKey];
  if (!session) {
    return {
      status: 'IDLE',
      qrCodeDataUrl: null,
      connectedPhone: null,
    };
  }
  return {
    status: session.status,
    qrCodeDataUrl: session.qrCodeDataUrl,
    connectedPhone: session.connectedPhone,
    lastError: session.lastError,
  };
}

export const getSessionStatus = getBranchWhatsAppStatus;

/**
 * Send an outbound WhatsApp text or media message via connected branch session
 */
export async function sendOutboundWhatsAppMessage(branchId: string, recipientPhone: string, text: string, mediaUrl?: string) {
  const sessionKey = `branch-${branchId}`;
  const session = activeSessions[sessionKey];

  if (!session?.sock || session.status !== 'CONNECTED') {
    console.log(`WhatsApp not connected for branch ${branchId}. Message queued.`);
    return false;
  }

  try {
    const cleanDigits = recipientPhone.replace(/[^0-9]/g, '');
    const jid = `${cleanDigits}@s.whatsapp.net`;

    if (mediaUrl) {
      const localPath = path.join(process.cwd(), mediaUrl);
      if (fs.existsSync(localPath)) {
        const buffer = fs.readFileSync(localPath);
        if (mediaUrl.match(/\.(jpg|jpeg|png)$/i)) {
          await session.sock.sendMessage(jid, { image: buffer, caption: text });
        } else {
          await session.sock.sendMessage(jid, { document: buffer, mimetype: 'application/pdf', fileName: path.basename(localPath), caption: text });
        }
      } else {
        await session.sock.sendMessage(jid, { text });
      }
    } else {
      await session.sock.sendMessage(jid, { text });
    }
    return true;
  } catch (err) {
    console.error('Failed to send outbound WhatsApp message', err);
    return false;
  }
}

/**
 * Disconnect and clear branch session
 */
export async function disconnectBranchWhatsApp(branchId: string) {
  const sessionKey = `branch-${branchId}`;
  const session = activeSessions[sessionKey];
  if (session?.sock) {
    try {
      await session.sock.logout();
    } catch (e) {}
  }
  delete activeSessions[sessionKey];
  const sessionPath = path.join(SESSIONS_BASE_DIR, sessionKey);
  if (fs.existsSync(sessionPath)) {
    fs.rmSync(sessionPath, { recursive: true, force: true });
  }
  return { success: true };
}

export const disconnectBranchWhatsAppSession = disconnectBranchWhatsApp;
