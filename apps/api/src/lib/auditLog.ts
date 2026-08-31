import prisma from '../config/database';

interface AuditParams {
  organizationId: string;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  action: string;
  resource: string;
  resourceId?: string;
  resourceNo?: string;
  branchId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  changes?: Record<string, unknown> | string[] | null;
  ipAddress?: string;
  userAgent?: string;
  notes?: string;
}

export async function createAuditLog(params: AuditParams): Promise<void> {
  try {
    const changes = params.changes !== undefined ? params.changes : computeChanges(params.oldValues, params.newValues);
    await prisma.auditLog.create({
      data: {
        organizationId: params.organizationId,
        userId: params.userId,
        userEmail: params.userEmail,
        userRole: params.userRole,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        resourceNo: params.resourceNo,
        branchId: params.branchId,
        oldValues: params.oldValues as any,
        newValues: params.newValues as any,
        changes: changes as any,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        notes: params.notes,
      },
    });
  } catch (err) {
    // Audit log failure should not break the main flow
    console.error('Audit log failed:', err);
  }
}

function computeChanges(
  oldVals?: Record<string, unknown>,
  newVals?: Record<string, unknown>
): Record<string, { from: unknown; to: unknown }> | null {
  if (!oldVals || !newVals) return null;
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  const allKeys = new Set([...Object.keys(oldVals), ...Object.keys(newVals)]);
  for (const key of allKeys) {
    if (JSON.stringify(oldVals[key]) !== JSON.stringify(newVals[key])) {
      changes[key] = { from: oldVals[key], to: newVals[key] };
    }
  }
  return Object.keys(changes).length > 0 ? changes : null;
}
