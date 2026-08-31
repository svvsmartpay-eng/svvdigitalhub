import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export function useTasks(params?: any) {
  return useQuery({
    queryKey: ['tasks', params],
    queryFn: async () => {
      const r = await apiClient.get('/tasks', { params });
      return r.data;
    },
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: ['task', id],
    queryFn: async () => {
      const r = await apiClient.get(`/tasks/${id}`);
      return r.data.data;
    },
    enabled: !!id,
  });
}

export function useTaskStats(branchId?: string) {
  return useQuery({
    queryKey: ['task-stats', branchId],
    queryFn: async () => {
      const r = await apiClient.get('/tasks/stats', { params: { branchId } });
      return r.data.data;
    },
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      let payload = data;
      if (data.attachments && Array.isArray(data.attachments) && data.attachments[0] instanceof File) {
        payload = new FormData();
        Object.keys(data).forEach(key => {
          if (key === 'attachments') {
            data.attachments.forEach((file: File) => payload.append('attachments', file));
          } else if (data[key] !== undefined && data[key] !== null) {
            payload.append(key, data[key]);
          }
        });
      }
      const r = await apiClient.post('/tasks', payload);
      return r.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['task-stats'] });
    },
  });
}

export function useUpdateTaskStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, remarks, attachments }: { id: string; status: string; remarks?: string; attachments?: any[] }) => {
      let payload: any = { status, remarks, attachments };
      if (attachments && attachments.length > 0 && attachments[0] instanceof File) {
        payload = new FormData();
        payload.append('status', status);
        if (remarks) payload.append('remarks', remarks);
        attachments.forEach((file: File) => payload.append('attachments', file));
      }
      const r = await apiClient.patch(`/tasks/${id}/status`, payload);
      return r.data.data;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['task', id] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['task-stats'] });
    },
  });
}

export function useAddTaskUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, content, attachments }: { id: string; content: string; attachments?: any[] }) => {
      let payload: any = { content, attachments };
      if (attachments && attachments.length > 0 && attachments[0] instanceof File) {
        payload = new FormData();
        payload.append('content', content);
        attachments.forEach((file: File) => payload.append('attachments', file));
      }
      const r = await apiClient.post(`/tasks/${id}/updates`, payload);
      return r.data.data;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['task', id] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
