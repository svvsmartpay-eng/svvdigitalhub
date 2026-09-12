import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// ─── UUID helper ─────────────────────────────────────────────
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try { return crypto.randomUUID(); } catch (_) {}
  }
  return 'uuid-' + Date.now() + '-' + Math.random().toString(36).substring(2, 11);
}

// Fire-and-forget: await a supabase call but swallow errors
async function tryInsert(query: any) {
  try { await query; } catch (_) {}
}

// ─── Status helpers ───────────────────────────────────────────
export const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Open',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  WAITING_VENDOR: 'Waiting Vendor',
  WAITING_CUSTOMER: 'Waiting Customer',
  RESOLVED: 'Resolved',
  REOPENED: 'Reopened',
  CLOSED: 'Closed',
  // Legacy statuses (kept for backward compat)
  DEV_COMPLETED: 'Dev Completed',
  TESTING: 'Testing',
  TEST_FAILED: 'Test Failed',
  READY_FOR_DEPLOY: 'Ready for Deployment',
  NEED_INFO: 'Need Info',
  COMPLETED_BY_DEV: 'Dev Completed',
  VERIFIED_BY_SVV: 'Verified by SVV',
};

export const STATUS_TIMELINE_ACTION: Record<string, string> = {
  OPEN: 'Ticket Opened',
  ASSIGNED: 'Assigned to Vendor',
  IN_PROGRESS: 'Vendor Started Work',
  WAITING_VENDOR: 'Waiting for Vendor Response',
  WAITING_CUSTOMER: 'Waiting for Customer Feedback',
  RESOLVED: 'Issue Resolved',
  REOPENED: 'Issue Reopened',
  CLOSED: 'Ticket Closed',
  // Legacy
  DEV_COMPLETED: 'Development Completed',
  TESTING: 'Testing Started',
  TEST_FAILED: 'Test Failed — Reopened',
  READY_FOR_DEPLOY: 'Ready for Deployment',
  NEED_INFO: 'More Info Requested',
  COMPLETED_BY_DEV: 'Development Completed',
  VERIFIED_BY_SVV: 'Verified by SVV Team',
};

// Admin-only statuses (only admin can set these)
export const ADMIN_ONLY_STATUSES = ['CLOSED', 'REOPENED', 'RESOLVED'];

// All allowed status transitions in order
export const ALL_STATUSES = [
  'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_VENDOR',
  'WAITING_CUSTOMER', 'RESOLVED', 'REOPENED', 'CLOSED'
];

// ─── Upload attachment to Supabase storage ────────────────────
export async function uploadDevHubFile(
  file: File,
  issueId: string
): Promise<{ url: string; type: string }> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const path = `${issueId}/${generateUUID()}.${ext}`;
  
  // Determine type
  let type = 'DOCUMENT';
  if (file.type.startsWith('image/')) type = 'IMAGE';
  else if (file.type.startsWith('video/')) type = 'VIDEO';
  else if (file.type === 'application/pdf') type = 'DOCUMENT';

  const { error: uploadError } = await supabase.storage
    .from('dev-hub-attachments')
    .upload(path, file, { upsert: false, contentType: file.type });

  if (uploadError) {
    // Fallback: store as external URL reference if bucket doesn't exist
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  const { data: publicData } = supabase.storage
    .from('dev-hub-attachments')
    .getPublicUrl(path);

  return { url: publicData.publicUrl, type };
}

// ─── ADMIN API ────────────────────────────────────────────────

export function useDevCategories() {
  return useQuery({
    queryKey: ['dev-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('DevIssueCategory')
        .select('*')
        .order('group', { ascending: true })
        .order('name', { ascending: true });
      if (error) { console.warn('categories error:', error.message); return []; }
      return data || [];
    }
  });
}

export function useDevTeams() {
  return useQuery({
    queryKey: ['dev-teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('DevTeam')
        .select('*')
        .order('name', { ascending: true });
      if (error) { console.warn('teams error:', error.message); return []; }
      return data || [];
    }
  });
}

export function useDevIssues(filters: any = {}) {
  return useQuery({
    queryKey: ['dev-issues', filters],
    queryFn: async () => {
      let q = supabase
        .from('DevIssue')
        .select('*, category:DevIssueCategory(*), assignedTeam:DevTeam(*)')
        .order('createdAt', { ascending: false });

      if (filters.status) q = q.eq('status', filters.status);
      if (filters.priority) q = q.eq('priority', filters.priority);
      if (filters.categoryId) q = q.eq('categoryId', filters.categoryId);
      if (filters.teamId) q = q.eq('assignedTeamId', filters.teamId);

      const { data, error } = await q;
      if (error) { console.warn('issues error:', error.message); return []; }

      // Fetch attachments for all issues
      const issueIds = (data || []).map((i: any) => i.id);
      if (issueIds.length > 0) {
        const { data: attachments } = await supabase
          .from('DevIssueAttachment')
          .select('*')
          .in('issueId', issueIds);
        const attMap: Record<string, any[]> = {};
        (attachments || []).forEach((a: any) => {
          if (!attMap[a.issueId]) attMap[a.issueId] = [];
          attMap[a.issueId].push(a);
        });
        return (data || []).map((i: any) => ({ ...i, attachments: attMap[i.id] || [] }));
      }
      return (data || []).map((i: any) => ({ ...i, attachments: [] }));
    }
  });
}

// ─── CREATE ISSUE (simplified: title, desc, priority + optional attachments)
export function useCreateDevIssue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      title: string;
      description: string;
      priority: string;
      attachmentFiles?: File[];
    }) => {
      // 1. Collision-safe ticket code
      let ticketCode = '';
      try {
        const { data: allCodes } = await supabase.from('DevIssue').select('ticketCode');
        let maxNum = 1000;
        (allCodes || []).forEach((row: any) => {
          if (typeof row.ticketCode === 'string' && /^#DEV-\d+$/.test(row.ticketCode)) {
            const n = parseInt(row.ticketCode.replace('#DEV-', ''), 10);
            if (!isNaN(n) && n > maxNum) maxNum = n;
          }
        });
        ticketCode = `#DEV-${String(maxNum + 1).padStart(4, '0')}`;
        const { data: existing } = await supabase.from('DevIssue').select('id').eq('ticketCode', ticketCode).limit(1);
        if (existing && existing.length > 0) ticketCode = `#DEV-${Date.now().toString().slice(-6)}`;
      } catch (_) {
        ticketCode = `#DEV-${Date.now().toString().slice(-6)}`;
      }

      // 2. Fallback category
      let catId: string | undefined;
      const { data: cats } = await supabase.from('DevIssueCategory').select('id').limit(1);
      catId = cats?.[0]?.id;

      const issueId = generateUUID();
      const nowIso = new Date().toISOString();

      const newIssue = {
        id: issueId,
        ticketCode,
        title: (data.title || '').trim() || 'Untitled Issue',
        description: (data.description || '').trim() || 'No description provided',
        categoryId: catId,
        priority: data.priority || 'MEDIUM',
        status: 'OPEN',
        createdBy: 'SVV Admin',
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      const { data: created, error } = await supabase
        .from('DevIssue').insert([newIssue]).select().single();
      if (error) throw new Error(error.message || 'Failed to create ticket');

      // 3. Timeline: Issue Created
      await tryInsert(supabase.from('DevIssueTimeline').insert([{
        id: generateUUID(), issueId: created.id,
        action: 'Ticket Created', newStatus: 'OPEN',
        authorType: 'SVV_ADMIN', authorName: 'SVV Admin', createdAt: nowIso,
      }]));

      // 4. Upload attachments if any
      if (data.attachmentFiles && data.attachmentFiles.length > 0) {
        for (const file of data.attachmentFiles) {
          try {
            const { url, type } = await uploadDevHubFile(file, created.id);
            await supabase.from('DevIssueAttachment').insert([{
              id: generateUUID(), issueId: created.id, url, type, createdAt: nowIso,
            }]);
            await tryInsert(supabase.from('DevIssueTimeline').insert([{
              id: generateUUID(), issueId: created.id,
              action: `Attachment Added: ${file.name}`,
              authorType: 'SVV_ADMIN', authorName: 'SVV Admin', createdAt: nowIso,
            }]));
          } catch (uploadErr) {
            console.warn('Attachment upload failed:', uploadErr);
          }
        }
      }

      return created;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dev-issues'] })
  });
}

// ─── UPDATE STATUS (admin)
export function useUpdateDevIssueStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, comment }: { id: string; status: string; comment?: string }) => {
      const nowIso = new Date().toISOString();
      const { data: updated, error } = await supabase
        .from('DevIssue').update({ status, updatedAt: nowIso }).eq('id', id).select().single();
      if (error) throw new Error(error.message);

      const action = STATUS_TIMELINE_ACTION[status] || `Status changed to ${status}`;
      await tryInsert(supabase.from('DevIssueTimeline').insert([{
        id: generateUUID(), issueId: id,
        action, newStatus: status,
        comment: comment || null,
        authorType: 'SVV_ADMIN', authorName: 'SVV Admin', createdAt: nowIso,
      }]));

      return updated;
    },
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: ['dev-issues'] });
      queryClient.invalidateQueries({ queryKey: ['dev-issue-details', v.id] });
    }
  });
}

// ─── UPDATE TICKET (admin edit: title/description)
export function useUpdateDevIssue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, title, description, priority }: {
      id: string; title?: string; description?: string; priority?: string;
    }) => {
      const nowIso = new Date().toISOString();
      const updates: any = { updatedAt: nowIso };
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (priority !== undefined) updates.priority = priority;

      const { data: updated, error } = await supabase
        .from('DevIssue').update(updates).eq('id', id).select().single();
      if (error) throw new Error(error.message);

      await tryInsert(supabase.from('DevIssueTimeline').insert([{
        id: generateUUID(), issueId: id,
        action: 'Ticket Updated by Admin',
        comment: `Fields updated: ${Object.keys(updates).filter(k => k !== 'updatedAt').join(', ')}`,
        authorType: 'SVV_ADMIN', authorName: 'SVV Admin', createdAt: nowIso,
      }]));

      return updated;
    },
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: ['dev-issues'] });
      queryClient.invalidateQueries({ queryKey: ['dev-issue-details', v.id] });
    }
  });
}

// ─── DELETE TICKET (admin only)
export function useDeleteDevIssue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Delete timeline + attachments first, then the issue
      try { await supabase.from('DevIssueTimeline').delete().eq('issueId', id); } catch (_) {}
      try { await supabase.from('DevIssueAttachment').delete().eq('issueId', id); } catch (_) {}
      const { error } = await supabase.from('DevIssue').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dev-issues'] })
  });
}

// ─── ADD COMMENT (admin or vendor, with optional attachment URLs)
export function useAddDevIssueComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, comment, attachmentFiles, authorType = 'SVV_ADMIN', authorName = 'SVV Admin' }: {
      id: string; comment: string; attachmentFiles?: File[]; authorType?: string; authorName?: string;
    }) => {
      const nowIso = new Date().toISOString();

      // Upload any attachment files
      const uploadedUrls: string[] = [];
      for (const file of (attachmentFiles || [])) {
        try {
          const { url } = await uploadDevHubFile(file, id);
          uploadedUrls.push(url);
          try {
            await supabase.from('DevIssueAttachment').insert([{
              id: generateUUID(), issueId: id, url,
              type: file.type.startsWith('image/') ? 'IMAGE' : file.type.startsWith('video/') ? 'VIDEO' : 'DOCUMENT',
              createdAt: nowIso,
            }]);
          } catch (_) {}
        } catch (e) { console.warn('Comment attachment upload failed:', e); }
      }

      // Build comment with attachment references
      const fullComment = uploadedUrls.length > 0
        ? `${comment}\n\n[Attachments: ${uploadedUrls.join(', ')}]`
        : comment;

      const { data, error } = await supabase.from('DevIssueTimeline').insert([{
        id: generateUUID(), issueId: id,
        action: authorType === 'VENDOR' ? 'Vendor Comment' : 'Admin Comment',
        comment: fullComment,
        authorType, authorName, createdAt: nowIso,
      }]).select().single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (_, v) => queryClient.invalidateQueries({ queryKey: ['dev-issue-details', v.id] })
  });
}

// ─── UPLOAD ATTACHMENT TO EXISTING ISSUE
export function useAddDevIssueAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ issueId, file }: { issueId: string; file: File }) => {
      const nowIso = new Date().toISOString();
      const { url, type } = await uploadDevHubFile(file, issueId);
      const { data, error } = await supabase.from('DevIssueAttachment').insert([{
        id: generateUUID(), issueId, url, type, createdAt: nowIso,
      }]).select().single();
      if (error) throw new Error(error.message);

      await tryInsert(supabase.from('DevIssueTimeline').insert([{
        id: generateUUID(), issueId,
        action: `Attachment Added: ${file.name}`,
        authorType: 'SVV_ADMIN', authorName: 'SVV Admin', createdAt: nowIso,
      }]));

      return { ...data, url, type };
    },
    onSuccess: (_, v) => queryClient.invalidateQueries({ queryKey: ['dev-issue-details', v.issueId] })
  });
}

// ─── GET ISSUE DETAILS (with timeline + attachments)
export function useDevIssueDetails(id: string) {
  return useQuery({
    queryKey: ['dev-issue-details', id],
    queryFn: async () => {
      const { data: issue, error } = await supabase
        .from('DevIssue')
        .select('*, category:DevIssueCategory(*), assignedTeam:DevTeam(*)')
        .eq('id', id).single();
      if (error || !issue) return null;

      const { data: timeline } = await supabase
        .from('DevIssueTimeline').select('*')
        .eq('issueId', id).order('createdAt', { ascending: false });

      const { data: attachments } = await supabase
        .from('DevIssueAttachment').select('*')
        .eq('issueId', id).order('createdAt', { ascending: false });

      return { ...issue, timeline: timeline || [], attachments: attachments || [] };
    },
    enabled: !!id
  });
}

// ─── GET VENDOR TICKETS (for summary card)
export function useVendorTickets(vendorId?: string) {
  return useQuery({
    queryKey: ['vendor-tickets', vendorId],
    queryFn: async () => {
      if (!vendorId) return [];
      const { data, error } = await supabase
        .from('DevIssue')
        .select('*')
        .eq('assignedTeamId', vendorId);
      if (error) { console.warn(error); return []; }
      return data || [];
    },
    enabled: !!vendorId
  });
}

// ─── PORTAL API (Public — developer links, no auth required) ──

export function usePortalDashboard(token: string) {
  return useQuery({
    queryKey: ['dev-portal', token],
    queryFn: async () => {
      const { data: team } = await supabase
        .from('DevTeam').select('*').eq('publicToken', token).single();
      if (!team) return null;

      const { data: issues } = await supabase
        .from('DevIssue')
        .select('*, category:DevIssueCategory(*)')
        .eq('assignedTeamId', team.id)
        .order('createdAt', { ascending: false });

      // Fetch attachments
      const issueIds = (issues || []).map((i: any) => i.id);
      let attMap: Record<string, any[]> = {};
      if (issueIds.length > 0) {
        const { data: atts } = await supabase
          .from('DevIssueAttachment').select('*').in('issueId', issueIds);
        (atts || []).forEach((a: any) => {
          if (!attMap[a.issueId]) attMap[a.issueId] = [];
          attMap[a.issueId].push(a);
        });
      }

      return {
        team,
        issues: (issues || []).map((i: any) => ({ ...i, attachments: attMap[i.id] || [] })),
        stats: {
          total: (issues || []).length,
          open: (issues || []).filter((i: any) => ['OPEN', 'ASSIGNED'].includes(i.status)).length,
          inProgress: (issues || []).filter((i: any) => ['IN_PROGRESS', 'DEV_COMPLETED', 'TESTING'].includes(i.status)).length,
          completed: (issues || []).filter((i: any) => ['CLOSED', 'READY_FOR_DEPLOY'].includes(i.status)).length,
        }
      };
    },
    enabled: !!token
  });
}

export function usePortalIssueDetails(token: string, id: string) {
  return useQuery({
    queryKey: ['dev-portal-issue', id],
    queryFn: async () => {
      const { data: issue } = await supabase
        .from('DevIssue')
        .select('*, category:DevIssueCategory(*), assignedTeam:DevTeam(*)')
        .eq('id', id).single();
      if (!issue) return null;

      const { data: timeline } = await supabase
        .from('DevIssueTimeline').select('*')
        .eq('issueId', id).order('createdAt', { ascending: false });

      const { data: attachments } = await supabase
        .from('DevIssueAttachment').select('*')
        .eq('issueId', id).order('createdAt', { ascending: false });

      return { ...issue, timeline: timeline || [], attachments: attachments || [] };
    },
    enabled: !!id && !!token
  });
}

export function usePortalUpdateStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, token, data }: { id: string; token: string; data: any }) => {
      const { status, rootCause, fixDetails, deploymentDetails, comment } = data;
      const nowIso = new Date().toISOString();

      const { data: updated, error } = await supabase
        .from('DevIssue').update({ status, updatedAt: nowIso }).eq('id', id).select().single();
      if (error) throw new Error(error.message);

      const action = STATUS_TIMELINE_ACTION[status] || `Status changed to ${status}`;
      await supabase.from('DevIssueTimeline').insert([{
        id: generateUUID(), issueId: id,
        action, newStatus: status,
        comment: comment || null,
        rootCause: rootCause || null,
        fixDetails: fixDetails || null,
        deploymentDetails: deploymentDetails || null,
        authorType: ADMIN_ONLY_STATUSES.includes(status) ? 'SVV_ADMIN' : 'DEVELOPER',
        authorName: ADMIN_ONLY_STATUSES.includes(status) ? 'SVV Admin' : 'External Developer',
        createdAt: nowIso,
      }]);

      return updated;
    },
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: ['dev-portal', v.token] });
      queryClient.invalidateQueries({ queryKey: ['dev-portal-issue', v.id] });
      queryClient.invalidateQueries({ queryKey: ['dev-issue-details', v.id] });
      queryClient.invalidateQueries({ queryKey: ['dev-issues'] });
    }
  });
}

export function usePortalAddComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, token, comment }: { id: string; token: string; comment: string }) => {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase.from('DevIssueTimeline').insert([{
        id: generateUUID(), issueId: id,
        action: 'Developer Comment',
        comment, authorType: 'DEVELOPER', authorName: 'External Developer', createdAt: nowIso,
      }]).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (_, v) => queryClient.invalidateQueries({ queryKey: ['dev-portal-issue', v.id] })
  });
}
