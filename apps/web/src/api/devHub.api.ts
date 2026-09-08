import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch (_) {}
  }
  return 'uuid-' + Date.now() + '-' + Math.random().toString(36).substring(2, 11);
}

// --- ADMIN API ---

export function useDevCategories() {
  return useQuery({
    queryKey: ['dev-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('DevIssueCategory')
        .select('*')
        .order('group', { ascending: true })
        .order('name', { ascending: true });
        
      if (error) {
        console.warn('Supabase categories error:', error.message);
        return [];
      }
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
        
      if (error) {
        console.warn('Supabase teams error:', error.message);
        return [];
      }
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
      if (error) {
        console.warn('Supabase issues error:', error.message);
        return [];
      }
      return data || [];
    }
  });
}

export function useCreateDevIssue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      // 1. Generate unique ticket code
      let ticketCode = '';
      try {
        const { data: latest } = await supabase
          .from('DevIssue')
          .select('ticketCode')
          .order('createdAt', { ascending: false })
          .limit(1);
        if (latest && latest.length > 0 && latest[0]?.ticketCode?.startsWith('#DEV-')) {
          const numPart = parseInt(latest[0].ticketCode.replace('#DEV-', ''), 10);
          if (!isNaN(numPart)) {
            ticketCode = `#DEV-${String(numPart + 1).padStart(4, '0')}`;
          }
        }
      } catch (_) {}

      if (!ticketCode) {
        const { count } = await supabase
          .from('DevIssue')
          .select('*', { count: 'exact', head: true });
        ticketCode = `#DEV-${String((count || 0) + 1001).padStart(4, '0')}`;
      }

      // 2. Resolve categoryId fallback
      let catId = data.categoryId;
      if (!catId) {
        const { data: cats } = await supabase.from('DevIssueCategory').select('id').limit(1);
        catId = cats?.[0]?.id;
      }

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
        expectedResult: data.expectedResult?.trim() || null,
        currentResult: data.currentResult?.trim() || null,
        assignedTeamId: data.assignedTeamId?.trim() || null,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
        tags: JSON.stringify(data.tags || []),
        createdBy: 'SVV Admin',
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      const { data: created, error } = await supabase
        .from('DevIssue')
        .insert([newIssue])
        .select()
        .single();

      if (error) {
        console.error('Supabase issue creation error:', error);
        throw new Error(error.message || 'Failed to create ticket in Supabase');
      }

      // 3. Create timeline entry
      try {
        await supabase.from('DevIssueTimeline').insert([{
          id: generateUUID(),
          issueId: created.id,
          action: 'Issue Created',
          newStatus: 'OPEN',
          authorType: 'SVV_ADMIN',
          authorName: 'SVV Admin',
          createdAt: nowIso,
        }]);
      } catch (tlErr) {
        console.warn('Timeline entry creation warning:', tlErr);
      }

      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dev-issues'] });
    }
  });
}

export function useUpdateDevIssueStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, comment }: { id: string, status: string, comment?: string }) => {
      const nowIso = new Date().toISOString();
      const { data: updated, error } = await supabase
        .from('DevIssue')
        .update({ status, updatedAt: nowIso })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);

      if (comment) {
        await supabase.from('DevIssueTimeline').insert([{
          id: generateUUID(),
          issueId: id,
          action: `Status changed to ${status}`,
          newStatus: status,
          comment,
          authorType: 'SVV_ADMIN',
          authorName: 'SVV Admin',
          createdAt: nowIso,
        }]);
      }

      return updated;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dev-issues'] });
      queryClient.invalidateQueries({ queryKey: ['dev-issue-details', variables.id] });
    }
  });
}

export function useAddDevIssueComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, comment }: { id: string, comment: string }) => {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from('DevIssueTimeline')
        .insert([{
          id: generateUUID(),
          issueId: id,
          action: 'Comment Added',
          comment,
          authorType: 'SVV_ADMIN',
          authorName: 'SVV Admin',
          createdAt: nowIso,
        }])
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dev-issue-details', variables.id] });
    }
  });
}

export function useDevIssueDetails(id: string) {
  return useQuery({
    queryKey: ['dev-issue-details', id],
    queryFn: async () => {
      const { data: issue, error } = await supabase
        .from('DevIssue')
        .select('*, category:DevIssueCategory(*), assignedTeam:DevTeam(*)')
        .eq('id', id)
        .single();

      if (error || !issue) return null;

      const { data: timeline } = await supabase
        .from('DevIssueTimeline')
        .select('*')
        .eq('issueId', id)
        .order('createdAt', { ascending: false });

      const { data: attachments } = await supabase
        .from('DevIssueAttachment')
        .select('*')
        .eq('issueId', id);

      return {
        ...issue,
        timeline: timeline || [],
        attachments: attachments || [],
      };
    },
    enabled: !!id
  });
}

// --- PORTAL API (Public developer link) ---

export function usePortalDashboard(token: string) {
  return useQuery({
    queryKey: ['dev-portal', token],
    queryFn: async () => {
      const { data: team } = await supabase
        .from('DevTeam')
        .select('*')
        .eq('publicToken', token)
        .single();

      if (!team) return null;

      const { data: issues } = await supabase
        .from('DevIssue')
        .select('*, category:DevIssueCategory(*)')
        .eq('assignedTeamId', team.id)
        .order('createdAt', { ascending: false });

      return {
        team,
        issues: issues || [],
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
        .select('*, category:DevIssueCategory(*)')
        .eq('id', id)
        .single();

      if (!issue) return null;

      const { data: timeline } = await supabase
        .from('DevIssueTimeline')
        .select('*')
        .eq('issueId', id)
        .order('createdAt', { ascending: false });

      return {
        ...issue,
        timeline: timeline || [],
      };
    },
    enabled: !!id && !!token
  });
}

export function usePortalUpdateStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, token, data }: { id: string, token: string, data: any }) => {
      const { status, rootCause, fixDetails, deploymentDetails, comment } = data;
      const nowIso = new Date().toISOString();
      const { data: updated, error } = await supabase
        .from('DevIssue')
        .update({
          status,
          updatedAt: nowIso,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);

      let commentText = comment || `Status updated to ${status}`;
      if (rootCause || fixDetails || deploymentDetails) {
        commentText += `\n\n[Root Cause]: ${rootCause || 'N/A'}\n[Fix Details]: ${fixDetails || 'N/A'}\n[Deployment]: ${deploymentDetails || 'N/A'}`;
      }

      await supabase.from('DevIssueTimeline').insert([{
        id: generateUUID(),
        issueId: id,
        action: `Status changed to ${status}`,
        newStatus: status,
        comment: commentText,
        authorType: 'DEVELOPER',
        authorName: 'External Developer',
        createdAt: nowIso,
      }]);

      return updated;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dev-portal', variables.token] });
      queryClient.invalidateQueries({ queryKey: ['dev-portal-issue', variables.id] });
    }
  });
}

export function usePortalAddComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, token, comment }: { id: string, token: string, comment: string }) => {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from('DevIssueTimeline')
        .insert([{
          id: generateUUID(),
          issueId: id,
          action: 'Developer Comment',
          comment,
          authorType: 'DEVELOPER',
          authorName: 'External Developer',
          createdAt: nowIso,
        }])
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dev-portal-issue', variables.id] });
    }
  });
}
