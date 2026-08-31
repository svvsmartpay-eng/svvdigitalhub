import prisma from '../../config/database';

export async function getDailyAlerts(orgId: string, userId: string, primaryBranchId?: string) {
  const alerts = [];
  const month = new Date().getMonth() + 1;
  const day = new Date().getDate();

  if (primaryBranchId) {
    const branchUsers = await prisma.user.findMany({
      where: { organizationId: orgId, showBirthdayWishes: true, userBranches: { some: { branchId: primaryBranchId } } },
      select: { id: true, name: true, dob: true, photoUrl: true, designation: true }
    });

    for (const u of branchUsers) {
      if (u.dob && u.id !== userId && u.dob.getMonth() + 1 === month && u.dob.getDate() === day) {
        alerts.push({ 
          id: `bday-${u.id}`, 
          type: 'BIRTHDAY', 
          title: `Happy Birthday, ${u.name}!`, 
          message: `Wish them a happy birthday! (${u.designation || 'Colleague'})`, 
          priority: 'HIGH', 
          actionData: { userId: u.id, photoUrl: u.photoUrl } 
        });
      }
    }

    const onLeaveUsers = await prisma.user.findMany({
      where: { organizationId: orgId, isOnLeave: true, userBranches: { some: { branchId: primaryBranchId } } },
      select: { id: true, name: true, designation: true }
    });

    for (const u of onLeaveUsers) {
      if (u.id !== userId) { 
        alerts.push({ 
          id: `leave-${u.id}`, 
          type: 'LEAVE', 
          title: `${u.name} is on leave`, 
          message: `${u.designation || 'Staff'} is out of office today.`, 
          priority: 'INFO' 
        }); 
      }
    }
  }

  const backedUpUsers = await prisma.user.findMany({
    where: { organizationId: orgId, backupPersonId: userId, isOnLeave: true },
    select: { id: true, name: true }
  });

  if (backedUpUsers.length > 0) {
    const backedUpIds = backedUpUsers.map(u => u.id);
    const pendingIssues = await prisma.issue.findMany({
      where: { organizationId: orgId, raisedById: { in: backedUpIds }, status: { in: ['OPEN', 'REVIEWED'] } },
      select: { id: true, issueNo: true, title: true, raisedBy: { select: { name: true } } },
      take: 5
    });

    for (const issue of pendingIssues) {
      alerts.push({ 
        id: `fallback-issue-${issue.id}`, 
        type: 'FOLLOW_UP', 
        title: `Fallback: ${issue.title}`, 
        message: `Covering for ${issue.raisedBy?.name} (On Leave) - Issue #${issue.issueNo}`, 
        priority: 'MEDIUM', 
        actionData: { link: `/issues/${issue.id}` } 
      });
    }
  }

  return alerts;
}
