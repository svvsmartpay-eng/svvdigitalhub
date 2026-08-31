import prisma from '../../config/database';
import { AppError } from '../../middleware/error.middleware';
import bcrypt from 'bcryptjs';
import { env } from '../../config/env';
import { createAuditLog } from '../../lib/auditLog';
import { RoleType } from '@prisma/client';

export interface ListParams {
  page?: number; limit?: number; search?: string;
  branchId?: string; status?: string; roleType?: string;
}

export async function listUsers(orgId: string, params: ListParams) {
  const page = params.page || 1;
  const limit = Math.min(params.limit || 20, 100);
  const skip = (page - 1) * limit;
  const where: any = { organizationId: orgId };
  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: 'insensitive' } },
      { email: { contains: params.search, mode: 'insensitive' } },
      { employeeId: { contains: params.search, mode: 'insensitive' } },
      { designation: { contains: params.search, mode: 'insensitive' } },
    ];
  }
  if (params.status) where.status = params.status;

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where, skip, take: limit,
      include: {
        reportingManager: { select: { id: true, name: true, email: true } },
        backupPerson: { select: { id: true, name: true, email: true } },
        userRoles: { include: { role: { select: { id: true, type: true, name: true } } } },
        userBranches: { include: { branch: { select: { id: true, code: true, name: true } } } },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    data: data.map((u, idx) => ({
      id: u.id,
      employeeId: u.employeeId || `EMP-${String(1001 + idx).padStart(4, '0')}`,
      name: u.name,
      email: u.email,
      phone: u.phone || '—',
      status: u.status,
      photoUrl: u.photoUrl,
      designation: u.designation || 'Staff',
      department: u.department,
      dob: u.dob,
      dateOfJoining: u.dateOfJoining,
      isOnLeave: u.isOnLeave,
      reportingManagerId: u.reportingManagerId,
      reportingManager: u.reportingManager ? { id: u.reportingManager.id, name: u.reportingManager.name, email: u.reportingManager.email } : null,
      backupPersonId: u.backupPersonId,
      backupPerson: u.backupPerson ? { id: u.backupPerson.id, name: u.backupPerson.name } : null,
      roles: u.userRoles.map(r => ({ id: r.role.id, type: r.role.type, name: r.role.name })),
      roleNames: u.userRoles.map(r => r.role.name).join(', ') || 'Staff',
      primaryRole: u.userRoles[0]?.role?.type || 'STAFF',
      branches: u.userBranches.map(b => ({ id: b.branchId, code: b.branch.code, name: b.branch.name, isPrimary: b.isPrimary })),
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
    })),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getUser(id: string) {
  const u = await prisma.user.findUnique({
    where: { id },
    include: {
      reportingManager: { select: { id: true, name: true, email: true } },
      backupPerson: { select: { id: true, name: true, email: true } },
      userRoles: { include: { role: true } },
      userBranches: { include: { branch: true } },
    },
  });
  if (!u) throw new AppError(404, 'User not found');
  return {
    ...u,
    roles: u.userRoles.map(r => ({ id: r.role.id, type: r.role.type, name: r.role.name })),
    branches: u.userBranches.map(b => ({ id: b.branchId, code: b.branch.code, name: b.branch.name, isPrimary: b.isPrimary })),
  };
}

export async function createUser(orgId: string, data: any, actorId: string) {
  const exists = await prisma.user.findUnique({ where: { email: data.email.toLowerCase().trim() } });
  if (exists) throw new AppError(409, 'Email already registered');

  let employeeId = data.employeeId?.trim();
  if (!employeeId) {
    const userCount = await prisma.user.count({ where: { organizationId: orgId } });
    employeeId = `EMP-${String(userCount + 1001).padStart(4, '0')}`;
  }

  const passwordHash = await bcrypt.hash(data.password || 'SVV@Change2026', env.BCRYPT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      organizationId: orgId,
      employeeId,
      name: data.name.trim(),
      email: data.email.toLowerCase().trim(),
      phone: data.phone?.trim() || undefined,
      passwordHash,
      designation: data.designation?.trim() || undefined,
      department: data.department?.trim() || undefined,
      dob: data.dob ? new Date(data.dob) : undefined,
      dateOfJoining: data.dateOfJoining ? new Date(data.dateOfJoining) : undefined,
      status: data.status || 'ACTIVE',
      reportingManagerId: data.reportingManagerId || undefined,
      backupPersonId: data.backupPersonId || undefined,
      mustChangePass: true,
      userRoles: data.roleIds ? { create: data.roleIds.map((rid: string) => ({ roleId: rid })) } : undefined,
      userBranches: data.branchIds ? { create: data.branchIds.map((bid: string, i: number) => ({ branchId: bid, isPrimary: i === 0 })) } : undefined,
    },
  });
  await createAuditLog({ organizationId: orgId, userId: actorId, action: 'CREATE', resource: 'user', resourceId: user.id, newValues: { name: user.name, email: user.email, employeeId } });
  return user;
}

export async function updateUser(id: string, data: any, orgId: string, actorId: string) {
  const old = await prisma.user.findUnique({ where: { id } });
  if (!old) throw new AppError(404, 'User not found');

  const updated = await prisma.user.update({
    where: { id },
    data: {
      employeeId: data.employeeId?.trim() || old.employeeId,
      name: data.name?.trim() || old.name,
      phone: data.phone?.trim() || old.phone,
      designation: data.designation?.trim() || old.designation,
      department: data.department?.trim() || old.department,
      status: data.status || old.status,
      photoUrl: data.photoUrl,
      dob: data.dob ? new Date(data.dob) : undefined,
      dateOfJoining: data.dateOfJoining ? new Date(data.dateOfJoining) : undefined,
      showBirthdayWishes: data.showBirthdayWishes !== undefined ? data.showBirthdayWishes : old.showBirthdayWishes,
      isOnLeave: data.isOnLeave !== undefined ? data.isOnLeave : old.isOnLeave,
      reportingManagerId: data.reportingManagerId !== undefined ? data.reportingManagerId || null : old.reportingManagerId,
      backupPersonId: data.backupPersonId !== undefined ? data.backupPersonId || null : old.backupPersonId,
    },
  });

  if (Array.isArray(data.roleIds)) {
    await prisma.userRole.deleteMany({ where: { userId: id } });
    if (data.roleIds.length > 0) {
      await prisma.userRole.createMany({ data: data.roleIds.map((rid: string) => ({ userId: id, roleId: rid })) });
    }
  }
  if (Array.isArray(data.branchIds)) {
    await prisma.userBranch.deleteMany({ where: { userId: id } });
    if (data.branchIds.length > 0) {
      await prisma.userBranch.createMany({ data: data.branchIds.map((bid: string, i: number) => ({ userId: id, branchId: bid, isPrimary: i === 0 })) });
    }
  }

  await createAuditLog({ organizationId: orgId, userId: actorId, action: 'UPDATE', resource: 'user', resourceId: id, oldValues: old as any, newValues: data });
  return updated;
}

export async function resetPassword(id: string, orgId: string, actorId: string) {
  const tempPass = 'SVV@Reset2026';
  const passwordHash = await bcrypt.hash(tempPass, env.BCRYPT_ROUNDS);
  await prisma.user.update({ where: { id }, data: { passwordHash, mustChangePass: true } });
  await createAuditLog({ organizationId: orgId, userId: actorId, action: 'RESET_PASSWORD', resource: 'user', resourceId: id });
  return { tempPassword: tempPass };
}

export async function listRoles(orgId: string) {
  return prisma.role.findMany({ where: { organizationId: orgId, isActive: true }, orderBy: { name: 'asc' } });
}

export async function updateProfile(userId: string, data: any) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name, phone: data.phone, photoUrl: data.photoUrl,
      dob: data.dob ? new Date(data.dob) : null,
      showBirthdayWishes: data.showBirthdayWishes,
      isOnLeave: data.isOnLeave,
      backupPersonId: data.backupPersonId || null
    }
  });
}

export async function getLiveStatus(orgId: string) {
  const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
  const users = await prisma.user.findMany({
    where: { organizationId: orgId, status: 'ACTIVE' },
    select: { id: true, name: true, photoUrl: true, designation: true, lastActiveAt: true, isOnLeave: true },
    orderBy: { name: 'asc' }
  });
  return users.map(u => ({
    ...u,
    liveStatus: u.isOnLeave ? 'ON_LEAVE' : (u.lastActiveAt && u.lastActiveAt > fiveMinsAgo ? 'ONLINE' : 'OFFLINE')
  }));
}
