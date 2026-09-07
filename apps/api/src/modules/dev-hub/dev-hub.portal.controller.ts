import { Response } from 'express';
import prisma from '../../config/database';
import { PortalRequest } from './dev-hub.portal.middleware';

export const getDashboardInfo = async (req: PortalRequest, res: Response) => {
  const teamId = req.team.id;
  const issues = await prisma.devIssue.findMany({
    where: { assignedTeamId: teamId },
    include: { category: true }
  });

  const total = issues.length;
  const pending = issues.filter((i: any) => !['COMPLETED_BY_DEV', 'VERIFIED_BY_SVV', 'CLOSED'].includes(i.status)).length;
  const completed = issues.filter((i: any) => ['COMPLETED_BY_DEV', 'VERIFIED_BY_SVV', 'CLOSED'].includes(i.status)).length;

  res.json({
    success: true,
    data: {
      teamName: req.team.name,
      stats: { total, pending, completed },
      issues: issues.sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime())
    }
  });
};

export const getIssueDetails = async (req: PortalRequest, res: Response) => {
  const issue = await prisma.devIssue.findUnique({
    where: { id: req.params.id },
    include: {
      category: true,
      attachments: true,
      timeline: { orderBy: { createdAt: 'desc' } }
    }
  });
  
  if (!issue || issue.assignedTeamId !== req.team.id) {
    return res.status(404).json({ success: false, error: 'Issue not found or not assigned to your team' });
  }

  res.json({ success: true, data: issue });
};

export const updateIssueStatus = async (req: PortalRequest, res: Response) => {
  const { id } = req.params;
  const { status, rootCause, fixDetails, deploymentDetails, comment } = req.body;
  
  const issue = await prisma.devIssue.findUnique({ where: { id } });
  if (!issue || issue.assignedTeamId !== req.team.id) {
    return res.status(404).json({ success: false, error: 'Issue not found' });
  }

  // Restrictions
  if (['VERIFIED_BY_SVV', 'CLOSED'].includes(status)) {
    return res.status(403).json({ success: false, error: 'Developers cannot mark issues as Verified or Closed' });
  }

  // Mandatory fields for completed
  if (status === 'COMPLETED_BY_DEV') {
    if (!rootCause || !fixDetails || !deploymentDetails) {
      return res.status(400).json({ success: false, error: 'Root Cause, Fix Details, and Deployment Details are mandatory for completion.' });
    }
  }

  const updated = await prisma.devIssue.update({
    where: { id },
    data: {
      status,
      timeline: {
        create: {
          action: 'Status Updated (Dev)',
          oldStatus: issue.status,
          newStatus: status,
          rootCause,
          fixDetails,
          deploymentDetails,
          comment,
          authorType: 'DEVELOPER',
          authorName: req.team.name
        }
      }
    }
  });

  res.json({ success: true, data: updated });
};

export const addComment = async (req: PortalRequest, res: Response) => {
  const { id } = req.params;
  const { comment } = req.body;

  const issue = await prisma.devIssue.findUnique({ where: { id } });
  if (!issue || issue.assignedTeamId !== req.team.id) {
    return res.status(404).json({ success: false, error: 'Issue not found' });
  }

  const tl = await prisma.devIssueTimeline.create({
    data: {
      issueId: id,
      action: 'Comment Added',
      comment,
      authorType: 'DEVELOPER',
      authorName: req.team.name
    }
  });

  res.json({ success: true, data: tl });
};
