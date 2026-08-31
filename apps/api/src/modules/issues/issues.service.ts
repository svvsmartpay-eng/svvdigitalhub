import prisma from '../../config/database';
import { AppError } from '../../middleware/error.middleware';
import { createAuditLog } from '../../lib/auditLog';
import { generateIssueNo } from '../../lib/idGenerator';
import { IssueStatus, IssuePriority } from '@prisma/client';
import { sendEmail, issueNotificationEmail } from '../../lib/email';
import { env } from '../../config/env';

// Valid state transitions
const VALID_TRANSITIONS: Record<IssueStatus, IssueStatus[]> = {
  OPEN: ['REVIEWED', 'WORK_ORDER_CREATED', 'ASSIGNED', 'SCHEDULED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'CANCELLED'],
  REVIEWED: ['WORK_ORDER_CREATED', 'ASSIGNED', 'SCHEDULED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'CANCELLED', 'OPEN'],
  WORK_ORDER_CREATED: ['ASSIGNED', 'SCHEDULED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'CANCELLED', 'OPEN'],
  ASSIGNED: ['SCHEDULED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'CANCELLED', 'OPEN'],
  SCHEDULED: ['IN_PROGRESS', 'RESOLVED', 'CLOSED', 'CANCELLED', 'OPEN'],
  IN_PROGRESS: ['WAITING_FOR_PARTS', 'WAITING_FOR_APPROVAL', 'RESOLVED', 'CLOSED', 'CANCELLED', 'OPEN', 'ASSIGNED'],
  WAITING_FOR_PARTS: ['IN_PROGRESS', 'RESOLVED', 'CLOSED', 'CANCELLED', 'OPEN'],
  WAITING_FOR_APPROVAL: ['IN_PROGRESS', 'RESOLVED', 'CLOSED', 'CANCELLED', 'OPEN'],
  RESOLVED: ['CLOSED', 'VERIFIED', 'IN_PROGRESS', 'OPEN', 'CANCELLED'],
  VERIFIED: ['CLOSED', 'IN_PROGRESS', 'OPEN', 'CANCELLED'],
  CLOSED: ['OPEN', 'IN_PROGRESS', 'RESOLVED'],
  CANCELLED: ['OPEN', 'IN_PROGRESS'],
};

// SLA minutes by priority
const SLA_MINUTES: Record<IssuePriority, number> = {
  CRITICAL: 240,  // 4 hours
  HIGH: 240,      // 4 hours
  MEDIUM: 1440,   // 1 day
  LOW: 4320,      // 3 days
};

// ─── Responsibility & Workflow Engine Helpers ───────────────────────────────

export function enrichIssueResponsibility(issue: any, currentUserId?: string, currentUserRole?: string) {
  const status = issue.status;
  const assignedTo = issue.assignedTo;
  const raisedBy = issue.raisedBy;
  const lastComment = issue.IssueComment && issue.IssueComment.length > 0 ? issue.IssueComment[issue.IssueComment.length - 1] : undefined;

  // 1. Pending With (Who has the ball)
  let pendingWithName = 'Unassigned';
  let pendingWithRole = 'MANAGER';
  let pendingWithCategory: 'STAFF' | 'MANAGER' | 'TECHNICIAN' | 'ADMIN' | 'NONE' = 'MANAGER';
  let pendingWithUserId: string | null = null;

  if (status === 'CLOSED' || status === 'CANCELLED') {
    pendingWithName = 'None';
    pendingWithRole = 'NONE';
    pendingWithCategory = 'NONE';
  } else if (status === 'RESOLVED') {
    pendingWithName = raisedBy?.name || 'Staff (Reporter)';
    pendingWithRole = 'STAFF';
    pendingWithCategory = 'STAFF';
    pendingWithUserId = issue.raisedById;
  } else if (status === 'ESCALATED') {
    pendingWithName = 'Senior Administration';
    pendingWithRole = 'ADMIN';
    pendingWithCategory = 'ADMIN';
  } else if (status === 'WAITING_FOR_PARTS') {
    pendingWithName = 'Branch Manager (Procurement)';
    pendingWithRole = 'MANAGER';
    pendingWithCategory = 'MANAGER';
  } else if (status === 'ASSIGNED' || status === 'IN_PROGRESS' || (status === 'OPEN' && issue.assignedToId)) {
    pendingWithName = assignedTo?.name || 'Assigned Technician';
    pendingWithRole = 'TECHNICIAN';
    pendingWithCategory = 'TECHNICIAN';
    pendingWithUserId = issue.assignedToId;
  } else {
    // OPEN without assignee
    pendingWithName = 'Branch Manager';
    pendingWithRole = 'MANAGER';
    pendingWithCategory = 'MANAGER';
  }

  // 2. Next Action Required
  let nextAction = '';
  if (status === 'OPEN' && !issue.assignedToId) {
    nextAction = 'Branch Manager must assign a technician';
  } else if (status === 'ASSIGNED') {
    nextAction = `Technician (${assignedTo?.name || 'Tech'}) must accept & start diagnosis`;
  } else if (status === 'IN_PROGRESS') {
    nextAction = `Technician (${assignedTo?.name || 'Tech'}) must complete service & submit report`;
  } else if (status === 'WAITING_FOR_PARTS') {
    nextAction = 'Procure requested spare parts to resume repair';
  } else if (status === 'RESOLVED') {
    nextAction = `Reporter (${raisedBy?.name || 'Staff'}) must verify resolution & close`;
  } else if (status === 'ESCALATED') {
    nextAction = 'Management review & direct intervention required';
  } else if (status === 'CLOSED') {
    nextAction = 'Ticket completed and archived';
  } else {
    nextAction = 'Follow up with active participants';
  }

  // 3. Waiting Since & Duration
  const waitingSince = lastComment?.createdAt || issue.updatedAt || issue.createdAt;
  const waitingDurationMs = Math.max(0, Date.now() - new Date(waitingSince).getTime());

  // 4. Last Reply By
  let lastReply = null;
  if (lastComment) {
    lastReply = {
      name: lastComment.user?.name || 'Participant',
      role: lastComment.user?.userRoles?.[0]?.role?.type || 'STAFF',
      createdAt: lastComment.createdAt,
      content: lastComment.content?.length > 80 ? lastComment.content.slice(0, 80) + '...' : lastComment.content,
      isCreator: lastComment.userId === issue.raisedById,
    };
  } else {
    lastReply = {
      name: raisedBy?.name || 'Staff',
      role: 'STAFF',
      createdAt: issue.createdAt,
      content: issue.description?.length > 80 ? issue.description.slice(0, 80) + '...' : issue.description,
      isCreator: true,
    };
  }

  // 5. Requires My Action (boolean)
  let requiresMyAction = false;
  if (currentUserId && currentUserRole) {
    if (status === 'CLOSED' || status === 'CANCELLED') {
      requiresMyAction = false;
    } else if (status === 'OPEN' && !issue.assignedToId) {
      requiresMyAction = ['ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'].includes(currentUserRole);
    } else if (status === 'ASSIGNED' || status === 'IN_PROGRESS') {
      requiresMyAction = currentUserId === issue.assignedToId;
    } else if (status === 'RESOLVED') {
      requiresMyAction = currentUserId === issue.raisedById || ['ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'].includes(currentUserRole);
    } else if (status === 'ESCALATED') {
      requiresMyAction = ['ADMIN', 'SUPER_ADMIN'].includes(currentUserRole);
    }
  }

  return {
    ...issue,
    pendingWith: {
      name: pendingWithName,
      role: pendingWithRole,
      category: pendingWithCategory,
      userId: pendingWithUserId,
    },
    nextActionRequired: nextAction,
    waitingSince,
    waitingDurationMs,
    lastReply,
    requiresMyAction,
  };
}

export async function sendTicketNotification(params: {
  orgId: string;
  issueId: string;
  actorId: string;
  actorName: string;
  type: 'COMMENT' | 'STATUS' | 'ASSIGN' | 'SERVICE_REPORT';
  details?: string;
}) {
  try {
    const issue = await prisma.issue.findUnique({
      where: { id: params.issueId },
      include: { raisedBy: true, assignedTo: true },
    });
    if (!issue) return;

    const recipientIds = new Set<string>();

    // 1. Notify Creator (Staff) whenever anyone else makes any change / reply
    if (issue.raisedById && issue.raisedById !== params.actorId) {
      recipientIds.add(issue.raisedById);
    }

    // 2. Notify Assigned Technician if anyone else makes a change / reply
    if (issue.assignedToId && issue.assignedToId !== params.actorId) {
      recipientIds.add(issue.assignedToId);
    }

    // 3. If Creator or Tech replied, notify Branch Manager and Admins
    if (params.actorId === issue.raisedById || params.actorId === issue.assignedToId || params.type === 'SERVICE_REPORT') {
      const managers = await prisma.user.findMany({
        where: {
          organizationId: params.orgId,
          userRoles: { some: { role: { type: { in: ['BRANCH_MANAGER', 'ADMIN', 'SUPER_ADMIN'] } } } },
        },
        select: { id: true },
      });
      managers.forEach(m => {
        if (m.id !== params.actorId) recipientIds.add(m.id);
      });
    }

    let title = '';
    let body = '';

    if (params.type === 'COMMENT') {
      title = `💬 New Reply on #${issue.issueNo}`;
      body = `${params.actorName} replied: "${(params.details || '').slice(0, 100)}${(params.details || '').length > 100 ? '...' : ''}"`;
    } else if (params.type === 'STATUS') {
      title = `⚡ Status Updated: #${issue.issueNo}`;
      body = `${params.actorName} changed ticket status to ${params.details}`;
    } else if (params.type === 'ASSIGN') {
      title = `👤 Ticket Assigned: #${issue.issueNo}`;
      body = `You were assigned to resolve ticket #${issue.issueNo} (${issue.title})`;
    } else if (params.type === 'SERVICE_REPORT') {
      title = `🛠️ Field Service Update: #${issue.issueNo}`;
      body = `${params.actorName} submitted a work update & checklist on #${issue.issueNo}`;
    }

    if (recipientIds.size > 0) {
      await prisma.notification.createMany({
        data: Array.from(recipientIds).map(userId => ({
          userId,
          type: 'ISSUE_UPDATED',
          channel: 'IN_APP',
          title,
          message: body,
          referenceType: 'issue',
          referenceId: issue.id,
        })),
      });
    }
  } catch (err) {
    console.error('Failed to dispatch in-app notification:', err);
  }
}

export async function listIssues(orgId: string, params: any, currentUserId?: string, currentUserRole?: string) {
  const page = params.page || 1;
  const limit = Math.min(params.limit || 20, 100);
  const skip = (page - 1) * limit;
  const where: any = { organizationId: orgId };
  if (params.branchId) where.branchId = params.branchId;
  if (params.status) {
    if (params.status === 'IN_PROGRESS') {
      where.status = { in: ['IN_PROGRESS', 'ASSIGNED', 'SCHEDULED', 'WAITING_FOR_PARTS', 'WAITING_FOR_APPROVAL'] };
    } else if (params.status === 'OPEN') {
      where.status = { in: ['OPEN', 'REVIEWED'] };
    } else if (params.status.includes(',')) {
      where.status = { in: params.status.split(',').map((s: string) => s.trim()) };
    } else {
      where.status = params.status;
    }
  }
  if (params.priority) where.priority = params.priority;
  if (params.assetId) where.assetId = params.assetId;
  if (params.issueType) where.issueType = { contains: params.issueType, mode: 'insensitive' };
  if (params.search) {
    where.OR = [
      { issueNo: { contains: params.search, mode: 'insensitive' } },
      { title: { contains: params.search, mode: 'insensitive' } },
      { description: { contains: params.search, mode: 'insensitive' } },
      { asset: { name: { contains: params.search, mode: 'insensitive' } } },
    ];
  }
  if (params.sla === 'breached' || params.overdue === 'true' || params.isOverdue === 'true') {
    where.slaResolutionDue = { lt: new Date() };
    where.status = { notIn: ['CLOSED', 'CANCELLED'] };
  }
  if (params.dateFrom || params.dateTo) {
    where.createdAt = {};
    if (params.dateFrom) where.createdAt.gte = new Date(params.dateFrom);
    if (params.dateTo) where.createdAt.lte = new Date(params.dateTo);
  }

  if (params.assignedToId) where.assignedToId = params.assignedToId;
  if (params.raisedById) where.raisedById = params.raisedById;

  const [rawIssues, total] = await Promise.all([
    prisma.issue.findMany({
      where, skip, take: limit,
      include: {
        branch: { select: { code: true, name: true } },
        asset: { select: { assetId: true, name: true } },
        raisedBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        workOrders: { select: { id: true, workOrderNo: true, status: true }, take: 1 },
        IssueComment: {
          select: {
            id: true, content: true, createdAt: true, userId: true, attachments: true,
            user: {
              select: {
                id: true,
                name: true,
                userRoles: { include: { role: { select: { type: true, name: true } } } },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
          take: 10,
        },
        _count: { select: { IssueComment: true } },
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    }),
    prisma.issue.count({ where }),
  ]);

  const data = rawIssues.map(issue => enrichIssueResponsibility(issue, currentUserId, currentUserRole));

  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function getIssue(id: string, currentUserId?: string, currentUserRole?: string) {
  const issue = await prisma.issue.findFirst({
    where: { OR: [{ id }, { issueNo: id }] },
    include: {
      branch: true,
      asset: { include: { category: true } },
      raisedBy: {
        select: {
          id: true, name: true, email: true,
          userRoles: { include: { role: { select: { type: true } } } },
        },
      },
      assignedTo: {
        select: {
          id: true, name: true, email: true,
          userRoles: { include: { role: { select: { type: true } } } },
        },
      },
      workOrders: { include: { assignments: { include: { technician: true } } } },
      statusHistory: { orderBy: { changedAt: 'asc' } },
      IssueComment: {
        orderBy: { createdAt: 'asc' },
        include: {
          user: {
            select: {
              id: true, name: true,
              userRoles: { include: { role: { select: { type: true } } } },
            },
          },
        },
      },
    },
  });
  if (!issue) throw new AppError(404, 'Issue not found');

  // Derive primaryRole (first role's type) for each user
  const deriveRole = (u: any) => {
    if (!u) return null;
    const role = u.userRoles?.[0]?.role?.type || 'STAFF';
    const { userRoles: _r, ...rest } = u;
    return { ...rest, primaryRole: role };
  };

  const processed = {
    ...issue,
    raisedBy: deriveRole(issue.raisedBy),
    assignedTo: deriveRole(issue.assignedTo),
    IssueComment: issue.IssueComment.map((c: any) => ({
      ...c,
      user: deriveRole(c.user),
    })),
  };

  return enrichIssueResponsibility(processed, currentUserId, currentUserRole);
}

export async function addIssueComment(issueId: string, userId: string, content: string, attachments: string[]) {
  const issue = await prisma.issue.findUnique({ where: { id: issueId } });
  if (!issue) throw new AppError(404, 'Issue not found');

  const actor = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, organizationId: true } });

  const comment = await prisma.issueComment.create({
    data: {
      issueId,
      userId,
      content,
      attachments,
    }
  });

  // Dispatch in-app notifications
  if (actor) {
    await sendTicketNotification({
      orgId: actor.organizationId,
      issueId,
      actorId: userId,
      actorName: actor.name || 'Participant',
      type: 'COMMENT',
      details: content,
    });
  }

  return comment;
}

export async function raiseIssue(orgId: string, data: any, actorId: string, actorName: string) {
  const issueNo = await generateIssueNo();

  const priority: IssuePriority = data.priority || 'MEDIUM';
  const slaMins = SLA_MINUTES[priority];
  const slaResolutionDue = new Date(Date.now() + slaMins * 60 * 1000);
  const slaResponseDue = new Date(Date.now() + Math.min(slaMins / 2, 120) * 60 * 1000);

  const issue = await prisma.issue.create({
    data: {
      issueNo, organizationId: orgId, branchId: data.branchId, assetId: data.assetId,
      raisedById: actorId, title: data.title, description: data.description,
      issueType: data.issueType || 'General', priority,
      criticality: data.criticality || 'MEDIUM',
      status: 'OPEN', immediateAction: data.immediateAction,
      photos: data.photos || [],
      slaResponseDue, slaResolutionDue,
      downtimeStartAt: data.isBreakdown ? new Date() : undefined,
      targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
    },
    include: { asset: true, branch: true, raisedBy: { select: { name: true } } },
  });

  // Log status history
  await prisma.issueStatusHistory.create({
    data: { issueId: issue.id, toStatus: 'OPEN', changedBy: actorId, note: 'Issue raised' },
  });

  // Update asset status if breakdown
  if (data.isBreakdown) {
    await prisma.asset.update({ where: { id: data.assetId }, data: { status: 'BREAKDOWN' } });
  }

  await createAuditLog({ organizationId: orgId, userId: actorId, action: 'CREATE', resource: 'issue', resourceId: issue.id, resourceNo: issueNo, branchId: data.branchId, newValues: { title: data.title, priority, assetId: data.assetId } });

  // Send notification email
  try {
    const asset = await prisma.asset.findUnique({ where: { id: data.assetId }, include: { branch: true } });
    await sendEmail({
      to: `admin@svvcommunication.in`,
      subject: `[${priority}] New Issue: ${issueNo} – ${data.title}`,
      html: issueNotificationEmail({
        issueNo, assetName: asset?.name || 'Unknown', branchCode: asset?.branch?.code || '',
        priority, raisedBy: actorName, description: data.description,
        dashboardUrl: `http://localhost:5173/issues/${issue.id}`,
      }),
    });
  } catch { /* non-fatal */ }

  return issue;
}

export interface IssueCostPayload {
  serviceCharge?: number;
  partsCost?: number;
  travelCost?: number;
  otherCost?: number;
  partsUsed?: Array<{ name: string; quantity: number; cost?: number }>;
  invoiceNumber?: string;
  vendorId?: string;
}

export async function updateIssueStatus(
  issueId: string,
  newStatus: IssueStatus,
  actorId: string,
  orgId: string,
  note?: string,
  costs?: IssueCostPayload
) {
  const issue = await prisma.issue.findUnique({ where: { id: issueId }, include: { asset: true } });
  if (!issue) throw new AppError(404, 'Issue not found');

  const validNext = VALID_TRANSITIONS[issue.status] || [];
  if (!validNext.includes(newStatus)) {
    throw new AppError(400, `Cannot transition from ${issue.status} to ${newStatus}`);
  }

  const now = new Date();
  const updateData: any = { status: newStatus };

  if (newStatus === 'RESOLVED') {
    updateData.resolvedAt = issue.resolvedAt || now;
    updateData.downtimeEndAt = issue.downtimeEndAt || now;
  }
  if (newStatus === 'VERIFIED') updateData.verifiedAt = now;
  if (newStatus === 'CLOSED') {
    updateData.closedAt = now;
    if (!issue.resolvedAt) updateData.resolvedAt = now;
    // Restore asset to operational if asset exists
    if (issue.assetId) {
      await prisma.asset.update({ where: { id: issue.assetId }, data: { status: 'OPERATIONAL', lastMaintenanceAt: now } }).catch(() => {});
    }
  }
  if (newStatus === 'OPEN' || newStatus === 'IN_PROGRESS') {
    if (issue.status === 'CLOSED') {
      updateData.closedAt = null;
    }
  }
  if (newStatus === 'IN_PROGRESS' && !issue.assignedAt) updateData.assignedAt = now;

  // Check SLA breach
  if (newStatus === 'RESOLVED' || newStatus === 'CLOSED') {
    if (issue.slaResolutionDue && now > issue.slaResolutionDue) {
      updateData.slaResolutionBreached = true;
    }
  }

  const updated = await prisma.issue.update({ where: { id: issueId }, data: updateData });

  // Record cost entries if cost breakdown provided
  if (costs && issue.assetId) {
    const costEntriesToCreate: any[] = [];
    const invoiceNumber = costs.invoiceNumber || `INV-${issue.issueNo}`;

    if (costs.serviceCharge && Number(costs.serviceCharge) > 0) {
      costEntriesToCreate.push({
        organizationId: orgId,
        branchId: issue.branchId,
        assetId: issue.assetId,
        categoryType: 'labour',
        description: `Technician service charge for ticket #${issue.issueNo}: ${issue.title}`,
        amount: Number(costs.serviceCharge),
        invoiceNumber,
        vendorId: costs.vendorId,
        recordedBy: actorId,
        recordedAt: now,
      });
    }

    if (costs.partsCost && Number(costs.partsCost) > 0) {
      const partsDesc = costs.partsUsed && costs.partsUsed.length > 0
        ? `Parts: ${costs.partsUsed.map(p => `${p.name} (x${p.quantity})`).join(', ')}`
        : `Replacement spare parts for ticket #${issue.issueNo}`;
      costEntriesToCreate.push({
        organizationId: orgId,
        branchId: issue.branchId,
        assetId: issue.assetId,
        categoryType: 'parts',
        description: partsDesc,
        amount: Number(costs.partsCost),
        invoiceNumber,
        vendorId: costs.vendorId,
        recordedBy: actorId,
        recordedAt: now,
      });
    }

    if (costs.travelCost && Number(costs.travelCost) > 0) {
      costEntriesToCreate.push({
        organizationId: orgId,
        branchId: issue.branchId,
        assetId: issue.assetId,
        categoryType: 'travel',
        description: `Conveyance & travel expenses for ticket #${issue.issueNo}`,
        amount: Number(costs.travelCost),
        invoiceNumber,
        recordedBy: actorId,
        recordedAt: now,
      });
    }

    if (costs.otherCost && Number(costs.otherCost) > 0) {
      costEntriesToCreate.push({
        organizationId: orgId,
        branchId: issue.branchId,
        assetId: issue.assetId,
        categoryType: 'other',
        description: `Incidental & other maintenance costs for ticket #${issue.issueNo}`,
        amount: Number(costs.otherCost),
        invoiceNumber,
        recordedBy: actorId,
        recordedAt: now,
      });
    }

    if (costEntriesToCreate.length > 0) {
      await prisma.costEntry.createMany({ data: costEntriesToCreate });
    }

    // Trigger Asset Health Score Recalculation
    try {
      const { calculateAssetHealth } = await import('../assets/assets.service');
      await calculateAssetHealth(issue.assetId);
    } catch { /* non-fatal */ }
  }

  await prisma.issueStatusHistory.create({
    data: { issueId, fromStatus: issue.status, toStatus: newStatus, changedBy: actorId, note: note || `Status changed to ${newStatus}` },
  });

  await createAuditLog({
    organizationId: orgId, userId: actorId, action: 'STATUS_CHANGE', resource: 'issue',
    resourceId: issueId, resourceNo: issue.issueNo, oldValues: { status: issue.status }, newValues: { status: newStatus, note, costs },
  });

  // Dispatch in-app notification to all interested participants
  const actor = await prisma.user.findUnique({ where: { id: actorId }, select: { name: true } });
  await sendTicketNotification({
    orgId,
    issueId,
    actorId,
    actorName: actor?.name || 'Authorized User',
    type: 'STATUS',
    details: newStatus,
  });

  return updated;
}

export async function assignIssue(issueId: string, assignedToId: string, actorId: string, orgId: string) {
  const issue = await prisma.issue.findUnique({ where: { id: issueId } });
  if (!issue) throw new AppError(404, 'Issue not found');

  const updated = await prisma.issue.update({
    where: { id: issueId },
    data: { assignedToId, assignedAt: new Date(), status: issue.status === 'OPEN' || issue.status === 'REVIEWED' ? 'ASSIGNED' : issue.status },
  });

  await createAuditLog({ organizationId: orgId, userId: actorId, action: 'ASSIGN', resource: 'issue', resourceId: issueId, resourceNo: issue.issueNo, newValues: { assignedToId } });

  const actor = await prisma.user.findUnique({ where: { id: actorId }, select: { name: true } });
  await sendTicketNotification({
    orgId,
    issueId,
    actorId,
    actorName: actor?.name || 'Manager',
    type: 'ASSIGN',
  });

  return updated;
}

export async function getIssueStats(orgId: string, branchId?: string, currentUserId?: string, currentUserRole?: string) {
  const where: any = { organizationId: orgId };
  if (branchId) where.branchId = branchId;

  const [total, open, inProgress, resolved, closed, overdueSLA, byPriority, byStatus, allActiveIssues] = await Promise.all([
    prisma.issue.count({ where }),
    prisma.issue.count({ where: { ...where, status: { in: ['OPEN', 'REVIEWED'] } } }),
    prisma.issue.count({ where: { ...where, status: { in: ['IN_PROGRESS', 'ASSIGNED', 'SCHEDULED', 'WAITING_FOR_PARTS', 'WAITING_FOR_APPROVAL'] } } }),
    prisma.issue.count({ where: { ...where, status: { in: ['RESOLVED', 'VERIFIED'] } } }),
    prisma.issue.count({ where: { ...where, status: 'CLOSED' } }),
    prisma.issue.count({ where: { ...where, slaResolutionDue: { lt: new Date() }, status: { notIn: ['CLOSED', 'CANCELLED'] } } }),
    prisma.issue.groupBy({ by: ['priority'], where, _count: true }),
    prisma.issue.groupBy({ by: ['status'], where, _count: true }),
    prisma.issue.findMany({
      where: { ...where, status: { notIn: ['CLOSED', 'CANCELLED'] } },
      select: { id: true, status: true, raisedById: true, assignedToId: true },
    }),
  ]);

  // Compute how many tickets require action from the current user
  let requiresMyAction = 0;
  if (currentUserId && currentUserRole) {
    requiresMyAction = allActiveIssues.filter(i => {
      if (i.status === 'OPEN' && !i.assignedToId) return ['ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'].includes(currentUserRole);
      if (i.status === 'ASSIGNED' || i.status === 'IN_PROGRESS') return currentUserId === i.assignedToId;
      if (i.status === 'RESOLVED') return currentUserId === i.raisedById || ['ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'].includes(currentUserRole);
      return false;
    }).length;
  }

  return { total, open, inProgress, resolved, closed, overdueSLA, byPriority, byStatus, requiresMyAction };
}

export async function bulkAssignIssues(issueIds: string[], assignedToId: string, actorId: string, orgId: string) {
  const results = [];
  for (const id of issueIds) {
    try {
      const res = await assignIssue(id, assignedToId, actorId, orgId);
      results.push(res);
    } catch { /* skip non-assignable */ }
  }
  return results;
}

export async function bulkUpdateIssueStatus(issueIds: string[], status: IssueStatus, actorId: string, orgId: string, note?: string) {
  const results = [];
  for (const id of issueIds) {
    try {
      const res = await updateIssueStatus(id, status, actorId, orgId, note);
      results.push(res);
    } catch { /* skip invalid transitions */ }
  }
  return results;
}

