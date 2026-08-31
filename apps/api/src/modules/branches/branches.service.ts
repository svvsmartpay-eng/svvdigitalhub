import prisma from '../../config/database';
import { AppError } from '../../middleware/error.middleware';
import { createAuditLog } from '../../lib/auditLog';

export async function listBranches(orgId: string) {
  return prisma.branch.findMany({
    where: { organizationId: orgId, isActive: true },
    orderBy: { code: 'asc' },
  });
}

export async function getBranch(id: string) {
  const b = await prisma.branch.findUnique({
    where: { id },
    include: {
      _count: { select: { assets: true, issues: true } },
    },
  });
  if (!b) throw new AppError(404, 'Branch not found');
  return b;
}

export async function createBranch(orgId: string, data: any, actorId: string) {
  const branch = await prisma.branch.create({
    data: { organizationId: orgId, code: data.code, name: data.name, address: data.address, city: data.city, state: data.state, pincode: data.pincode, phone: data.phone, email: data.email },
  });
  await createAuditLog({ organizationId: orgId, userId: actorId, action: 'CREATE', resource: 'branch', resourceId: branch.id, newValues: data });
  return branch;
}

export async function updateBranch(id: string, data: any, orgId: string, actorId: string) {
  const branch = await prisma.branch.update({
    where: { id },
    data: { name: data.name, address: data.address, city: data.city, state: data.state, pincode: data.pincode, phone: data.phone, email: data.email, isActive: data.isActive },
  });
  await createAuditLog({ organizationId: orgId, userId: actorId, action: 'UPDATE', resource: 'branch', resourceId: id, newValues: data });
  return branch;
}
