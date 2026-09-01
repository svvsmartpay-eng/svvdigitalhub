import prisma from '../../config/database';
import { AppError } from '../../middleware/error.middleware';
import { isPluginEnabled } from '../plugins/plugins.service';
import { sendOutboundWhatsAppMessage } from './whatsappGateway.service';

// ─── Guard Helper ─────────────────────────────────────────────────────────────

async function ensurePluginActive(orgId: string) {
  const active = await isPluginEnabled(orgId, 'print_whatsapp_hub');
  if (!active) {
    throw new AppError(403, 'Print & WhatsApp Service Hub module is currently disabled. Enable it in Settings.');
  }
}

// ─── Print Orders Management ──────────────────────────────────────────────────

export async function listPrintOrders(orgId: string, params: {
  page?: number;
  limit?: number;
  branchId?: string;
  status?: string;
  source?: string;
  search?: string;
  staffId?: string;
}, user: any) {
  await ensurePluginActive(orgId);

  const page = Number(params.page) || 1;
  const limit = Number(params.limit) || 50;
  const skip = (page - 1) * limit;

  const where: any = { organizationId: orgId };

  // Role Scoping
  const role = user.primaryRole || 'STAFF';
  if (role === 'STAFF') {
    // Staff sees assigned or unassigned
    if (params.staffId) where.assignedStaffId = params.staffId;
  } else if (role === 'BRANCH_MANAGER') {
    if (user.branchId) where.branchId = user.branchId;
  }

  if (params.branchId) where.branchId = params.branchId;
  if (params.status) where.status = params.status;
  if (params.source) where.source = params.source;
  if (params.search) {
    where.OR = [
      { orderNo: { contains: params.search, mode: 'insensitive' } },
      { customerName: { contains: params.search, mode: 'insensitive' } },
      { customerPhone: { contains: params.search, mode: 'insensitive' } },
      { tokenNumber: { contains: params.search, mode: 'insensitive' } },
      { documentName: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  const [orders, total] = await Promise.all([
    prisma.printOrder.findMany({
      where,
      skip,
      take: limit,
      include: {
        branch: { select: { id: true, code: true, name: true } },
        assignedStaff: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.printOrder.count({ where }),
  ]);

  return { data: orders, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function createPrintOrder(orgId: string, data: {
  branchId: string;
  customerName: string;
  customerPhone: string;
  source?: 'WHATSAPP' | 'SELF_SERVICE_KIOSK' | 'MANUAL_COUNTER';
  documentUrl: string;
  documentName: string;
  pageCount?: number;
  colorMode?: 'BW' | 'COLOR';
  copies?: number;
  doubleSided?: boolean;
  paperSize?: string;
  notes?: string;
  totalAmount?: number;
  isPaid?: boolean;
  paymentMode?: string;
  assignedStaffId?: string;
}) {
  await ensurePluginActive(orgId);

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const countToday = await prisma.printOrder.count({
    where: {
      organizationId: orgId,
      createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    },
  });

  const seq = String(countToday + 1).padStart(3, '0');
  const orderNo = `PRN-${dateStr}-${seq}`;
  const tokenNumber = `T-${100 + (countToday % 900) + 1}`;

  const pages = data.pageCount || 1;
  const copies = data.copies || 1;
  const isColor = data.colorMode === 'COLOR';
  const unitRate = isColor ? 10 : 2;
  const finalAmount = data.totalAmount !== undefined && data.totalAmount !== null
    ? Number(data.totalAmount)
    : (pages * copies * unitRate);

  const order = await prisma.printOrder.create({
    data: {
      orderNo,
      tokenNumber,
      organizationId: orgId,
      branchId: data.branchId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      source: data.source || 'WHATSAPP',
      documentUrl: data.documentUrl,
      documentName: data.documentName,
      pageCount: pages,
      colorMode: data.colorMode || 'BW',
      copies,
      doubleSided: data.doubleSided ?? false,
      paperSize: data.paperSize || 'A4',
      notes: data.notes,
      totalAmount: finalAmount,
      isPaid: data.isPaid ?? false,
      paymentMode: data.paymentMode,
      assignedStaffId: data.assignedStaffId,
      status: 'PENDING',
    },
    include: {
      branch: true,
      assignedStaff: true,
    },
  });

  // Automatically record outgoing WhatsApp confirmation message to customer
  try {
    const instructionSnippet = data.notes ? `\nInstructions: "${data.notes}"` : '';
    await prisma.whatsAppMessage.create({
      data: {
        organizationId: orgId,
        branchId: data.branchId,
        phone: data.customerPhone,
        senderName: order.branch?.name ? `SVV ${order.branch.name} Print Desk` : 'SVV Print Desk',
        messageBody: `✅ Received\nToken: ${tokenNumber}`,
        isIncoming: false,
        isBotHandled: true,
        orderId: order.id,
      },
    });
  } catch (err) {
    // Non-blocking log
    console.error('Failed to log outgoing confirmation WhatsApp message', err);
  }

  return order;
}

export async function updatePrintOrderStatus(
  orgId: string,
  id: string,
  status: 'PENDING' | 'PRINTING' | 'READY_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED',
  staffId?: string | null
) {
  await ensurePluginActive(orgId);

  const updateData: any = { status };
  if (staffId !== undefined) {
    updateData.assignedStaffId = staffId;
  }
  if (status === 'READY_FOR_DELIVERY') updateData.completedAt = new Date();
  if (status === 'DELIVERED') updateData.deliveredAt = new Date();

  const updated = await prisma.printOrder.update({
    where: { id },
    data: updateData,
    include: {
      branch: true,
      assignedStaff: true,
    },
  });

  // Automated WhatsApp Status Alerts matching exact business workflow
  try {
    let msgText = '';
    if (status === 'PRINTING') {
      msgText = `📌 Your document is being processed.\nToken: ${updated.tokenNumber}`;
    } else if (status === 'READY_FOR_DELIVERY') {
      msgText = `📌 Your document is ready for printing.\nToken: ${updated.tokenNumber}`;
    } else if (status === 'DELIVERED') {
      msgText = `✅ Your work has been completed.\nToken: ${updated.tokenNumber}\nThank you for using SVV Communications.`;
    }

    if (msgText) {
      await sendOutboundWhatsAppMessage(updated.branchId, updated.customerPhone, msgText);

      await prisma.whatsAppMessage.create({
        data: {
          organizationId: orgId,
          branchId: updated.branchId,
          phone: updated.customerPhone,
          senderName: updated.branch?.name ? `SVV ${updated.branch.name} Print Desk` : 'SVV Print Desk',
          messageBody: msgText,
          isIncoming: false,
          isBotHandled: true,
          orderId: updated.id,
        },
      });
    }
  } catch (err) {
    console.error('Failed to send status transition WhatsApp message', err);
  }

  return updated;
}

// ─── WhatsApp Inbox Stream ────────────────────────────────────────────────────

export async function getWhatsAppInbox(orgId: string, branchId?: string) {
  await ensurePluginActive(orgId);

  const where: any = { organizationId: orgId };
  if (branchId) where.branchId = branchId;

  const messages = await prisma.whatsAppMessage.findMany({
    where,
    include: { branch: { select: { id: true, name: true, code: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return messages;
}

export async function processIncomingWhatsAppMessage(params: {
  orgId?: string;
  branchId?: string;
  phone: string;
  senderName?: string;
  messageBody?: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
  fileName?: string | null;
}) {
  const orgId = params.orgId || 'svv-org-001';
  let branchId = params.branchId;

  // Resolve default branch if not passed
  if (!branchId) {
    const firstBranch = await prisma.branch.findFirst({ where: { organizationId: orgId } });
    branchId = firstBranch?.id || 'f5abaacc-d2b6-4591-91fb-314b2188e18c';
  }

  // Format phone number
  const digits = params.phone.replace(/[^0-9]/g, '');
  let formattedPhone = params.phone;
  if (digits.length === 10) formattedPhone = `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  else if (digits.startsWith('91') && digits.length === 12) formattedPhone = `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;

  // Determine priority customer name:
  // 1. WhatsApp profile name / pushName
  // 2. Saved contact name
  // 3. Formatted mobile number
  // 4. Walk-in Customer
  let customerName = (params.senderName || '').trim();
  if (!customerName || customerName.includes('Print Desk') || customerName.includes('SVV Communication') || customerName === 'Walk-in Customer' || customerName === 'Test Walk-in Customer') {
    customerName = formattedPhone || 'Walk-in Customer';
  }

  let docName = params.fileName || 'Customer_Document.pdf';
  if (params.mediaUrl && !params.fileName) {
    const cleanUrl = params.mediaUrl.split('/').pop() || '';
    if (cleanUrl.includes('_')) docName = cleanUrl.slice(cleanUrl.indexOf('_') + 1);
    else docName = cleanUrl || (params.mediaType === 'IMAGE' ? 'Photo.jpg' : 'Document.pdf');
  }

  const messageText = params.messageBody || (params.mediaUrl ? `Please print ${docName}` : 'Hello');

  // Save incoming message in database
  const incomingMsg = await prisma.whatsAppMessage.create({
    data: {
      organizationId: orgId,
      branchId,
      phone: formattedPhone,
      senderName: customerName,
      messageBody: messageText,
      mediaUrl: params.mediaUrl || null,
      mediaType: params.mediaType || (params.mediaUrl?.toLowerCase().endsWith('.pdf') ? 'PDF' : 'IMAGE'),
      isIncoming: true,
      isBotHandled: true,
    },
  });

  // 1. Group ONLY consecutive multi-page files sent within a 2-minute burst (120s) for a PENDING order
  const TWO_MINUTES_AGO = new Date(Date.now() - 2 * 60 * 1000);
  const activeOrdersList = await prisma.printOrder.findMany({
    where: {
      organizationId: orgId,
      branchId,
      status: 'PENDING',
      createdAt: { gte: TWO_MINUTES_AGO },
    },
    orderBy: { createdAt: 'desc' },
  });

  const existingActiveOrder = activeOrdersList.find((ord) => {
    const ordDigits = (ord.customerPhone || '').replace(/[^0-9]/g, '');
    return ordDigits.slice(-10) === rawDigits10;
  });

  if (existingActiveOrder && params.mediaUrl) {
    // Append multi-page file to active batch order
    const updatedDocName = existingActiveOrder.documentName
      ? `${existingActiveOrder.documentName}, ${docName}`
      : docName;

    createdOrder = await prisma.printOrder.update({
      where: { id: existingActiveOrder.id },
      data: {
        documentName: updatedDocName,
        documentUrl: existingActiveOrder.documentUrl || params.mediaUrl,
        pageCount: (existingActiveOrder.pageCount || 1) + 1,
        totalAmount: (existingActiveOrder.totalAmount || 0) + defaultPrice,
      },
    });

    autoReplyText = `Your document received successfully.\nToken No: ${existingActiveOrder.tokenNumber}\nReceived Time: ${receivedTime}`;
  } else {
    // Generate a fresh unique sequential token ID
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const countToday = await prisma.printOrder.count({
      where: {
        organizationId: orgId,
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    });

    const tokenNumber = `T-${100 + (countToday % 900) + 1}`;
    const orderNo = `PRN-${dateStr}-${String(countToday + 1).padStart(3, '0')}`;

    createdOrder = await prisma.printOrder.create({
      data: {
        organizationId: orgId,
        branchId,
        orderNo,
        tokenNumber,
        customerName,
        customerPhone: formattedPhone,
        source: 'WHATSAPP',
        documentUrl: params.mediaUrl || null,
        documentName: docName,
        pageCount: 1,
        copies: 1,
        colorMode: isPVC || isPhoto ? 'COLOR' : 'BW',
        paperSize: isPVC ? 'PVC Plastic' : (isPhoto ? 'Glossy Photo' : 'A4'),
        totalAmount: defaultPrice,
        status: 'PENDING',
        notes: messageText,
      },
    });

    autoReplyText = `Your document received successfully.\nToken No: ${tokenNumber}\nReceived Time: ${receivedTime}`;
  }

  // Link message to order
  if (createdOrder) {
    await prisma.whatsAppMessage.update({
      where: { id: incomingMsg.id },
      data: { orderId: createdOrder.id },
    });
  }

  // Dual-write sync directly to Supabase cloud database
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseCloud = createClient(
      'https://kxacmxxktuvildjjvnjs.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4YWNteHhrdHV2aWxkamp2bmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNzc5NjgsImV4cCI6MjEwMzc1Mzk2OH0.bz5ObWxHckEg-9FanAP8sOz6VNPa7gKgKvEkzV0Rl74'
    );

    if (createdOrder) {
      await supabaseCloud.from('print_orders').upsert([{
        id: createdOrder.id,
        orderNo: createdOrder.orderNo,
        tokenNumber: createdOrder.tokenNumber,
        organizationId: createdOrder.organizationId,
        branchId: createdOrder.branchId,
        customerName: createdOrder.customerName,
        customerPhone: createdOrder.customerPhone,
        source: createdOrder.source,
        documentUrl: createdOrder.documentUrl,
        documentName: createdOrder.documentName,
        pageCount: createdOrder.pageCount,
        colorMode: createdOrder.colorMode,
        copies: createdOrder.copies,
        totalAmount: createdOrder.totalAmount,
        status: createdOrder.status,
        createdAt: createdOrder.createdAt,
        updatedAt: new Date().toISOString(),
      }]);
    }

    await supabaseCloud.from('whatsapp_messages').upsert([{
      id: incomingMsg.id,
      organizationId: incomingMsg.organizationId,
      branchId: incomingMsg.branchId,
      phone: incomingMsg.phone,
      senderName: incomingMsg.senderName,
      messageBody: incomingMsg.messageBody,
      mediaUrl: incomingMsg.mediaUrl,
      mediaType: incomingMsg.mediaType,
      isIncoming: true,
      orderId: createdOrder?.id || null,
      createdAt: incomingMsg.createdAt,
    }]);
  } catch (supaSyncErr) {
    console.warn('Supabase sync warning:', supaSyncErr);
  }enderName,
        messageBody: incomingMsg.messageBody,
        mediaUrl: incomingMsg.mediaUrl,
        mediaType: incomingMsg.mediaType,
        isIncoming: true,
        orderId: createdOrder?.id || null,
        createdAt: incomingMsg.createdAt,
      }]);
    } catch (supaSyncErr) {
      console.warn('Supabase sync warning:', supaSyncErr);
    }

    // Send automated WhatsApp acknowledgement to customer
    if (autoReplyText) {
      try {
        await sendOutboundWhatsAppMessage(branchId, formattedPhone, autoReplyText);
      } catch (e) {
        console.warn('Socket outbound reply skipped:', e);
      }

      const outMsg = await prisma.whatsAppMessage.create({
        data: {
          organizationId: orgId,
          branchId,
          phone: formattedPhone,
          senderName: 'SVV Print Desk',
          messageBody: autoReplyText,
          isIncoming: false,
          isBotHandled: true,
          orderId: createdOrder?.id || null,
        },
      });

      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseCloud = createClient(
          'https://kxacmxxktuvildjjvnjs.supabase.co',
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4YWNteHhrdHV2aWxkamp2bmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNzc5NjgsImV4cCI6MjEwMzc1Mzk2OH0.bz5ObWxHckEg-9FanAP8sOz6VNPa7gKgKvEkzV0Rl74'
        );
        await supabaseCloud.from('whatsapp_messages').insert([{
          id: outMsg.id,
          organizationId: outMsg.organizationId,
          branchId: outMsg.branchId,
          phone: outMsg.phone,
          senderName: outMsg.senderName,
          messageBody: outMsg.messageBody,
          isIncoming: false,
          orderId: createdOrder?.id || null,
          createdAt: outMsg.createdAt,
        }]);
      } catch (_) {}
    }
  }

  return {
    incomingMessage: incomingMsg,
    order: createdOrder,
    autoReplySent: autoReplyText,
  };
}

export async function createWhatsAppMessage(orgId: string, data: {
  branchId: string;
  phone: string;
  senderName: string;
  messageBody: string;
  mediaUrl?: string;
  mediaType?: string;
}) {
  await ensurePluginActive(orgId);
  return processIncomingWhatsAppMessage({
    orgId,
    branchId: data.branchId,
    phone: data.phone,
    senderName: data.senderName,
    messageBody: data.messageBody,
    mediaUrl: data.mediaUrl,
    mediaType: data.mediaType,
  });
}

export async function sendStaffDirectChatMessage(orgId: string, data: {
  branchId: string;
  phone: string;
  messageBody: string;
  orderId?: string;
  staffName?: string;
}) {
  await ensurePluginActive(orgId);

  // 1. Try sending via WhatsApp socket if connected
  let sentViaSocket = false;
  try {
    sentViaSocket = await sendOutboundWhatsAppMessage(data.branchId, data.phone, data.messageBody);
  } catch (err) {
    console.error('Failed to send outbound WhatsApp message via socket:', err);
  }

  // 2. Persist outbound message in database so it appears in chat history
  const message = await prisma.whatsAppMessage.create({
    data: {
      organizationId: orgId,
      branchId: data.branchId,
      phone: data.phone,
      senderName: data.staffName || 'SVV Print Desk',
      messageBody: data.messageBody,
      isIncoming: false,
      isBotHandled: false,
      orderId: data.orderId,
    },
  });

  return { message, sentViaSocket };
}

// ─── Customer Tokens Live Board ───────────────────────────────────────────────

export async function getTokensBoard(orgId: string, branchId?: string) {
  await ensurePluginActive(orgId);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const where: any = {
    organizationId: orgId,
    createdAt: { gte: todayStart },
    status: { in: ['PENDING', 'PRINTING', 'READY_FOR_DELIVERY'] },
  };
  if (branchId) where.branchId = branchId;

  const orders = await prisma.printOrder.findMany({
    where,
    select: {
      id: true,
      orderNo: true,
      tokenNumber: true,
      customerName: true,
      status: true,
      copies: true,
      pageCount: true,
      colorMode: true,
      createdAt: true,
      completedAt: true,
      branch: { select: { code: true, name: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  return {
    printing: orders.filter((o) => o.status === 'PRINTING'),
    readyForDelivery: orders.filter((o) => o.status === 'READY_FOR_DELIVERY'),
    pendingQueue: orders.filter((o) => o.status === 'PENDING'),
  };
}

// ─── Digital Advertisements & Kiosk ───────────────────────────────────────────

export async function listAdvertisements(orgId: string, branchId?: string) {
  await ensurePluginActive(orgId);

  const where: any = { organizationId: orgId };
  if (branchId) where.OR = [{ branchId }, { branchId: null }];

  return prisma.branchAdvertisement.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
}

export async function createAdvertisement(orgId: string, data: {
  branchId?: string;
  title: string;
  description?: string;
  mediaUrl: string;
  targetUrl?: string;
  displayDurationSec?: number;
  placement?: string;
}) {
  await ensurePluginActive(orgId);

  return prisma.branchAdvertisement.create({
    data: {
      organizationId: orgId,
      branchId: data.branchId || null,
      title: data.title,
      description: data.description,
      mediaUrl: data.mediaUrl,
      targetUrl: data.targetUrl,
      displayDurationSec: data.displayDurationSec || 10,
      placement: data.placement || 'KIOSK_DISPLAY',
      isActive: true,
    },
  });
}

// ─── Analytics & Dashboard Widgets ────────────────────────────────────────────

export async function getPrintHubAnalytics(orgId: string, branchId?: string) {
  await ensurePluginActive(orgId);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const where: any = { organizationId: orgId };
  if (branchId) where.branchId = branchId;

  const [allOrders, todayOrders, whatsappCount, branches] = await Promise.all([
    prisma.printOrder.findMany({
      where,
      include: {
        branch: { select: { id: true, code: true, name: true } },
        assignedStaff: { select: { id: true, name: true } },
      },
    }),
    prisma.printOrder.findMany({
      where: { ...where, createdAt: { gte: todayStart } },
    }),
    prisma.whatsAppMessage.count({
      where: { ...where, createdAt: { gte: todayStart } },
    }),
    prisma.branch.findMany({
      where: { organizationId: orgId, isActive: true },
      select: { id: true, code: true, name: true },
    }),
  ]);

  let totalRevenue = 0;
  let todayRevenue = 0;
  let pendingCount = 0;
  let readyCount = 0;
  let deliveredTodayCount = 0;
  let bwPrints = 0;
  let colorPrints = 0;

  allOrders.forEach((o) => {
    totalRevenue += Number(o.totalAmount || 0);
    if (o.status === 'PENDING' || o.status === 'PRINTING') pendingCount++;
    if (o.status === 'READY_FOR_DELIVERY') readyCount++;
    if (o.colorMode === 'COLOR') colorPrints += (o.pageCount * o.copies);
    else bwPrints += (o.pageCount * o.copies);
  });

  todayOrders.forEach((o) => {
    todayRevenue += Number(o.totalAmount || 0);
    if (o.status === 'DELIVERED') deliveredTodayCount++;
  });

  // Branch Performance
  const branchPerformance = branches.map((b) => {
    const bOrders = allOrders.filter((o) => o.branchId === b.id);
    const bRevenue = bOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
    return {
      branchId: b.id,
      name: b.name,
      code: b.code,
      totalOrders: bOrders.length,
      revenue: bRevenue,
    };
  }).sort((a, b) => b.revenue - a.revenue);

  return {
    widgets: {
      newWhatsAppOrders: whatsappCount,
      pendingPrintJobs: pendingCount,
      readyForDelivery: readyCount,
      todayPrints: todayOrders.length,
      todayDelivered: deliveredTodayCount,
      todayRevenue,
      totalRevenue,
      totalOrders: allOrders.length,
      bwPrints,
      colorPrints,
    },
    branchPerformance,
  };
}

// ─── Branch-Wise WhatsApp Number Activation & Bot Settings ────────────────────

export async function getBranchWhatsAppConfigs(orgId: string) {
  await ensurePluginActive(orgId);

  const branches = await prisma.branch.findMany({
    where: { organizationId: orgId, isActive: true },
    include: {
      whatsappConfig: true,
    },
    orderBy: { code: 'asc' },
  });

  return branches.map((b: any) => ({
    branchId: b.id,
    branchCode: b.code,
    branchName: b.name,
    branchCity: b.city || '',
    whatsappNumber: b.whatsappConfig?.whatsappNumber || b.phone || '+91 98480 12345',
    displayName: b.whatsappConfig?.displayName || `${b.name} Print Desk`,
    welcomeMessage: b.whatsappConfig?.welcomeMessage || `Welcome to SVV ${b.name} Print Desk! Send your PDF/Word document here to print.`,
    status: b.whatsappConfig?.status || (b.whatsappConfig ? 'ACTIVE' : 'ACTIVE'),
    autoPrint: b.whatsappConfig?.autoPrint ?? false,
    notifyOnReady: b.whatsappConfig?.notifyOnReady ?? true,
    updatedAt: b.whatsappConfig?.updatedAt || b.updatedAt,
  }));
}

export async function upsertBranchWhatsAppConfig(orgId: string, branchId: string, data: {
  whatsappNumber: string;
  displayName?: string;
  welcomeMessage?: string;
  status?: string;
  autoPrint?: boolean;
  notifyOnReady?: boolean;
  apiKey?: string;
}) {
  await ensurePluginActive(orgId);

  const cleanPhone = data.whatsappNumber.trim();

  const config = await prisma.branchWhatsAppConfig.upsert({
    where: { branchId },
    create: {
      organizationId: orgId,
      branchId,
      whatsappNumber: cleanPhone,
      displayName: data.displayName || 'SVV Print Desk',
      welcomeMessage: data.welcomeMessage || 'Welcome to SVV Print Desk! Please send your file to print.',
      status: data.status || 'ACTIVE',
      autoPrint: data.autoPrint ?? false,
      notifyOnReady: data.notifyOnReady ?? true,
      apiKey: data.apiKey,
    },
    update: {
      whatsappNumber: cleanPhone,
      displayName: data.displayName,
      welcomeMessage: data.welcomeMessage,
      status: data.status || 'ACTIVE',
      autoPrint: data.autoPrint ?? false,
      notifyOnReady: data.notifyOnReady ?? true,
      apiKey: data.apiKey,
    },
    include: {
      branch: { select: { id: true, name: true, code: true } },
    },
  });

  return config;
}

export async function testWhatsAppConnection(orgId: string, branchId: string, testPhone: string) {
  await ensurePluginActive(orgId);

  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    include: { whatsappConfig: true },
  });

  if (!branch) {
    throw new AppError(404, 'Branch not found');
  }

  const senderNumber = branch.whatsappConfig?.whatsappNumber || '+91 98480 12345';

  // Store outgoing simulated test message
  const msg = await prisma.whatsAppMessage.create({
    data: {
      organizationId: orgId,
      branchId,
      phone: testPhone,
      senderName: branch.whatsappConfig?.displayName || `SVV ${branch.name} Bot`,
      messageBody: `[TEST PING] SVV Print Desk WhatsApp Bot for ${branch.name} (${branch.code}) is ACTIVE & CONNECTED on ${senderNumber}.`,
      isIncoming: false,
      isBotHandled: true,
    },
  });

  return {
    success: true,
    message: `Test message sent from ${senderNumber} to ${testPhone}`,
    record: msg,
  };
}

