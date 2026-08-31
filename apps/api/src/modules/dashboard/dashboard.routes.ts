import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import prisma from '../../config/database';

const router = Router();
router.use(authenticate);

// Main dashboard data
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.orgId;
    
    // Parse filters
    const branchQuery = req.query.branchId as string | undefined;
    const branchIds = branchQuery ? branchQuery.split(',') : [];
    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : null;
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : null;

    const assetWhere: any = { organizationId: orgId, isActive: true };
    const issueWhere: any = { organizationId: orgId };
    const visitWhere: any = { organizationId: orgId };
    
    if (branchIds.length > 0) { 
      assetWhere.branchId = { in: branchIds }; 
      issueWhere.branchId = { in: branchIds }; 
      visitWhere.branchId = { in: branchIds }; 
    }

    if (dateFrom && dateTo) {
      // Apply date filters where it makes sense (creation time / record time)
      issueWhere.createdAt = { gte: dateFrom, lte: dateTo };
      visitWhere.createdAt = { gte: dateFrom, lte: dateTo };
    }

    const now = new Date();
    const monthStart = dateFrom || new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = dateFrom || new Date(now.getFullYear(), 3, 1);
    const costDateFilter = dateFrom && dateTo ? { gte: dateFrom, lte: dateTo } : { gte: monthStart };
    const ytdDateFilter = dateFrom && dateTo ? { gte: dateFrom, lte: dateTo } : { gte: yearStart };
    const next7days = dateTo || new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalAssets, operationalAssets, breakdownAssets,
      openIssues, criticalIssues, inProgressVisits,
      pmDue, pmOverdue,
      todayCost, monthCost, ytdCost, totalMaintenanceCost,
      slaBreaches,
      recentIssues, recentVisits,
      assetsByStatus, issuesByPriority,
      allAssetsWithCosts,
      assetsNeedingReplacement,
    ] = await Promise.all([
      prisma.asset.count({ where: assetWhere }),
      prisma.asset.count({ where: { ...assetWhere, status: 'OPERATIONAL' } }),
      prisma.asset.count({ where: { ...assetWhere, status: 'BREAKDOWN' } }),
      prisma.issue.count({ where: { ...issueWhere, status: { in: ['OPEN', 'REVIEWED', 'ASSIGNED', 'SCHEDULED'] } } }),
      prisma.issue.count({ where: { ...issueWhere, priority: { in: ['CRITICAL', 'HIGH'] }, status: { not: 'CLOSED' } } }),
      prisma.serviceVisit.count({ where: { ...visitWhere, status: 'IN_PROGRESS' } }),
      prisma.pMSchedule.count({ where: { dueDate: { lte: next7days, gte: now }, status: 'UPCOMING' } }),
      prisma.pMSchedule.count({ where: { dueDate: { lt: now }, status: { in: ['UPCOMING', 'DUE'] } } }),
      prisma.costEntry.aggregate({ where: { organizationId: orgId, ...(branchIds.length > 0 ? { branchId: { in: branchIds } } : {}), recordedAt: { gte: todayStart } }, _sum: { amount: true } }),
      prisma.costEntry.aggregate({ where: { organizationId: orgId, ...(branchIds.length > 0 ? { branchId: { in: branchIds } } : {}), recordedAt: costDateFilter }, _sum: { amount: true } }),
      prisma.costEntry.aggregate({ where: { organizationId: orgId, ...(branchIds.length > 0 ? { branchId: { in: branchIds } } : {}), recordedAt: ytdDateFilter }, _sum: { amount: true } }),
      prisma.costEntry.aggregate({ where: { organizationId: orgId, ...(branchIds.length > 0 ? { branchId: { in: branchIds } } : {}) }, _sum: { amount: true } }),
      prisma.issue.count({ where: { ...issueWhere, slaResolutionBreached: true } }),
      prisma.issue.findMany({
        where: issueWhere, orderBy: { createdAt: 'desc' }, take: 10,
        include: { asset: { select: { assetId: true, name: true } }, branch: { select: { code: true } }, raisedBy: { select: { name: true } } },
      }),
      prisma.serviceVisit.findMany({
        where: visitWhere, orderBy: { createdAt: 'desc' }, take: 10,
        include: { asset: { select: { assetId: true, name: true } }, technician: { select: { name: true } } },
      }),
      prisma.asset.groupBy({ by: ['status'], where: assetWhere, _count: true }),
      prisma.issue.groupBy({ by: ['priority'], where: issueWhere, _count: true }),
      // Top cost assets query
      prisma.asset.findMany({
        where: assetWhere,
        select: {
          id: true, assetId: true, name: true, purchaseCost: true, healthScore: true, healthStatus: true,
          branch: { select: { code: true, name: true } },
          category: { select: { name: true } },
          costEntries: { select: { amount: true } },
        },
      }),
      // Replacement planning query
      prisma.asset.findMany({
        where: {
          ...assetWhere,
          OR: [
            { healthStatus: 'CRITICAL' },
            { healthScore: { lt: 40 } },
            { condition: { in: ['POOR', 'SCRAP'] } },
          ],
        },
        select: {
          id: true, assetId: true, name: true, purchaseCost: true, healthScore: true, healthStatus: true, condition: true,
          branch: { select: { code: true, name: true } },
          category: { select: { name: true } },
          costEntries: { select: { amount: true } },
          replacementReviews: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
        take: 10,
      }),
    ]);

    // Format top cost assets
    const topCostAssets = allAssetsWithCosts
      .map((a) => {
        const totalCost = a.costEntries.reduce((sum, c) => sum + Number(c.amount || 0), 0);
        const pCost = Number(a.purchaseCost || 0);
        const ratio = pCost > 0 ? (totalCost / pCost) * 100 : 0;
        return {
          id: a.id,
          assetId: a.assetId,
          name: a.name,
          branch: a.branch,
          category: a.category?.name,
          purchaseCost: pCost,
          totalMaintenanceCost: totalCost,
          spendRatio: Number(ratio.toFixed(1)),
          healthScore: a.healthScore ?? 85,
          healthStatus: a.healthStatus,
        };
      })
      .sort((a, b) => b.totalMaintenanceCost - a.totalMaintenanceCost)
      .slice(0, 5);

    // Format assets needing replacement
    const formattedReplacementAssets = assetsNeedingReplacement.map((a) => {
      const totalCost = a.costEntries.reduce((sum, c) => sum + Number(c.amount || 0), 0);
      const pCost = Number(a.purchaseCost || 0);
      const ratio = pCost > 0 ? (totalCost / pCost) * 100 : 0;
      return {
        id: a.id,
        assetId: a.assetId,
        name: a.name,
        branch: a.branch,
        category: a.category?.name,
        purchaseCost: pCost,
        totalMaintenanceCost: totalCost,
        spendRatio: Number(ratio.toFixed(1)),
        healthScore: a.healthScore ?? 35,
        healthStatus: a.healthStatus,
        condition: a.condition,
        recommendation: a.replacementReviews?.[0]?.recommendation || 'REPLACE',
      };
    });

    // Branch comparison (only if admin)
    const branches = await prisma.branch.findMany({ where: { organizationId: orgId, isActive: true } });
    const branchStats = await Promise.all(branches.map(async (b) => {
      const [assets, issues, cost] = await Promise.all([
        prisma.asset.count({ where: { organizationId: orgId, branchId: b.id, isActive: true } }),
        prisma.issue.count({ where: { organizationId: orgId, branchId: b.id, status: { not: 'CLOSED' } } }),
        prisma.costEntry.aggregate({ where: { organizationId: orgId, branchId: b.id, recordedAt: { gte: monthStart } }, _sum: { amount: true } }),
      ]);
      return { branchId: b.id, branchCode: b.code, branchName: b.name, assets, openIssues: issues, monthCost: cost._sum.amount || 0 };
    }));

    // Per-user stats for STAFF/TECHNICIAN roles
    const userId = req.user!.sub;
    const userRole = req.user!.primaryRole;
    let userStats: any = null;

    if (userRole === 'STAFF') {
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const [
        myOpenIssues, 
        myPMDue, 
        issuesToVerify, 
        completedIssuesToday, 
        overduePMs,
        pendingPMs,
        myRecentActionableIssues,
        myUpcomingPMs
      ] = await Promise.all([
        prisma.issue.count({ where: { organizationId: orgId, raisedById: userId, status: { not: 'CLOSED' } } }),
        prisma.pMSchedule.count({ where: { plan: { organizationId: orgId }, assignedTo: userId, status: { in: ['UPCOMING', 'DUE'] }, dueDate: { lte: next7days } } }),
        
        // Tasks requiring action
        prisma.issue.count({ where: { organizationId: orgId, raisedById: userId, status: 'RESOLVED' } }),
        
        // Completed today
        prisma.issue.count({ where: { organizationId: orgId, raisedById: userId, status: 'CLOSED', updatedAt: { gte: startOfToday } } }),
        
        // Delayed/Overdue
        prisma.pMSchedule.count({ where: { plan: { organizationId: orgId }, assignedTo: userId, status: { in: ['UPCOMING', 'DUE'] }, dueDate: { lt: startOfToday } } }),
        
        // Pending
        prisma.issue.count({ where: { organizationId: orgId, raisedById: userId, status: { in: ['OPEN', 'REVIEWED'] } } }),

        // Actionable items list
        prisma.issue.findMany({ 
          where: { organizationId: orgId, raisedById: userId, status: { in: ['RESOLVED', 'OPEN', 'WAITING_FOR_APPROVAL'] } },
          orderBy: { updatedAt: 'desc' },
          take: 10,
          include: { asset: { select: { name: true } } }
        }),

        prisma.pMSchedule.findMany({
          where: { plan: { organizationId: orgId }, assignedTo: userId, status: { in: ['UPCOMING', 'DUE'] }, dueDate: { lte: next7days } },
          orderBy: { dueDate: 'asc' },
          take: 10,
          include: { plan: true }
        })
      ]);

      const todaysTasks = issuesToVerify + pendingPMs; // just a metric

      userStats = { 
        myOpenIssues, 
        myPMDue, 
        todaysTasks,
        completedToday: completedIssuesToday,
        pending: pendingPMs,
        delayed: overduePMs,
        actionableIssues: myRecentActionableIssues,
        actionablePMs: myUpcomingPMs
      };
    }

    if (userRole === 'TECHNICIAN') {
      const [myActiveJobs, myCompletedToday] = await Promise.all([
        prisma.serviceVisit.count({ where: { organizationId: orgId, status: 'IN_PROGRESS' } }),
        prisma.serviceVisit.count({
          where: {
            organizationId: orgId, status: 'CLOSED',
            checkOut: { checkOutAt: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) } },
          },
        }),
      ]);
      userStats = { myActiveJobs, myCompletedToday };
    }

    res.json({
      success: true,
      data: {
        summary: {
          totalAssets, operationalAssets, breakdownAssets,
          openIssues, criticalIssues, inProgressVisits,
          pmDue, pmOverdue, slaBreaches,
          todayCost: todayCost._sum.amount || 0,
          monthCost: monthCost._sum.amount || 0,
          ytdCost: ytdCost._sum.amount || 0,
          totalMaintenanceCost: totalMaintenanceCost._sum.amount || 0,
          needingReplacementCount: formattedReplacementAssets.length,
        },
        assetsByStatus,
        issuesByPriority,
        recentIssues,
        recentVisits,
        branchStats,
        topCostAssets,
        assetsNeedingReplacement: formattedReplacementAssets,
        userStats,
      },
    });
  } catch (err) { next(err); }
});

export default router;
