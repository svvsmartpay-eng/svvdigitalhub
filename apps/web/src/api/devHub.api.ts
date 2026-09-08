import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { supabase } from '@/lib/supabase';

// --- ADMIN API ---

export function useDevCategories() {
  return useQuery({
    queryKey: ['dev-categories'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/dev-hub/admin/categories');
        if (Array.isArray(res.data?.data) && res.data.data.length > 0) {
          return res.data.data;
        }
      } catch (_) {}
      
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
      try {
        const res = await apiClient.get('/dev-hub/admin/teams');
        if (Array.isArray(res.data?.data)) {
          return res.data.data;
        }
      } catch (_) {}

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
      try {
        const params = new URLSearchParams(filters).toString();
        const res = await apiClient.get(`/dev-hub/admin/issues?${params}`);
        if (Array.isArray(res.data?.data)) {
          return res.data.data;
        }
      } catch (_) {}

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
      try {
        const res = await apiClient.post('/dev-hub/admin/issues', data);
        if (res.data?.data) return res.data.data;
      } catch (err) {
        console.warn('API post failed, using direct Supabase fallback:', err);
      }

      // Generate ticket code
      const { count } = await supabase
        .from('DevIssue')
        .select('*', { count: 'exact', head: true });
      const ticketCode = `#DEV-${String((count || 0) + 1000).padStart(4, '0')}`;

      let catId = data.categoryId;
      if (!catId) {
        const { data: cats } = await supabase.from('DevIssueCategory').select('id').limit(1);
        catId = cats?.[0]?.id;
      }

      const newIssue = {
        ticketCode,
        title: data.title?.trim() || 'Untitled Issue',
        description: data.description || '',
        categoryId: catId,
        priority: data.priority || 'MEDIUM',
        status: 'OPEN',
        expectedResult: data.expectedResult || null,
        currentResult: data.currentResult || null,
        assignedTeamId: data.assignedTeamId || null,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
        tags: JSON.stringify(data.tags || []),
        createdBy: 'SVV Admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const { data: created, error } = await supabase
        .from('DevIssue')
        .insert([newIssue])
        .select()
        .single();

      if (error) throw new Error(error.message);

      // Create timeline entry
      await supabase.from('DevIssueTimeline').insert([{
        issueId: created.id,
        action: 'Issue Created',
        newStatus: 'OPEN',
        authorType: 'SVV_ADMIN',
        authorName: 'SVV Admin',
        createdAt: new Date().toISOString(),
      }]);

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
      try {
        const res = await apiClient.put(`/dev-hub/admin/issues/${id}/status`, { status, comment });
        if (res.data?.data) return res.data.data;
      } catch (_) {}

      const { data: updated, error } = await supabase
        .from('DevIssue')
        .update({ status, updatedAt: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);

      if (comment) {
        await supabase.from('DevIssueTimeline').insert([{
          issueId: id,
          action: `Status changed to ${status}`,
          newStatus: status,
          comment,
          authorType: 'SVV_ADMIN',
          authorName: 'SVV Admin',
          createdAt: new Date().toISOString(),
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
      try {
        const res = await apiClient.post(`/dev-hub/admin/issues/${id}/timeline`, { comment });
        if (res.data?.data) return res.data.data;
      } catch (_) {}

      const { data, error } = await supabase
        .from('DevIssueTimeline')
        .insert([{
          issueId: id,
          action: 'Comment Added',
          comment,
          authorType: 'SVV_ADMIN',
          authorName: 'SVV Admin',
          createdAt: new Date().toISOString(),
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
      try {
        const res = await apiClient.get(`/dev-hub/admin/issues/${id}`);
        if (res.data?.data) return res.data.data;
      } catch (_) {}

      const { data: issue } = await supabase
        .from('DevIssue')
        .select('*, category:DevIssueCategory(*), assignedTeam:DevTeam(*)')
        .eq('id', id)
        .single();

      if (!issue) return null;

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
      try {
        const res = await apiClient.get('/dev-hub/portal/dashboard', { headers: { 'x-dev-token': token } });
        if (res.data?.data) return res.data.data;
      } catch (_) {}

      const { data: team } = await supabase
        .from('DevTeam')
        .select('*')
        .eq('portalToken', token)
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
      try {
        const res = await apiClient.get(`/dev-hub/portal/issues/${id}`, { headers: { 'x-dev-token': token } });
        if (res.data?.data) return res.data.data;
      } catch (_) {}

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
      try {
        const res = await apiClient.put(`/dev-hub/portal/issues/${id}/status`, data, { headers: { 'x-dev-token': token } });
        if (res.data?.data) return res.data.data;
      } catch (_) {}

      const { status, rootCause, fixDetails, deploymentDetails, comment } = data;
      const { data: updated, error } = await supabase
        .from('DevIssue')
        .update({
          status,
          updatedAt: new Date().toISOString(),
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
        issueId: id,
        action: `Status changed to ${status}`,
        newStatus: status,
        comment: commentText,
        authorType: 'DEVELOPER',
        authorName: 'External Developer',
        createdAt: new Date().toISOString(),
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
      try {
        const res = await apiClient.post(`/dev-hub/portal/issues/${id}/timeline`, { comment }, { headers: { 'x-dev-token': token } });
        if (res.data?.data) return res.data.data;
      } catch (_) {}

      const { data, error } = await supabase
        .from('DevIssueTimeline')
        .insert([{
          issueId: id,
          action: 'Developer Comment',
          comment,
          authorType: 'DEVELOPER',
          authorName: 'External Developer',
          createdAt: new Date().toISOString(),
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
