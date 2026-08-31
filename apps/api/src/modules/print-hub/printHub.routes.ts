import { Router, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { authenticate, AuthRequest } from '../../middleware/auth.middleware';
import { requireMinRole } from '../../middleware/rbac.middleware';
import * as svc from './printHub.service';

const router = Router();
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
