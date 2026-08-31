import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export function useIssues(params?: any) {
  return useQuery({ queryKey: ['issues', params], queryFn: async () => { const r = await apiClient.get('/issues', { params }); return r.data.data; } });
}

export function useIssue(id: string) {
  return useQuery({ queryKey: ['issue', id], queryFn: async () => { const r = await apiClient.get(`/issues/${id}`); return r.data.data; }, enabled: !!id });
}

export function useIssueStats(branchId?: string) {
  return useQuery({ queryKey: ['issue-stats', branchId], queryFn: async () => { const r = await apiClient.get('/issues/stats', { params: { branchId } }); return r.data.data; } });
}

export function useRaiseIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => { 
      let payload = data;
      if (data.photos && data.photos.length > 0) {
        payload = new FormData();
        Object.keys(data).forEach(key => {
          if (key === 'photos') {
            Array.from(data.photos as FileList | File[]).forEach((file: any) => payload.append('photos', file));
          } else {
            payload.append(key, data[key]);
          }
        });
      }
      
      const r = await apiClient.post('/issues', payload); 
      return r.data.data; 
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['issues'] }),
  });
}

export function useUpdateIssueStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, note, costs }: { id: string, status: string, note?: string, costs?: any }) => {
      const r = await apiClient.patch(`/issues/${id}/status`, { status, note, costs });
      return r.data.data;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['issue', id] });
      qc.invalidateQueries({ queryKey: ['issues'] });
      qc.invalidateQueries({ queryKey: ['asset'] });
      qc.invalidateQueries({ queryKey: ['asset-history'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useAddIssueComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, content, attachments }: { id: string, content: string, attachments?: File[] }) => {
      // Create FormData if there are files, else normal JSON. But currently our route uses upload.array()
      // so it expects FormData for everything, or we can just send JSON if no files.
      // Wait, our backend route: `upload.array('attachments', 5)` expects multipart/form-data.
      const formData = new FormData();
      formData.append('content', content);
      if (attachments) {
        attachments.forEach(file => formData.append('attachments', file));
      }
      const r = await apiClient.post(`/issues/${id}/comments`, formData);
      return r.data.data;
    },
    onSuccess: (_, { id }) => { qc.invalidateQueries({ queryKey: ['issue', id] }); },
  });
}

export function useAssignIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, assigneeId }: { id: string, assigneeId: string }) => { const r = await apiClient.patch(`/issues/${id}/assign`, { assigneeId }); return r.data.data; },
    onSuccess: (_, { id }) => { qc.invalidateQueries({ queryKey: ['issue', id] }); qc.invalidateQueries({ queryKey: ['issues'] }); },
  });
}

export function useBulkAssignIssues() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ issueIds, assignedToId }: { issueIds: string[], assignedToId: string }) => {
      const r = await apiClient.post('/issues/bulk-assign', { issueIds, assignedToId });
      return r.data.data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['issues'] }); },
  });
}

export function useBulkUpdateIssueStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ issueIds, status, note }: { issueIds: string[], status: string, note?: string }) => {
      const r = await apiClient.post('/issues/bulk-status', { issueIds, status, note });
      return r.data.data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['issues'] }); },
  });
}

