import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFilterStore } from '@/stores/filter.store';
import { supabase } from '@/lib/supabase';
import { apiClient } from '@/lib/api';

export function useTasks(params?: any) {
  const selectedBranches = useFilterStore(s => s.selectedBranches);
  return useQuery({
    queryKey: ['tasks', params, selectedBranches],
    queryFn: async () => {
      try {
        const r = await apiClient.get('/tasks', { params });
        if (r.data?.data && r.data.data.length > 0) return r.data.data;
      } catch (err) {}
      
      // Fallback
      let query = supabase.from('tasks').select('*, branch:branches(name), assignedTo:users!TaskAssignedTo(name)').order('createdAt', { ascending: false });
      if (selectedBranches.length > 0) query = query.in('branchId', selectedBranches);
      const { data, error } = await query;
      if (!error && data) return data;
      return [];
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
  const selectedBranches = useFilterStore(s => s.selectedBranches);
  return useQuery({
    queryKey: ['task-stats', branchId, selectedBranches],
    queryFn: async () => {
      try {
        const r = await apiClient.get('/tasks/stats', { params: { branchId } });
        if (r.data?.data) return r.data.data;
      } catch (err) {}
      
      let query = supabase.from('tasks').select('status, priority');
      if (selectedBranches.length > 0) query = query.in('branchId', selectedBranches);
      const { data } = await query;
      const list = data || [];
      return {
        total: list.length,
        pending: list.filter((t: any) => t.status !== 'COMPLETED' && t.status !== 'CLOSED').length,
        completed: list.filter((t: any) => t.status === 'COMPLETED').length,
      };
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
