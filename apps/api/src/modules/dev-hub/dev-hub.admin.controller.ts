import { Request, Response } from 'express';
import prisma from '../../config/database';
import { AuthRequest } from '../../middleware/auth.middleware';

export const getCategories = async (req: Request, res: Response) => {
  const categories = await prisma.devIssueCategory.findMany({
    orderBy: [{ group: 'asc' }, { name: 'asc' }]
  });
  res.json({ success: true, data: categories });
};

export const createCategory = async (req: Request, res: Response) => {
  const { name, group } = req.body;
  const cat = await prisma.devIssueCategory.create({ data: { name, group } });
  res.json({ success: true, data: cat });
};

export const getTeams = async (req: Request, res: Response) => {
  const teams = await prisma.devTeam.findMany({ orderBy: { name: 'asc' } });
  res.json({ success: true, data: teams });
};

export const createTeam = async (req: Request, res: Response) => {
  const { name, contactEmail, contactPhone } = req.body;
  const team = await prisma.devTeam.create({ data: { name, contactEmail, contactPhone } });
  res.json({ success: true, data: team });
};

export const getIssues = async (req: Request, res: Response) => {
  const { status, priority, categoryId, teamId } = req.query;
  const where: any = {};
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (categoryId) where.categoryId = categoryId;
  if (teamId) where.assignedTeamId = teamId;

  const issues = await prisma.devIssue.findMany({
    where,
    include: {
      category: true,
      assignedTeam: true,
      attachments: true,
    },
    orderBy: { createdAt: 'desc' }
  });
  res.json({ success: true, data: issues });
};

export const createIssue = async (req: AuthRequest, res: Response) => {
  const { title, description, categoryId, priority, expectedResult, currentResult, assignedTeamId, dueDate, tags, attachments } = req.body;
  
  // Generate ticket code e.g. #DEV-0001
  const count = await prisma.devIssue.count();
  const ticketCode = `#DEV-${String(count + 1000).padStart(4, '0')}`;
  
  const authorName = req.user?.email || 'SVV Admin';

  const issue = await prisma.devIssue.create({
    data: {
      ticketCode, title, description, categoryId, priority,
      expectedResult, currentResult, assignedTeamId,
      dueDate: dueDate ? new Date(dueDate) : null,
      tags: JSON.stringify(tags || []),
      createdBy: authorName,
      status: 'OPEN',
      timeline: {
        create: {
          action: 'Issue Created',
          newStatus: 'OPEN',
          authorType: 'SVV_ADMIN',
          authorName,
        }
      },
      attachments: attachments ? {
        create: attachments.map((a: any) => ({ url: a.url, type: a.type }))
      } : undefined
    }
  });

  res.json({ success: true, data: issue });
};

export const getIssueDetails = async (req: Request, res: Response) => {
  const issue = await prisma.devIssue.findUnique({
    where: { id: req.params.id },
    include: {
      category: true,
      assignedTeam: true,
      attachments: true,
      timeline: { orderBy: { createdAt: 'desc' } }
    }
  });
  if (!issue) return res.status(404).json({ success: false, error: 'Issue not found' });
  res.json({ success: true, data: issue });
};

export const updateIssueStatus = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, comment } = req.body;
  const authorName = req.user?.email || 'SVV Admin';

  const issue = await prisma.devIssue.findUnique({ where: { id } });
  if (!issue) return res.status(404).json({ success: false, error: 'Issue not found' });

  const updated = await prisma.devIssue.update({
    where: { id },
    data: {
      status,
      timeline: {
        create: {
          action: 'Status Updated',
          oldStatus: issue.status,
          newStatus: status,
          comment,
          authorType: 'SVV_ADMIN',
          authorName
        }
      }
    }
  });
  res.json({ success: true, data: updated });
};

export const addComment = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { comment } = req.body;
  const authorName = req.user?.email || 'SVV Admin';

  const tl = await prisma.devIssueTimeline.create({
    data: {
      issueId: id,
      action: 'Comment Added',
      comment,
      authorType: 'SVV_ADMIN',
      authorName
    }
  });
  res.json({ success: true, data: tl });
};

