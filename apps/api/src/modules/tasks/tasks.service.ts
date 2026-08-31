import prisma from '../../config/database';
import { AppError } from '../../middleware/error.middleware';
import { TaskPriority, TaskStatus } from '@prisma/client';
import { createAuditLog } from '../../lib/auditLog';

export interface TaskListParams {
  page?: number;
  limit?: number;
  search?: string;
  assignedToId?: string;
  assignedById?: string;
  branchId?: string;
  priority?: string;
  status?: string;
  filterType?: 'ALL' | 'MY_TASKS' | 'CREATED_BY_ME' | 'AWAITING_VERIFICATION' | 'OVERDUE' | 'DUE_TODAY';
}

export async function listTasks(
  orgId: string,
  params: TaskListParams,
  currentUserId?: string,
  currentUserRole?: string
) {
  const page = Number(params.page) || 1;
  const limit = Math.min(Number(params.limit) || 20, 100);
  const skip = (page - 1) * limit;

  const where: any = { organizationId: orgId };

  if (params.search) {
    where.OR = [
      { taskNo: { contains: params.search, mode: 'insensitive' } },
      { title: { contains: params.search, mode: 'insensitive' } },
      { description: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  if (params.branchId) where.branchId = params.branchId;
  if (params.priority) where.priority = params.priority as TaskPriority;
  if (params.status) where.status = params.status as TaskStatus;

  // Filter shortcuts
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  if (params.filterType === 'MY_TASKS' && currentUserId) {
    where.assignedToId = currentUserId;
  } else if (params.filterType === 'CREATED_BY_ME' && currentUserId) {
    where.assignedById = currentUserId;
  } else if (params.filterType === 'AWAITING_VERIFICATION') {
    where.status = 'COMPLETED';
  } else if (params.filterType === 'OVERDUE') {
    where.status = { notIn: ['CLOSED', 'CANCELLED', 'VERIFIED'] };
    where.dueDate = { lt: startOfToday };
  } else if (params.filterType === 'DUE_TODAY') {
    where.status = { notIn: ['CLOSED', 'CANCELLED', 'VERIFIED'] };
    where.dueDate = { gte: startOfToday, lte: endOfToday };
  }

  const [data, total] = await Promise.all([
    prisma.task.findMany({
      where,
      skip,
      take: limit,
      include: {
        assignedBy: { select: { id: true, name: true, email: true, designation: true } },
        assignedTo: { select: { id: true, name: true, email: true, designation: true } },
        verifiedBy: { select: { id: true, name: true } },
        branch: { select: { id: true, code: true, name: true } },
        _count: { select: { updates: true } },
      },
      orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
    }),
    prisma.task.count({ where }),
  ]);

  const tasksWithMeta = data.map((t) => {
    const dueDate = t.dueDate ? new Date(t.dueDate) : null;
    let dueStatus: 'OVERDUE' | 'DUE_TODAY' | 'ON_TIME' | 'COMPLETED' = 'ON_TIME';

    if (t.status === 'CLOSED' || t.status === 'VERIFIED' || t.status === 'COMPLETED') {
      dueStatus = 'COMPLETED';
    } else if (dueDate) {
      if (dueDate < startOfToday) dueStatus = 'OVERDUE';
      else if (dueDate <= endOfToday) dueStatus = 'DUE_TODAY';
    }

    let pendingWith = t.assignedTo?.name || 'Assignee';
    let nextActionRequired = 'Acknowledge & Accept task.';
    let requiresMyAction = false;

    if (t.status === 'CREATED') {
      pendingWith = t.assignedTo?.name || 'Assignee';
      nextActionRequired = 'Assignee must accept task to begin.';
      requiresMyAction = currentUserId === t.assignedToId;
    } else if (t.status === 'ACCEPTED') {
      pendingWith = t.assignedTo?.name || 'Assignee';
      nextActionRequired = 'Start work (Move to In Progress).';
      requiresMyAction = currentUserId === t.assignedToId;
    } else if (t.status === 'IN_PROGRESS') {
      pendingWith = t.assignedTo?.name || 'Assignee';
      nextActionRequired = 'Complete work & submit progress/photos.';
      requiresMyAction = currentUserId === t.assignedToId;
    } else if (t.status === 'COMPLETED') {
      pendingWith = t.assignedBy?.name || 'Manager / Assigner';
      nextActionRequired = 'Verify submitted completion proof & close task.';
      requiresMyAction = currentUserId === t.assignedById || ['ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'].includes(currentUserRole || '');
    } else if (t.status === 'VERIFIED') {
      pendingWith = 'None';
      nextActionRequired = 'Task verified. Ready for closure.';
      requiresMyAction = currentUserId === t.assignedById || ['ADMIN', 'SUPER_ADMIN'].includes(currentUserRole || '');
    } else if (t.status === 'CLOSED') {
      pendingWith = 'None';
      nextActionRequired = 'Task completed & closed.';
      requiresMyAction = false;
    }

    return {
      ...t,
      dueStatus,
      pendingWith,
      nextActionRequired,
      requiresMyAction,
      waitingSince: t.updatedAt,
    };
  });

  return {
    data: tasksWithMeta,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getTask(id: string) {
  const task = await prisma.task.findFirst({
    where: { OR: [{ id }, { taskNo: id }] },
    include: {
      assignedBy: { select: { id: true, name: true, email: true, designation: true } },
      assignedTo: { select: { id: true, name: true, email: true, designation: true } },
      verifiedBy: { select: { id: true, name: true, email: true } },
      branch: { select: { id: true, code: true, name: true } },
      updates: {
        orderBy: { createdAt: 'asc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!task) throw new AppError(404, 'Task not found');
  return task;
}

export async function createTask(orgId: string, data: any, creatorId: string) {
  if (!data.title?.trim()) throw new AppError(400, 'Task title is required');
  if (!data.assignedToId) throw new AppError(400, 'Assignee is required');

  const count = await prisma.task.count({ where: { organizationId: orgId } });
  const taskNo = `TSK-${String(count + 101).padStart(5, '0')}`;

  const task = await prisma.task.create({
    data: {
      taskNo,
      organizationId: orgId,
      branchId: data.branchId || undefined,
      title: data.title.trim(),
      description: data.description?.trim() || undefined,
      priority: (data.priority as TaskPriority) || 'MEDIUM',
      status: 'CREATED',
      assignedById: creatorId,
      assignedToId: data.assignedToId,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      attachments: Array.isArray(data.attachments) ? data.attachments : [],
      tags: Array.isArray(data.tags) ? data.tags : [],
    },
    include: {
      assignedBy: { select: { name: true } },
      assignedTo: { select: { name: true, email: true } },
    },
  });

  // Log initial creation update
  await prisma.taskUpdate.create({
    data: {
      taskId: task.id,
      userId: creatorId,
      content: `Task created and assigned to ${task.assignedTo?.name}. Priority: ${task.priority}`,
      statusTo: 'CREATED',
    },
  });

  // Dispatch In-App Notification to Assignee
  try {
    await prisma.notification.create({
      data: {
        userId: data.assignedToId,
        type: 'GENERAL',
        channel: 'IN_APP',
        title: `📋 New Task Assigned: #${taskNo}`,
        message: `${task.assignedBy?.name} assigned you a new task: "${task.title}". Priority: ${task.priority}`,
        referenceType: 'task',
        referenceId: task.id,
      },
    });
  } catch { /* non-fatal */ }

  await createAuditLog({
    organizationId: orgId,
    userId: creatorId,
    action: 'CREATE',
    resource: 'task',
    resourceId: task.id,
    resourceNo: taskNo,
    branchId: data.branchId,
    newValues: { taskNo, title: task.title, assignedTo: task.assignedTo?.name },
  });

  return task;
}

export async function updateTaskStatus(
  id: string,
  data: {
    status: TaskStatus;
    remarks?: string;
    attachments?: string[];
  },
  userId: string,
  userRole?: string
) {
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      assignedBy: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true } },
    },
  });
  if (!task) throw new AppError(404, 'Task not found');

  const oldStatus = task.status;
  const newStatus = data.status;

  const now = new Date();
  const updateData: any = { status: newStatus };

  if (newStatus === 'COMPLETED') {
    updateData.completedAt = now;
  } else if (newStatus === 'VERIFIED') {
    updateData.verifiedAt = now;
    updateData.verifiedById = userId;
    if (data.remarks) updateData.verificationNotes = data.remarks;
  } else if (newStatus === 'CLOSED') {
    updateData.closedAt = now;
  }

  const updatedTask = await prisma.task.update({
    where: { id },
    data: updateData,
  });

  // Create timeline update
  const actor = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  const remarksText = data.remarks?.trim() ? `\nRemarks: ${data.remarks.trim()}` : '';

  await prisma.taskUpdate.create({
    data: {
      taskId: id,
      userId,
      statusFrom: oldStatus,
      statusTo: newStatus,
      content: `${actor?.name || 'User'} moved task from ${oldStatus} ➔ ${newStatus}.${remarksText}`,
      attachments: data.attachments || [],
    },
  });

  // Notify counterpart
  const recipientId = userId === task.assignedToId ? task.assignedById : task.assignedToId;
  if (recipientId) {
    let notifTitle = `⚡ Task #${task.taskNo} Updated`;
    let notifMsg = `${actor?.name} changed status to ${newStatus}`;

    if (newStatus === 'COMPLETED') {
      notifTitle = `✅ Task #${task.taskNo} Completed (Verification Required)`;
      notifMsg = `${actor?.name} completed "${task.title}" and submitted for your verification.`;
    } else if (newStatus === 'VERIFIED' || newStatus === 'CLOSED') {
      notifTitle = `🎉 Task #${task.taskNo} Verified & Closed`;
      notifMsg = `${actor?.name} verified and approved completion for "${task.title}".`;
    }

    try {
      await prisma.notification.create({
        data: {
          userId: recipientId,
          type: 'GENERAL',
          channel: 'IN_APP',
          title: notifTitle,
          message: notifMsg,
          referenceType: 'task',
          referenceId: task.id,
        },
      });
    } catch { /* non-fatal */ }
  }

  return updatedTask;
}

export async function addTaskProgressUpdate(
  id: string,
  data: { content: string; attachments?: string[] },
  userId: string
) {
  if (!data.content?.trim()) throw new AppError(400, 'Update text is required');

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) throw new AppError(404, 'Task not found');

  const update = await prisma.taskUpdate.create({
    data: {
      taskId: id,
      userId,
      content: data.content.trim(),
      attachments: data.attachments || [],
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  // Touch task updated timestamp
  await prisma.task.update({ where: { id }, data: { updatedAt: new Date() } });

  return update;
}

export async function getTaskStats(
  orgId: string,
  userId?: string,
  userRole?: string,
  branchId?: string
) {
  const where: any = { organizationId: orgId };
  if (branchId) where.branchId = branchId;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const allTasks = await prisma.task.findMany({
    where,
    select: {
      id: true,
      status: true,
      priority: true,
      dueDate: true,
      assignedToId: true,
      assignedById: true,
    },
  });

  const total = allTasks.length;
  const myTasks = userId ? allTasks.filter(t => t.assignedToId === userId).length : 0;
  const pending = allTasks.filter(t => t.status === 'CREATED' || t.status === 'ACCEPTED').length;
  const inProgress = allTasks.filter(t => t.status === 'IN_PROGRESS').length;
  const awaitingVerification = allTasks.filter(t => t.status === 'COMPLETED').length;
  const completed = allTasks.filter(t => t.status === 'VERIFIED' || t.status === 'CLOSED').length;

  const overdue = allTasks.filter(t => {
    if (['CLOSED', 'VERIFIED', 'COMPLETED', 'CANCELLED'].includes(t.status)) return false;
    return t.dueDate && new Date(t.dueDate) < startOfToday;
  }).length;

  const dueToday = allTasks.filter(t => {
    if (['CLOSED', 'VERIFIED', 'COMPLETED', 'CANCELLED'].includes(t.status)) return false;
    if (!t.dueDate) return false;
    const d = new Date(t.dueDate);
    return d >= startOfToday && d <= endOfToday;
  }).length;

  let requiresMyAction = 0;
  if (userId) {
    requiresMyAction = allTasks.filter(t => {
      if (t.status === 'CREATED' || t.status === 'ACCEPTED' || t.status === 'IN_PROGRESS') {
        return t.assignedToId === userId;
      }
      if (t.status === 'COMPLETED') {
        return t.assignedById === userId || ['ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'].includes(userRole || '');
      }
      return false;
    }).length;
  }

  return {
    total,
    myTasks,
    pending,
    inProgress,
    dueToday,
    overdue,
    awaitingVerification,
    completed,
    requiresMyAction,
  };
}
