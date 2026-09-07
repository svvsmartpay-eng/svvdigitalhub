import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

// --- ADMIN API ---

export function useDevCategories() {
  return useQuery({
    queryKey: ['dev-categories'],
    queryFn: async () => {
      const res = await apiClient.get('/dev-hub/admin/categories');
      return res.data.data;
    }
  });
}

export function useDevTeams() {
  return useQuery({
    queryKey: ['dev-teams'],
    queryFn: async () => {
      const res = await apiClient.get('/dev-hub/admin/teams');
      return res.data.data;
    }
  });
}

export function useDevIssues(filters: any = {}) {
  return useQuery({
    queryKey: ['dev-issues', filters],
    queryFn: async () => {
      const params = new URLSearchParams(filters).toString();
      const res = await apiClient.get(`/dev-hub/admin/issues?${params}`);
      return res.data.data;
    }
  });
}

export function useCreateDevIssue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiClient.post('/dev-hub/admin/issues', data);
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dev-issues'] })
  });
}

export function useUpdateDevIssueStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, comment }: { id: string, status: string, comment?: string }) => {
      const res = await apiClient.put(`/dev-hub/admin/issues/${id}/status`, { status, comment });
      return res.data.data;
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
      const res = await apiClient.post(`/dev-hub/admin/issues/${id}/timeline`, { comment });
      return res.data.data;
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
      const res = await apiClient.get(`/dev-hub/admin/issues/${id}`);
      return res.data.data;
    },
    enabled: !!id
  });
}

// --- PORTAL API (No Auth Store needed, manually pass token) ---

export function usePortalDashboard(token: string) {
  return useQuery({
    queryKey: ['dev-portal', token],
    queryFn: async () => {
      const res = await apiClient.get('/dev-hub/portal/dashboard', { headers: { 'x-dev-token': token } });
      return res.data.data;
    },
    enabled: !!token
  });
}

export function usePortalIssueDetails(token: string, id: string) {
  return useQuery({
    queryKey: ['dev-portal-issue', id],
    queryFn: async () => {
      const res = await apiClient.get(`/dev-hub/portal/issues/${id}`, { headers: { 'x-dev-token': token } });
      return res.data.data;
    },
    enabled: !!id && !!token
  });
}

export function usePortalUpdateStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, token, data }: { id: string, token: string, data: any }) => {
      const res = await apiClient.put(`/dev-hub/portal/issues/${id}/status`, data, { headers: { 'x-dev-token': token } });
      return res.data.data;
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
      const res = await apiClient.post(`/dev-hub/portal/issues/${id}/timeline`, { comment }, { headers: { 'x-dev-token': token } });
      return res.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dev-portal-issue', variables.id] });
    }
  });
}
