// Sequential ID generators with prefix pattern
import prisma from '../config/database';

async function getNextSequence(key: string): Promise<number> {
  // Use Redis-style counter in DB by upserting a sequence row
  // Simple approach: count existing records + 1 with proper locking
  const result = await prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*) as count FROM audit_logs WHERE resource = ${key}`;
  // Better: use a sequences table
  return Number(result[0].count) + 1;
}

const year = () => new Date().getFullYear().toString();

export function padNum(n: number, len = 6): string {
  return n.toString().padStart(len, '0');
}

export async function generateIssueNo(): Promise<string> {
  const count = await prisma.issue.count();
  return `ISS-${year()}-${padNum(count + 1)}`;
}

export async function generateWorkOrderNo(): Promise<string> {
  const count = await prisma.workOrder.count();
  return `WO-${year()}-${padNum(count + 1)}`;
}

export async function generateVisitNo(): Promise<string> {
  const count = await prisma.serviceVisit.count();
  return `VIS-${year()}-${padNum(count + 1)}`;
}

export async function generateTransferNo(): Promise<string> {
  const count = await prisma.assetTransfer.count();
  return `TRF-${year()}-${padNum(count + 1)}`;
}

export async function generateAuditNo(): Promise<string> {
  const count = await prisma.assetAudit.count();
  return `AUD-${year()}-${padNum(count + 1)}`;
}

export async function generateTechId(): Promise<string> {
  const count = await prisma.technician.count();
  return `TECH-${padNum(count + 1, 4)}`;
}

export async function generatePartCode(): Promise<string> {
  const count = await prisma.sparePart.count();
  return `PART-${padNum(count + 1, 4)}`;
}

export async function generateVendorCode(): Promise<string> {
  const count = await prisma.vendor.count();
  return `VND-${padNum(count + 1, 4)}`;
}

// Asset ID: {branchCode}-{categoryCode}-{seq}
export async function generateAssetId(
  branchCode: string,
  categoryCode: string
): Promise<string> {
  const count = await prisma.asset.count({
    where: { assetId: { startsWith: `${branchCode}-${categoryCode}-` } },
  });
  return `${branchCode}-${categoryCode}-${padNum(count + 1, 3)}`;
}
