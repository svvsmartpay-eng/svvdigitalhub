import crypto from 'crypto';
import prisma from '../../config/database';
import { AppError } from '../../middleware/error.middleware';

/**
 * Generate or retrieve an active service token for an issue
 */
export async function generateServiceToken(issueId: string): Promise<{ token: string; expiresAt: Date; issueNo: string }> {
  const issue = await prisma.issue.findUnique({ where: { id: issueId } });
  if (!issue) throw new AppError(404, 'Issue not found');

  // Generate 24-character secure URL-safe token
  const token = issue.serviceToken || crypto.randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days validity

  await prisma.issue.update({
    where: { id: issueId },
    data: {
      serviceToken: token,
      serviceTokenExpiresAt: expiresAt,
    },
  });

  return { token, expiresAt, issueNo: issue.issueNo };
}

/**
 * Get ticket details by public service token
 */
export async function getTicketByServiceToken(token: string) {
  if (!token) throw new AppError(400, 'Service token is required');

  const issue = await prisma.issue.findUnique({
    where: { serviceToken: token },
    include: {
      asset: {
        select: {
          id: true,
          assetId: true,
          name: true,
          brand: true,
          model: true,
          serialNumber: true,
          category: { select: { name: true } },
          location: { select: { name: true, building: true, room: true } },
        },
      },
      branch: { select: { id: true, name: true, code: true, address: true, city: true } },
      assignedTo: { select: { id: true, name: true, phone: true } },
      IssueComment: {
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true } } },
      },
    },
  });

  if (!issue) {
    throw new AppError(404, 'Invalid or expired Service QR Code token.');
  }

  if (issue.serviceTokenExpiresAt && new Date() > issue.serviceTokenExpiresAt) {
    throw new AppError(400, 'This service link has expired. Please request a new QR code from the branch manager.');
  }

  // Standard checklist for technical visits
  const defaultChecklist = [
    { id: 'power', label: 'Power & Voltage Supply Check', status: 'PASS' },
    { id: 'physical', label: 'Physical Inspection & Cabling', status: 'PASS' },
    { id: 'cleaning', label: 'Internal & External Dust Cleaning', status: 'PASS' },
    { id: 'operational', label: 'Core Component Functionality Test', status: 'PASS' },
    { id: 'network', label: 'Network & Signal Connectivity', status: 'PASS' },
    { id: 'safety', label: 'Earthing & Safety Enclosure Check', status: 'PASS' },
  ];

  return {
    issue: {
      id: issue.id,
      issueNo: issue.issueNo,
      title: issue.title,
      description: issue.description,
      issueType: issue.issueType,
      priority: issue.priority,
      status: issue.status,
      createdAt: issue.createdAt,
      slaResolutionDue: issue.slaResolutionDue,
      photos: issue.photos,
      checklistData: issue.checklistData || defaultChecklist,
      technicianInfo: issue.technicianInfo,
    },
    asset: issue.asset,
    branch: issue.branch,
    assignedTo: issue.assignedTo,
    defaultChecklist,
    recentComments: issue.IssueComment,
  };
}

/**
 * Submit technician service update with GPS Location, what he did, checklist, photos
 */
export async function submitTechnicianUpdate(
  token: string,
  payload: {
    techName: string;
    techPhone?: string;
    company?: string;
    status: 'IN_PROGRESS' | 'RESOLVED' | 'WAITING_FOR_PARTS';
    diagnosisNote?: string;
    actionsTaken?: string;
    checklist?: any[];
    partsUsed?: Array<{ name: string; quantity: number }>;
    location?: { lat: number; lng: number; accuracy?: number };
    remarks?: string;
  },
  uploadedPhotos: string[] = []
) {
  if (!token) throw new AppError(400, 'Token is required');
  if (!payload.techName?.trim()) throw new AppError(400, 'Technician name is required');

  const issue = await prisma.issue.findUnique({
    where: { serviceToken: token },
    include: { asset: true, branch: true },
  });

  if (!issue) throw new AppError(404, 'Invalid service token');

  const now = new Date();
  const mapsUrl = payload.location?.lat && payload.location?.lng
    ? `https://maps.google.com/?q=${payload.location.lat},${payload.location.lng}`
    : undefined;

  const techSummary = {
    name: payload.techName.trim(),
    phone: payload.techPhone?.trim() || null,
    company: payload.company?.trim() || 'Field Service Technician',
    submittedAt: now.toISOString(),
    statusReported: payload.status,
    diagnosisNote: payload.diagnosisNote || null,
    actionsTaken: payload.actionsTaken || null,
    partsUsed: payload.partsUsed || [],
    location: payload.location ? { ...payload.location, mapsUrl } : null,
    photos: uploadedPhotos,
  };

  // 1. Update Issue Status & fields
  const newStatus = payload.status === 'RESOLVED' ? 'RESOLVED' : payload.status === 'WAITING_FOR_PARTS' ? 'OPEN' : 'IN_PROGRESS';

  await prisma.issue.update({
    where: { id: issue.id },
    data: {
      status: newStatus as any,
      resolvedAt: newStatus === 'RESOLVED' ? now : issue.resolvedAt,
      rootCauseNote: payload.diagnosisNote || issue.rootCauseNote,
      checklistData: payload.checklist ? (payload.checklist as any) : undefined,
      technicianInfo: techSummary as any,
    },
  });

  // 2. Create Issue Status History
  await prisma.issueStatusHistory.create({
    data: {
      issueId: issue.id,
      fromStatus: issue.status,
      toStatus: newStatus as any,
      changedBy: `${payload.techName} (${payload.company || 'Technician'})`,
      note: `Field Service Report logged by ${payload.techName}`,
      changedAt: now,
    },
  });

  // 3. Post formatted Timeline Comment with structured tag for rich frontend card rendering
  const structuredReportData = {
    isTechReport: true,
    techName: payload.techName,
    company: payload.company || 'Field Technician',
    techPhone: payload.techPhone,
    status: payload.status,
    diagnosisNote: payload.diagnosisNote,
    actionsTaken: payload.actionsTaken,
    partsUsed: payload.partsUsed,
    location: payload.location ? { ...payload.location, mapsUrl } : null,
    checklist: payload.checklist,
    remarks: payload.remarks,
  };

  const timelineContent = `<!--TECH_REPORT_START-->${JSON.stringify(structuredReportData)}<!--TECH_REPORT_END-->\n` +
    `🛠️ Field Service Update by ${payload.techName} (${payload.company || 'Field Tech'})\n` +
    (payload.actionsTaken ? `• Work Done: ${payload.actionsTaken}\n` : '') +
    (payload.diagnosisNote ? `• Findings: ${payload.diagnosisNote}\n` : '') +
    (mapsUrl ? `• Verified GPS Location: ${mapsUrl}\n` : '');

  const adminUser = await prisma.user.findFirst({
    where: { organizationId: issue.organizationId },
    select: { id: true },
  });

  if (adminUser) {
    await prisma.issueComment.create({
      data: {
        issueId: issue.id,
        userId: adminUser.id,
        content: timelineContent,
        attachments: uploadedPhotos,
        createdAt: now,
      },
    });
  }

  // Dispatch in-app notification to ticket creator (Staff) and managers
  try {
    const { sendTicketNotification } = await import('../issues/issues.service');
    await sendTicketNotification({
      orgId: issue.organizationId,
      issueId: issue.id,
      actorId: adminUser?.id || 'external-tech',
      actorName: payload.techName.trim() || 'Field Technician',
      type: 'SERVICE_REPORT',
      details: payload.actionsTaken || payload.diagnosisNote || `Technician marked status as ${newStatus}`,
    });
  } catch { /* non-fatal */ }

  return {
    success: true,
    message: 'Service update logged successfully. Manager notified.',
    issueNo: issue.issueNo,
    status: newStatus,
  };
}
