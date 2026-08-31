import prisma from '../../config/database';
import { AppError } from '../../middleware/error.middleware';
import { createAuditLog } from '../../lib/auditLog';
import { generateAssetId } from '../../lib/idGenerator';
import QRCode from 'qrcode';
import { env } from '../../config/env';
import path from 'path';
import fs from 'fs';

export interface AssetListParams {
  page?: number; limit?: number; search?: string;
  branchId?: string; categoryId?: string; status?: string;
  condition?: string; criticality?: string; ownershipType?: string;
  orgId: string;
}

export async function listAssets(params: AssetListParams) {
  const page = params.page || 1;
  const limit = Math.min(params.limit || 20, 100);
  const skip = (page - 1) * limit;

  const where: any = { organizationId: params.orgId, isActive: true };
  if (params.branchId) where.branchId = params.branchId;
  if (params.categoryId) where.categoryId = params.categoryId;
  if (params.status) where.status = params.status;
  if (params.condition) where.condition = params.condition;
  if (params.criticality) where.criticality = params.criticality;
  if (params.ownershipType) where.ownershipType = params.ownershipType;
  if (params.search) {
    where.OR = [
      { assetId: { contains: params.search, mode: 'insensitive' } },
      { name: { contains: params.search, mode: 'insensitive' } },
      { serialNumber: { contains: params.search, mode: 'insensitive' } },
      { brand: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.asset.findMany({
      where, skip, take: limit,
      include: {
        branch: { select: { code: true, name: true } },
        category: { select: { name: true, code: true } },
        location: { select: { name: true } },
        _count: { select: { issues: true, workOrders: true } },
      },
      orderBy: { assetId: 'asc' },
    }),
    prisma.asset.count({ where }),
  ]);

  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function getAsset(id: string) {
  const asset = await prisma.asset.findFirst({
    where: { OR: [{ id }, { assetId: id }], isActive: true },
    include: {
      branch: true, category: true, location: true, department: true,
      ownership: true, contract: true, warranty: true, amc: true,
      instances: { orderBy: { instanceNo: 'asc' } },
      issues: { orderBy: { createdAt: 'desc' }, take: 10, include: { raisedBy: { select: { name: true } }, assignedTo: { select: { name: true } } } },
      workOrders: { orderBy: { createdAt: 'desc' }, take: 10 },
      documents: { orderBy: { uploadedAt: 'desc' } },
      healthScores: { orderBy: { calculatedAt: 'desc' }, take: 5 },
      costEntries: { orderBy: { recordedAt: 'desc' }, take: 20 },
      replacementReviews: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });
  if (!asset) throw new AppError(404, 'Asset not found');

  // Compute financial totals & ROI
  const purchaseCost = Number(asset.purchaseCost || 0);
  const installationCost = Number(asset.installationCost || 0);
  const initialCapEx = purchaseCost + installationCost;

  const costBreakdown = {
    labour: 0,
    parts: 0,
    travel: 0,
    other: 0,
    total: 0,
  };

  asset.costEntries.forEach((c) => {
    const amt = Number(c.amount || 0);
    costBreakdown.total += amt;
    const cat = (c.categoryType || '').toLowerCase();
    if (cat.includes('labour') || cat.includes('service')) costBreakdown.labour += amt;
    else if (cat.includes('part')) costBreakdown.parts += amt;
    else if (cat.includes('travel')) costBreakdown.travel += amt;
    else costBreakdown.other += amt;
  });

  const costToPurchaseRatio = initialCapEx > 0 ? (costBreakdown.total / initialCapEx) * 100 : 0;

  return {
    ...asset,
    financialSummary: {
      initialCapEx,
      totalMaintenanceCost: costBreakdown.total,
      costBreakdown,
      costToPurchaseRatio: Number(costToPurchaseRatio.toFixed(1)),
      needsReplacement: (asset.healthScore !== null && asset.healthScore < 40) || costToPurchaseRatio >= 50,
      activeReplacementReview: asset.replacementReviews?.[0] || null,
    },
  };
}

export async function calculateAssetHealth(assetId: string) {
  const asset = await prisma.asset.findFirst({
    where: { OR: [{ id: assetId }, { assetId }] },
    include: {
      issues: { select: { id: true, createdAt: true, status: true, priority: true, resolvedAt: true, downtimeStartAt: true, downtimeEndAt: true } },
      costEntries: { select: { amount: true, categoryType: true, recordedAt: true } },
    },
  });
  if (!asset) return null;

  const now = new Date();
  const purchaseCost = Number(asset.purchaseCost) || 50000;
  const totalCost = asset.costEntries.reduce((acc, c) => acc + Number(c.amount || 0), 0);

  // 1. Cost Ratio Score (Max 30 pts)
  const costRatio = purchaseCost > 0 ? (totalCost / purchaseCost) : 0;
  let costScore = 30;
  if (costRatio > 1.0) costScore = 0;
  else if (costRatio > 0.75) costScore = 5;
  else if (costRatio > 0.50) costScore = 12;
  else if (costRatio > 0.25) costScore = 20;
  else if (costRatio > 0.10) costScore = 26;

  // 2. Breakdown Frequency Score (Max 25 pts)
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 3600 * 1000);
  const recentIssues = asset.issues.filter(i => new Date(i.createdAt) >= ninetyDaysAgo);
  const breakdownCount = recentIssues.length;
  let breakdownScore = 25;
  if (breakdownCount >= 5) breakdownScore = 2;
  else if (breakdownCount >= 3) breakdownScore = 8;
  else if (breakdownCount >= 2) breakdownScore = 15;
  else if (breakdownCount === 1) breakdownScore = 20;

  // 3. Cumulative Downtime Score (Max 20 pts)
  let totalDowntimeHours = 0;
  asset.issues.forEach(i => {
    if (i.downtimeStartAt && i.downtimeEndAt) {
      totalDowntimeHours += (new Date(i.downtimeEndAt).getTime() - new Date(i.downtimeStartAt).getTime()) / 3600000;
    } else if (i.status !== 'CLOSED' && i.status !== 'RESOLVED') {
      totalDowntimeHours += (now.getTime() - new Date(i.createdAt).getTime()) / 3600000;
    }
  });
  let downtimeScore = 20;
  if (totalDowntimeHours > 72) downtimeScore = 2;
  else if (totalDowntimeHours > 36) downtimeScore = 8;
  else if (totalDowntimeHours > 12) downtimeScore = 14;
  else if (totalDowntimeHours > 0) downtimeScore = 18;

  // 4. Age vs Expected Lifespan Score (Max 15 pts)
  const installDate = asset.installationDate || asset.purchaseDate || asset.createdAt;
  const ageYears = Math.max(0, (now.getTime() - new Date(installDate).getTime()) / (365.25 * 24 * 3600 * 1000));
  const expectedLife = asset.expectedLifeYears || 5;
  const ageRatio = ageYears / expectedLife;
  let ageScore = 15;
  if (ageRatio >= 1.2) ageScore = 2;
  else if (ageRatio >= 1.0) ageScore = 5;
  else if (ageRatio >= 0.8) ageScore = 9;
  else if (ageRatio >= 0.5) ageScore = 12;

  // 5. Reliability / Condition Score (Max 10 pts)
  let conditionScore = 10;
  if (asset.condition === 'POOR' || asset.condition === 'SCRAP') conditionScore = 2;
  else if (asset.condition === 'FAIR') conditionScore = 6;
  else if (asset.condition === 'GOOD') conditionScore = 8;

  const totalScore = Math.min(100, Math.max(0, Math.round(costScore + breakdownScore + downtimeScore + ageScore + conditionScore)));

  let healthStatus: 'HEALTHY' | 'WATCH' | 'AT_RISK' | 'CRITICAL' = 'HEALTHY';
  if (totalScore < 40 || costRatio > 0.6) healthStatus = 'CRITICAL';
  else if (totalScore < 60) healthStatus = 'AT_RISK';
  else if (totalScore < 80) healthStatus = 'WATCH';

  // Save health score record
  await prisma.assetHealthScore.create({
    data: {
      assetId: asset.id,
      score: totalScore,
      status: healthStatus,
      costScore,
      breakdownScore,
      downtimeScore,
      ageScore,
      conditionScore,
      calculatedAt: now,
    },
  });

  // Update asset table
  await prisma.asset.update({
    where: { id: asset.id },
    data: {
      healthScore: totalScore,
      healthStatus,
    },
  });

  // Trigger Replacement Review if critical
  if (healthStatus === 'CRITICAL' || costRatio >= 0.5) {
    const existingReview = await prisma.replacementReview.findFirst({
      where: { assetId: asset.id, decision: null },
    });
    if (!existingReview) {
      await prisma.replacementReview.create({
        data: {
          assetId: asset.id,
          reviewedBy: 'SYSTEM_HEALTH_ENGINE',
          cumulativeCost: totalCost,
          breakdownCount: asset.issues.length,
          totalDowntimeDays: Math.ceil(totalDowntimeHours / 24),
          replacementCost: asset.replacementCost || asset.purchaseCost,
          recommendation: 'REPLACE',
          notes: `Health score dropped to ${totalScore}/100. Total maintenance expenses (₹${totalCost.toLocaleString('en-IN')}) equal ${(costRatio * 100).toFixed(1)}% of original purchase cost.`,
        },
      });
    }
  }

  return {
    score: totalScore,
    status: healthStatus,
    costScore,
    breakdownScore,
    downtimeScore,
    ageScore,
    conditionScore,
    totalMaintenanceCost: totalCost,
    costRatio: Number((costRatio * 100).toFixed(1)),
    totalDowntimeHours: Math.round(totalDowntimeHours),
  };
}

export async function getAssetLifecycleTimeline(id: string) {
  const asset = await prisma.asset.findFirst({
    where: { OR: [{ id }, { assetId: id }] },
    include: { branch: true, category: true, warranty: true, amc: true },
  });
  if (!asset) throw new AppError(404, 'Asset not found');

  const [issues, workOrders, serviceVisits, pmSchedules, costEntries, transfers, replacementReviews, auditLogs] = await Promise.all([
    prisma.issue.findMany({ where: { assetId: asset.id }, orderBy: { createdAt: 'desc' }, include: { raisedBy: { select: { name: true } }, assignedTo: { select: { name: true } } } }),
    prisma.workOrder.findMany({ where: { assetId: asset.id }, orderBy: { createdAt: 'desc' } }),
    prisma.serviceVisit.findMany({ where: { assetId: asset.id }, orderBy: { createdAt: 'desc' }, include: { technician: { select: { name: true } }, partsUsed: true } }),
    prisma.pMSchedule.findMany({ where: { assetId: asset.id }, orderBy: { dueDate: 'desc' } }),
    prisma.costEntry.findMany({ where: { assetId: asset.id }, orderBy: { recordedAt: 'desc' } }),
    prisma.assetTransfer.findMany({ where: { assetId: asset.id }, orderBy: { createdAt: 'desc' } }),
    prisma.replacementReview.findMany({ where: { assetId: asset.id }, orderBy: { createdAt: 'desc' } }),
    prisma.auditLog.findMany({ where: { resource: 'asset', resourceId: asset.id }, include: { user: { select: { name: true, email: true } } }, orderBy: { createdAt: 'desc' } }),
  ]);

  const events: Array<{
    id: string;
    type: 'PURCHASE' | 'INSTALLATION' | 'PM' | 'REPAIR' | 'COST' | 'PARTS' | 'TRANSFER' | 'HEALTH' | 'REPLACEMENT' | 'AUDIT_EDIT';
    title: string;
    subtitle?: string;
    description: string;
    timestamp: Date | string;
    badge?: string;
    badgeColor?: string;
    amount?: number;
    metadata?: any;
  }> = [];

  // 1. Purchase Event
  if (asset.purchaseDate || asset.purchaseCost) {
    events.push({
      id: `purchase-${asset.id}`,
      type: 'PURCHASE',
      title: 'Asset Purchased & Capitalized',
      subtitle: `${asset.brand || ''} ${asset.model || ''}`,
      description: `Purchased under ${asset.ownershipType} ownership. Purchase Cost: ₹${Number(asset.purchaseCost || 0).toLocaleString('en-IN')}${asset.expectedLifeYears ? ` · Expected Life: ${asset.expectedLifeYears} Years` : ''}`,
      timestamp: asset.purchaseDate || asset.createdAt,
      badge: 'Capitalization',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
      amount: Number(asset.purchaseCost || 0),
    });
  }

  // 2. Installation & Commissioning
  if (asset.installationDate) {
    events.push({
      id: `install-${asset.id}`,
      type: 'INSTALLATION',
      title: 'Installed & Commissioned at Branch',
      subtitle: `${asset.branch?.name} (${asset.branch?.code})`,
      description: `Positioned at ${asset.building || 'Main Facility'}${asset.room ? ` - Room ${asset.room}` : ''}${asset.custodianName ? ` · Custodian: ${asset.custodianName}` : ''}. Initial condition: ${asset.condition}.`,
      timestamp: asset.installationDate,
      badge: 'Commissioning',
      badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
      amount: Number(asset.installationCost || 0),
    });
  }

  // 3. Warranty Event
  if (asset.warranty) {
    events.push({
      id: `warranty-${asset.warranty.id}`,
      type: 'HEALTH',
      title: 'Warranty Protection Registered',
      subtitle: asset.warranty.endDate ? `Valid until: ${new Date(asset.warranty.endDate).toLocaleDateString('en-IN')}` : 'Warranty Active',
      description: asset.warranty.terms || 'Standard OEM manufacturer warranty registered.',
      timestamp: asset.warranty.startDate || asset.createdAt,
      badge: 'Warranty',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    });
  }

  // 4. Preventive Maintenance
  pmSchedules.forEach((pm) => {
    events.push({
      id: `pm-${pm.id}`,
      type: 'PM',
      title: `Preventive Maintenance (${pm.status})`,
      subtitle: pm.result ? `Result: ${pm.result}` : 'Routine Inspection',
      description: pm.notes || 'Scheduled preventive maintenance execution.',
      timestamp: pm.completedAt || pm.dueDate,
      badge: pm.status === 'COMPLETED' ? 'PM Completed' : 'PM Scheduled',
      badgeColor: pm.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-amber-100 text-amber-800 border-amber-200',
    });
  });

  // 5. Repairs / Breakdown Issues
  issues.forEach((iss) => {
    events.push({
      id: `issue-${iss.id}`,
      type: 'REPAIR',
      title: `Ticket #${iss.issueNo}: ${iss.title}`,
      subtitle: `Priority: ${iss.priority} · Status: ${iss.status}`,
      description: iss.description || 'Reported maintenance event.',
      timestamp: iss.createdAt,
      badge: iss.status,
      badgeColor: iss.status === 'CLOSED' ? 'bg-gray-100 text-gray-800 border-gray-200' : 'bg-red-100 text-red-800 border-red-200',
      metadata: { issueId: iss.id, technician: iss.assignedTo?.name, reporter: iss.raisedBy?.name },
    });
  });

  // 6. Cost Entries
  costEntries.forEach((c) => {
    events.push({
      id: `cost-${c.id}`,
      type: 'COST',
      title: `Maintenance Expense (₹${Number(c.amount).toLocaleString('en-IN')})`,
      subtitle: `Category: ${c.categoryType.toUpperCase()}`,
      description: c.description || 'Cost recorded for maintenance action.',
      timestamp: c.recordedAt,
      badge: `₹${Number(c.amount).toLocaleString('en-IN')}`,
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
      amount: Number(c.amount),
    });
  });

  // 7. Audit Log / Edit Events (Who & Why)
  auditLogs.forEach((log) => {
    if (log.action === 'UPDATE') {
      const changesArr = Array.isArray(log.changes) ? (log.changes as string[]) : [];
      const changesText = changesArr.length > 0 ? `\n• Changes: ${changesArr.join('\n• ')}` : '';
      events.push({
        id: `audit-${log.id}`,
        type: 'AUDIT_EDIT',
        title: 'Asset Specifications Modified',
        subtitle: `Edited by ${log.user?.name || log.userEmail || 'Admin'} (${log.userRole?.replace('_', ' ') || 'Admin'})`,
        description: `Reason / Why: ${log.notes || 'Asset specifications updated.'}${changesText}`,
        timestamp: log.createdAt,
        badge: 'Profile Modified',
        badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      });
    }
  });

  // 8. Replacement Reviews
  replacementReviews.forEach((rev) => {
    events.push({
      id: `review-${rev.id}`,
      type: 'REPLACEMENT',
      title: `Replacement Recommendation: ${rev.recommendation}`,
      subtitle: `Triggered by ${rev.reviewedBy}`,
      description: rev.notes || 'Asset flagged due to high maintenance expenditure or low health score.',
      timestamp: rev.createdAt,
      badge: rev.recommendation,
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
    });
  });

  // Sort chronological descending (latest first)
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return events;
}

export async function getAssetHistory(id: string) {
  return getAssetLifecycleTimeline(id);
}

export async function createAsset(orgId: string, data: any, actorId: string) {
  // Get branch code for Asset ID generation
  const branch = await prisma.branch.findUnique({ where: { id: data.branchId } });
  if (!branch) throw new AppError(404, 'Branch not found');

  const category = await prisma.assetCategory.findUnique({ where: { id: data.categoryId } });
  if (!category) throw new AppError(404, 'Category not found');

  // Generate asset ID if not provided
  const assetId = data.assetId || await generateAssetId(branch.code, category.code);

  // Check uniqueness
  const existing = await prisma.asset.findUnique({ where: { assetId } });
  if (existing) throw new AppError(409, `Asset ID ${assetId} already exists`);

  const purchaseCost = data.purchaseCost !== undefined && data.purchaseCost !== '' ? Number(data.purchaseCost) : undefined;
  const installationCost = data.installationCost !== undefined && data.installationCost !== '' ? Number(data.installationCost) : undefined;
  const expectedLifeYears = data.expectedLifeYears !== undefined && data.expectedLifeYears !== '' ? parseInt(data.expectedLifeYears, 10) : undefined;
  const currentBookValue = data.currentBookValue !== undefined && data.currentBookValue !== '' ? Number(data.currentBookValue) : purchaseCost;
  const replacementCost = data.replacementCost !== undefined && data.replacementCost !== '' ? Number(data.replacementCost) : purchaseCost;
  const monthlyRental = data.monthlyRental !== undefined && data.monthlyRental !== '' ? Number(data.monthlyRental) : undefined;
  const emiAmount = data.emiAmount !== undefined && data.emiAmount !== '' ? Number(data.emiAmount) : undefined;
  const securityDeposit = data.securityDeposit !== undefined && data.securityDeposit !== '' ? Number(data.securityDeposit) : undefined;

  const asset = await prisma.asset.create({
    data: {
      assetId, organizationId: orgId, branchId: data.branchId, categoryId: data.categoryId,
      locationId: data.locationId, departmentId: data.departmentId,
      name: data.name, brand: data.brand, model: data.model, serialNumber: data.serialNumber,
      barcode: data.barcode, description: data.description, photoUrl: data.photoUrl,
      trackingMode: data.trackingMode || category.trackingMode,
      quantity: data.quantity ? parseInt(data.quantity, 10) : 1, unit: data.unit,
      status: data.status || 'OPERATIONAL', condition: data.condition || 'GOOD',
      criticality: data.criticality || category.defaultCriticality,
      businessImpact: data.businessImpact, isCritical: data.isCritical || false,
      building: data.building, room: data.room, exactPosition: data.exactPosition,
      custodianName: data.custodianName,
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
      installationDate: data.installationDate ? new Date(data.installationDate) : undefined,
      commissioningDate: data.commissioningDate ? new Date(data.commissioningDate) : undefined,
      expectedLifeYears,
      purchaseCost, installationCost,
      currentBookValue, replacementCost,
      monthlyRental, emiAmount,
      securityDeposit,
      ownershipType: data.ownershipType || 'OWNED',
      notes: data.notes, tags: data.tags || [],
    },
  });

  // Generate QR code
  await generateQRCode(asset.id, assetId);

  // Create instances for individual-tracked assets with qty > 1
  if ((data.trackingMode === 'INDIVIDUAL' || category.trackingMode === 'INDIVIDUAL') && (data.quantity || 1) > 1) {
    const qty = parseInt(data.quantity, 10) || 1;
    for (let i = 1; i <= qty; i++) {
      await prisma.assetInstance.create({
        data: {
          assetId: asset.id,
          instanceNo: i,
          instanceTag: `${assetId}-${String(i).padStart(3, '0')}`,
          status: 'OPERATIONAL',
          condition: 'GOOD',
        },
      });
    }
  }

  // Create Warranty record if warranty dates provided
  if (data.warrantyStartDate || data.warrantyEndDate || data.warrantyTerms) {
    await prisma.warranty.create({
      data: {
        assetId: asset.id,
        startDate: data.warrantyStartDate ? new Date(data.warrantyStartDate) : undefined,
        endDate: data.warrantyEndDate ? new Date(data.warrantyEndDate) : undefined,
        terms: data.warrantyTerms,
      },
    }).catch(() => {});
  }

  // Create AMC record if AMC details provided
  if (data.amcStartDate || data.amcEndDate || data.amcContractNo) {
    await prisma.aMC.create({
      data: {
        assetId: asset.id,
        contractNo: data.amcContractNo,
        startDate: data.amcStartDate ? new Date(data.amcStartDate) : undefined,
        endDate: data.amcEndDate ? new Date(data.amcEndDate) : undefined,
        cost: data.amcCost ? Number(data.amcCost) : undefined,
        coverage: data.amcCoverage,
      },
    }).catch(() => {});
  }

  // Create audit log
  await createAuditLog({
    organizationId: orgId,
    userId: actorId,
    action: 'CREATE',
    resource: 'asset',
    resourceId: asset.id,
    resourceNo: assetId,
    branchId: data.branchId,
    notes: 'Initial asset registration & capitalization',
    newValues: { assetId, name: data.name, purchaseCost, branch: branch.name },
  });

  // Calculate Initial Health Score
  try {
    await calculateAssetHealth(asset.id);
  } catch { /* non-fatal */ }

  return asset;
}

export async function updateAsset(id: string, data: any, orgId: string, actorId: string) {
  const old = await prisma.asset.findUnique({
    where: { id },
    include: { warranty: true, amc: true, branch: true },
  });
  if (!old) throw new AppError(404, 'Asset not found');

  const purchaseCost = data.purchaseCost !== undefined && data.purchaseCost !== '' ? Number(data.purchaseCost) : undefined;
  const installationCost = data.installationCost !== undefined && data.installationCost !== '' ? Number(data.installationCost) : undefined;
  const expectedLifeYears = data.expectedLifeYears !== undefined && data.expectedLifeYears !== '' ? parseInt(data.expectedLifeYears, 10) : undefined;
  const currentBookValue = data.currentBookValue !== undefined && data.currentBookValue !== '' ? Number(data.currentBookValue) : undefined;
  const replacementCost = data.replacementCost !== undefined && data.replacementCost !== '' ? Number(data.replacementCost) : undefined;
  const monthlyRental = data.monthlyRental !== undefined && data.monthlyRental !== '' ? Number(data.monthlyRental) : undefined;
  const emiAmount = data.emiAmount !== undefined && data.emiAmount !== '' ? Number(data.emiAmount) : undefined;
  const securityDeposit = data.securityDeposit !== undefined && data.securityDeposit !== '' ? Number(data.securityDeposit) : undefined;

  const updated = await prisma.asset.update({
    where: { id },
    data: {
      name: data.name, brand: data.brand, model: data.model, serialNumber: data.serialNumber,
      barcode: data.barcode, description: data.description, photoUrl: data.photoUrl,
      branchId: data.branchId || old.branchId,
      categoryId: data.categoryId || old.categoryId,
      locationId: data.locationId, departmentId: data.departmentId,
      status: data.status || old.status,
      condition: data.condition || old.condition,
      criticality: data.criticality || old.criticality,
      businessImpact: data.businessImpact, isCritical: data.isCritical,
      building: data.building, room: data.room, exactPosition: data.exactPosition,
      custodianName: data.custodianName,
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
      installationDate: data.installationDate ? new Date(data.installationDate) : undefined,
      commissioningDate: data.commissioningDate ? new Date(data.commissioningDate) : undefined,
      expectedLifeYears,
      purchaseCost, installationCost,
      currentBookValue, replacementCost,
      monthlyRental, emiAmount,
      securityDeposit,
      ownershipType: data.ownershipType || old.ownershipType,
      notes: data.notes, tags: data.tags,
    },
  });

  // Upsert Warranty
  if (data.warrantyStartDate || data.warrantyEndDate || data.warrantyTerms) {
    await prisma.warranty.upsert({
      where: { assetId: id },
      create: {
        assetId: id,
        startDate: data.warrantyStartDate ? new Date(data.warrantyStartDate) : undefined,
        endDate: data.warrantyEndDate ? new Date(data.warrantyEndDate) : undefined,
        terms: data.warrantyTerms,
      },
      update: {
        startDate: data.warrantyStartDate ? new Date(data.warrantyStartDate) : undefined,
        endDate: data.warrantyEndDate ? new Date(data.warrantyEndDate) : undefined,
        terms: data.warrantyTerms,
      },
    }).catch(() => {});
  }

  // Upsert AMC
  if (data.amcStartDate || data.amcEndDate || data.amcContractNo) {
    await prisma.aMC.upsert({
      where: { assetId: id },
      create: {
        assetId: id,
        contractNo: data.amcContractNo,
        startDate: data.amcStartDate ? new Date(data.amcStartDate) : undefined,
        endDate: data.amcEndDate ? new Date(data.amcEndDate) : undefined,
        cost: data.amcCost ? Number(data.amcCost) : undefined,
        coverage: data.amcCoverage,
      },
      update: {
        contractNo: data.amcContractNo,
        startDate: data.amcStartDate ? new Date(data.amcStartDate) : undefined,
        endDate: data.amcEndDate ? new Date(data.amcEndDate) : undefined,
        cost: data.amcCost ? Number(data.amcCost) : undefined,
        coverage: data.amcCoverage,
      },
    }).catch(() => {});
  }

  // Compute field diffs for timeline
  const changedFields: string[] = [];
  if (data.name && data.name !== old.name) changedFields.push(`Name: '${old.name}' → '${data.name}'`);
  if (purchaseCost !== undefined && purchaseCost !== Number(old.purchaseCost || 0)) changedFields.push(`Purchase Cost: ₹${Number(old.purchaseCost || 0).toLocaleString('en-IN')} → ₹${purchaseCost.toLocaleString('en-IN')}`);
  if (expectedLifeYears !== undefined && expectedLifeYears !== old.expectedLifeYears) changedFields.push(`Expected Life: ${old.expectedLifeYears || '—'} yrs → ${expectedLifeYears} yrs`);
  if (data.condition && data.condition !== old.condition) changedFields.push(`Condition: ${old.condition} → ${data.condition}`);
  if (data.status && data.status !== old.status) changedFields.push(`Status: ${old.status} → ${data.status}`);
  if (data.building && data.building !== old.building) changedFields.push(`Building: '${old.building || '—'}' → '${data.building}'`);
  if (data.custodianName && data.custodianName !== old.custodianName) changedFields.push(`Custodian: '${old.custodianName || '—'}' → '${data.custodianName}'`);

  const editReason = data.editReason?.trim() || (changedFields.length > 0 ? `Updated ${changedFields.length} field(s)` : 'Asset profile updated');

  await createAuditLog({
    organizationId: orgId,
    userId: actorId,
    action: 'UPDATE',
    resource: 'asset',
    resourceId: id,
    resourceNo: old.assetId,
    branchId: updated.branchId,
    notes: editReason,
    oldValues: old as any,
    newValues: data,
    changes: changedFields,
  });

  // Recalculate health
  try {
    await calculateAssetHealth(id);
  } catch { /* non-fatal */ }

  return updated;
}

export async function generateQRCode(assetDbId: string, assetId: string): Promise<string> {
  const url = `${env.QR_BASE_URL}/${assetId}`;
  const uploadsDir = path.join(process.cwd(), 'uploads', 'qr');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const filePath = path.join(uploadsDir, `${assetId}.png`);
  await QRCode.toFile(filePath, url, { width: 300, margin: 2 });

  const qrUrl = `/uploads/qr/${assetId}.png`;
  await prisma.asset.update({ where: { id: assetDbId }, data: { qrCode: qrUrl } });
  return qrUrl;
}

export async function getAssetStats(orgId: string, branchId?: string) {
  const where: any = { organizationId: orgId, isActive: true };
  if (branchId) where.branchId = branchId;

  const [total, byStatus, byCondition, byCriticality] = await Promise.all([
    prisma.asset.count({ where }),
    prisma.asset.groupBy({ by: ['status'], where, _count: true }),
    prisma.asset.groupBy({ by: ['condition'], where, _count: true }),
    prisma.asset.groupBy({ by: ['criticality'], where, _count: true }),
  ]);

  return { total, byStatus, byCondition, byCriticality };
}

export async function getAssetAnalytics(orgId: string, filters: {
  branchId?: string;
  categoryId?: string;
  status?: string;
  condition?: string;
  warrantyStatus?: string;
  amcStatus?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const where: any = { organizationId: orgId, isActive: true };

  if (filters.branchId) where.branchId = filters.branchId;
  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.status) where.status = filters.status;
  if (filters.condition) where.condition = filters.condition;

  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
    if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
  }

  const [assets, branches, categories, costEntries, issues] = await Promise.all([
    prisma.asset.findMany({
      where,
      include: {
        branch: { select: { id: true, code: true, name: true } },
        category: { select: { id: true, name: true, code: true } },
        warranty: true,
        amc: true,
        costEntries: true,
        issues: { select: { id: true, status: true, priority: true, createdAt: true } },
      },
    }),
    prisma.branch.findMany({
      where: { organizationId: orgId, isActive: true },
      select: { id: true, code: true, name: true },
    }),
    prisma.assetCategory.findMany({
      where: { organizationId: orgId, isActive: true },
      select: { id: true, name: true, code: true },
    }),
    prisma.costEntry.findMany({
      where: { organizationId: orgId },
      include: { asset: { select: { id: true, assetId: true, name: true, branch: { select: { name: true } } } } },
    }),
    prisma.issue.findMany({
      where: { organizationId: orgId },
      select: { id: true, assetId: true, status: true, priority: true, createdAt: true },
    }),
  ]);

  // 1. KPI Summary Totals
  let totalPurchaseValue = 0;
  let currentAssetValue = 0;
  let underMaintenanceCount = 0;
  let damagedCount = 0;
  let scrapCount = 0;
  let warrantyExpiring30Count = 0;
  let amcExpiring30Count = 0;
  let amcActiveCount = 0;
  let thisYearPurchase = 0;

  // Filter-applied assets
  assets.forEach((a: any) => {
    const pCost = Number(a.purchaseCost || 0);
    const cValue = Number(a.currentBookValue || a.purchaseCost || 0);

    totalPurchaseValue += pCost;
    currentAssetValue += cValue;

    if (a.status === 'UNDER_MAINTENANCE') underMaintenanceCount++;
    if (a.status === 'BREAKDOWN' || a.condition === 'CRITICAL' || a.condition === 'POOR') damagedCount++;
    if (a.condition === 'SCRAP' || a.status === 'DISPOSED') scrapCount++;

    if (a.purchaseDate && new Date(a.purchaseDate) >= startOfYear) {
      thisYearPurchase += pCost;
    }

    if (a.warranty?.endDate) {
      const wEnd = new Date(a.warranty.endDate);
      if (wEnd >= now && wEnd <= in30Days) warrantyExpiring30Count++;
    }

    if (a.amc?.endDate) {
      const aEnd = new Date(a.amc.endDate);
      if (aEnd >= now && aEnd <= in30Days) amcExpiring30Count++;
      if (aEnd > now) amcActiveCount++;
    }
  });

  const totalAssets = assets.length;
  const depreciatedValue = Math.max(0, totalPurchaseValue - currentAssetValue);

  // 2. Branch-Wise Analytics
  const branchMap: Record<string, { branchId: string; name: string; code: string; assetCount: number; assetValue: number; operationalCount: number; maintenanceCount: number }> = {};
  branches.forEach((b: any) => {
    branchMap[b.id] = { branchId: b.id, name: b.name, code: b.code, assetCount: 0, assetValue: 0, operationalCount: 0, maintenanceCount: 0 };
  });

  assets.forEach((a: any) => {
    if (a.branchId && branchMap[a.branchId]) {
      branchMap[a.branchId].assetCount++;
      branchMap[a.branchId].assetValue += Number(a.purchaseCost || 0);
      if (a.status === 'OPERATIONAL') branchMap[a.branchId].operationalCount++;
      if (a.status === 'UNDER_MAINTENANCE' || a.status === 'BREAKDOWN') branchMap[a.branchId].maintenanceCount++;
    }
  });

  const assetsByBranch = Object.values(branchMap).sort((a: any, b: any) => b.assetCount - a.assetCount);

  // 3. Category-Wise Analytics
  const categoryMap: Record<string, { categoryId: string; name: string; count: number; purchaseValue: number; currentValue: number }> = {};
  categories.forEach((c: any) => {
    categoryMap[c.id] = { categoryId: c.id, name: c.name, count: 0, purchaseValue: 0, currentValue: 0 };
  });
  categoryMap['other'] = { categoryId: 'other', name: 'Other Assets', count: 0, purchaseValue: 0, currentValue: 0 };

  assets.forEach((a: any) => {
    const key = a.categoryId && categoryMap[a.categoryId] ? a.categoryId : 'other';
    categoryMap[key].count++;
    categoryMap[key].purchaseValue += Number(a.purchaseCost || 0);
    categoryMap[key].currentValue += Number(a.currentBookValue || a.purchaseCost || 0);
  });

  const assetsByCategory = Object.values(categoryMap)
    .filter((c: any) => c.count > 0)
    .map((c: any) => ({
      ...c,
      percentage: totalAssets > 0 ? Number(((c.count / totalAssets) * 100).toFixed(1)) : 0,
    }))
    .sort((a: any, b: any) => b.count - a.count);

  // 4. Condition & Health Distribution
  const conditionCounts: Record<string, number> = {
    EXCELLENT: 0,
    GOOD: 0,
    FAIR: 0,
    POOR: 0,
    CRITICAL: 0,
  };

  assets.forEach((a: any) => {
    if (a.condition === 'NEW' || a.condition === 'GOOD') conditionCounts.EXCELLENT++;
    else if (a.condition === 'FAIR') conditionCounts.GOOD++;
    else if (a.condition === 'NEEDS_ATTENTION') conditionCounts.FAIR++;
    else if (a.condition === 'POOR') conditionCounts.POOR++;
    else if (a.condition === 'CRITICAL' || a.condition === 'SCRAP') conditionCounts.CRITICAL++;
    else conditionCounts.GOOD++;
  });

  const assetsByCondition = [
    { name: 'Excellent', key: 'EXCELLENT', count: conditionCounts.EXCELLENT, color: '#10b981', percentage: totalAssets > 0 ? Number(((conditionCounts.EXCELLENT / totalAssets) * 100).toFixed(1)) : 0 },
    { name: 'Good', key: 'GOOD', count: conditionCounts.GOOD, color: '#3b82f6', percentage: totalAssets > 0 ? Number(((conditionCounts.GOOD / totalAssets) * 100).toFixed(1)) : 0 },
    { name: 'Fair', key: 'FAIR', count: conditionCounts.FAIR, color: '#f59e0b', percentage: totalAssets > 0 ? Number(((conditionCounts.FAIR / totalAssets) * 100).toFixed(1)) : 0 },
    { name: 'Poor', key: 'POOR', count: conditionCounts.POOR, color: '#f97316', percentage: totalAssets > 0 ? Number(((conditionCounts.POOR / totalAssets) * 100).toFixed(1)) : 0 },
    { name: 'Critical', key: 'CRITICAL', count: conditionCounts.CRITICAL, color: '#ef4444', percentage: totalAssets > 0 ? Number(((conditionCounts.CRITICAL / totalAssets) * 100).toFixed(1)) : 0 },
  ];

  // 5. Maintenance & Repair Spend
  let thisYearMaintenanceCost = 0;
  let thisYearRepairCost = 0;
  const assetCostMap: Record<string, { id: string; assetId: string; name: string; branch: string; maintenanceCost: number; failureCount: number }> = {};

  costEntries.forEach((ce: any) => {
    const amt = Number(ce.amount || 0);
    if (new Date(ce.recordedAt) >= startOfYear) {
      if (ce.costType === 'MAINTENANCE' || ce.costType === 'PARTS') {
        thisYearMaintenanceCost += amt;
      } else {
        thisYearRepairCost += amt;
      }
    }

    if (ce.assetId) {
      if (!assetCostMap[ce.assetId]) {
        assetCostMap[ce.assetId] = {
          id: ce.assetId,
          assetId: ce.asset?.assetId || 'AST',
          name: ce.asset?.name || 'Asset',
          branch: ce.asset?.branch?.name || 'Main',
          maintenanceCost: 0,
          failureCount: 0,
        };
      }
      assetCostMap[ce.assetId].maintenanceCost += amt;
    }
  });

  issues.forEach((iss: any) => {
    if (iss.assetId && assetCostMap[iss.assetId]) {
      assetCostMap[iss.assetId].failureCount++;
    }
  });

  const topMaintenanceCostAssets = Object.values(assetCostMap)
    .sort((a: any, b: any) => b.maintenanceCost - a.maintenanceCost)
    .slice(0, 10);

  // 6. Actionable Alerts
  const serviceDueCount = issues.filter((i: any) => i.status === 'OPEN' || i.status === 'IN_PROGRESS').length;
  const highRepairCount = Object.values(assetCostMap).filter((a: any) => a.maintenanceCost > 15000).length;

  return {
    summary: {
      totalAssets,
      totalPurchaseValue,
      currentAssetValue,
      depreciatedValue,
      underMaintenanceCount,
      underMaintenancePercent: totalAssets > 0 ? Number(((underMaintenanceCount / totalAssets) * 100).toFixed(1)) : 0,
      damagedCount,
      damagedPercent: totalAssets > 0 ? Number(((damagedCount / totalAssets) * 100).toFixed(1)) : 0,
      scrapCount,
      warrantyExpiring30Count,
      amcExpiring30Count,
      amcActiveCount,
      amcActivePercent: totalAssets > 0 ? Number(((amcActiveCount / totalAssets) * 100).toFixed(1)) : 0,
      serviceDueCount,
      thisYearPurchase,
      thisYearMaintenanceCost,
      thisYearRepairCost,
    },
    assetsByBranch,
    assetsByCategory,
    assetsByCondition,
    topMaintenanceCostAssets,
    alerts: {
      warrantyExpiring30: warrantyExpiring30Count,
      amcExpiring30: amcExpiring30Count,
      assetsUnderMaintenance: underMaintenanceCount,
      serviceDue: serviceDueCount,
      highRepairCostAssets: highRepairCount,
    },
  };
}
