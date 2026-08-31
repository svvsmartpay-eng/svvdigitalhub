import { Router, Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { authenticate, AuthRequest } from '../../middleware/auth.middleware';
import { requireMinRole } from '../../middleware/rbac.middleware';
import * as svc from './printHub.service';

const router = Router();

// ─── PUBLIC WHATSAPP WEBHOOKS (No JWT Authentication) ──────────────────────────

// 1. Meta Cloud API Webhook Verification Challenge
router.get('/whatsapp/webhook', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'SVV_WHATSAPP_TOKEN';

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ [Meta Webhook] Webhook verified successfully!');
      return res.status(200).send(challenge);
    }
    return res.status(403).json({ error: 'Verification token mismatch' });
  }
  res.status(400).json({ error: 'Invalid verification request' });
});

// 2. Meta Cloud API Incoming Messages Webhook
router.post('/whatsapp/webhook', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (body.object === 'whatsapp_business_account' || body.entry) {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          const value = change.value;
          if (value && value.messages) {
            for (const msg of value.messages) {
              const fromPhone = msg.from;
              const contact = value.contacts?.find((c: any) => c.wa_id === fromPhone);
              const senderName = contact?.profile?.name || msg.pushName || '';

              let messageBody = '';
              let mediaUrl: string | null = null;
              let mediaType: string | null = null;
              let fileName: string | null = null;

              if (msg.type === 'text') {
                messageBody = msg.text?.body || '';
              } else if (msg.type === 'image') {
                mediaType = 'IMAGE';
                mediaUrl = msg.image?.link || msg.image?.url || `/uploads/whatsapp/${msg.id}.jpg`;
                fileName = `Image_${msg.id}.jpg`;
                messageBody = msg.image?.caption || `Please print photo: ${fileName}`;
              } else if (msg.type === 'document') {
                mediaType = 'PDF';
                mediaUrl = msg.document?.link || msg.document?.url || `/uploads/whatsapp/${msg.id}.pdf`;
                fileName = msg.document?.filename || `Document_${msg.id}.pdf`;
                messageBody = msg.document?.caption || `Please print document: ${fileName}`;
              }

              await svc.processIncomingWhatsAppMessage({
                phone: fromPhone,
                senderName,
                messageBody,
                mediaUrl,
                mediaType,
                fileName,
              });
            }
          }
        }
      }
    }
    res.status(200).json({ status: 'ok', received: true });
  } catch (err: any) {
    console.error('Error handling Meta WhatsApp Webhook:', err);
    res.status(200).json({ status: 'error', message: err.message });
  }
});

// 3. Public Direct Incoming WhatsApp Message Receiver (For Baileys / Gateways / Testing)
router.post('/whatsapp/incoming', async (req: Request, res: Response) => {
  try {
    const { phone, senderName, messageBody, mediaUrl, mediaType, fileName, branchId, orgId } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, error: 'phone is required' });
    }

    const result = await svc.processIncomingWhatsAppMessage({
      orgId,
      branchId,
      phone,
      senderName,
      messageBody,
      mediaUrl,
      mediaType,
      fileName,
    });

    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    console.error('Error in /whatsapp/incoming:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── AUTHENTICATED ROUTES (Requires JWT) ───────────────────────────────────────
router.use(authenticate);

// Orders
router.get('/orders', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await svc.listPrintOrders(req.user!.orgId, {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 50,
      branchId: req.query.branchId as string,
      status: req.query.status as string,
      source: req.query.source as string,
      search: req.query.search as string,
      staffId: req.query.staffId as string,
    }, req.user!);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
});

router.post('/orders', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await svc.createPrintOrder(req.user!.orgId, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.patch('/orders/:id/status', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, staffId } = req.body;
    const data = await svc.updatePrintOrderStatus(req.user!.orgId, req.params.id, status, staffId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// WhatsApp Inbox
router.get('/whatsapp/inbox', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await svc.getWhatsAppInbox(req.user!.orgId, req.query.branchId as string);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/whatsapp/messages', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await svc.createWhatsAppMessage(req.user!.orgId, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/whatsapp/send-chat', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { branchId, phone, messageBody, orderId } = req.body;
    const data = await svc.sendStaffDirectChatMessage(req.user!.orgId, {
      branchId,
      phone,
      messageBody,
      orderId,
      staffName: (req.user as any)?.name || (req.user as any)?.email || 'SVV Print Desk',
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// Diagnostics endpoint for verifying file accessibility
router.get('/diagnostics/file', async (req: AuthRequest, res: Response) => {
  const fileUrl = req.query.url as string;
  if (!fileUrl) {
    return res.status(400).json({ error: 'url query parameter is required' });
  }
  const cleanPath = fileUrl.replace(/^(\/uploads|\/api\/v1\/uploads)/, '').replace(/^[\\/]/, '');
  const candidateDirs = [
    path.join(process.cwd(), 'apps', 'api', 'uploads'),
    path.join(process.cwd(), 'uploads'),
  ];
  let found = false;
  let resolvedPath = '';
  let size = 0;
  for (const dir of candidateDirs) {
    const p = path.join(dir, cleanPath);
    if (fs.existsSync(p)) {
      found = true;
      resolvedPath = p;
      size = fs.statSync(p).size;
      break;
    }
  }
  res.json({
    requestedUrl: fileUrl,
    exists: found,
    fileSize: size,
    absolutePath: resolvedPath,
    previewUrl: fileUrl.startsWith('http') ? fileUrl : `http://localhost:4000${fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`}`,
    httpStatus: found ? 200 : 404,
  });
});

// Tokens Board
router.get('/tokens/board', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await svc.getTokensBoard(req.user!.orgId, req.query.branchId as string);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// Advertisements
router.get('/ads', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await svc.listAdvertisements(req.user!.orgId, req.query.branchId as string);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/ads', requireMinRole('ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await svc.createAdvertisement(req.user!.orgId, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// Analytics & Dashboard Widgets
router.get('/analytics', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await svc.getPrintHubAnalytics(req.user!.orgId, req.query.branchId as string);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// Branch-Wise WhatsApp Number Activation & Bot Settings (Admin Only)
router.get('/whatsapp/configs', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await svc.getBranchWhatsAppConfigs(req.user!.orgId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.put('/whatsapp/configs/:branchId', requireMinRole('ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await svc.upsertBranchWhatsAppConfig(req.user!.orgId, req.params.branchId, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

import * as gateway from './whatsappGateway.service';

// Live WhatsApp Web Gateway (Baileys QR Scanner & Multi-Device Pairing)
router.post('/whatsapp/gateway/:branchId/start', requireMinRole('ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const status = await gateway.startBranchWhatsAppSession(req.user!.orgId, req.params.branchId);
    res.json({ success: true, data: status });
  } catch (err) {
    next(err);
  }
});

router.get('/whatsapp/gateway/:branchId/status', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const status = gateway.getSessionStatus(req.params.branchId);
    res.json({ success: true, data: status });
  } catch (err) {
    next(err);
  }
});

router.post('/whatsapp/gateway/:branchId/disconnect', requireMinRole('ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const status = await gateway.disconnectBranchWhatsAppSession(req.params.branchId);
    res.json({ success: true, data: status });
  } catch (err) {
    next(err);
  }
});

export default router;
