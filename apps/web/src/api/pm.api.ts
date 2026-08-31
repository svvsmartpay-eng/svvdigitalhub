import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export function usePMSchedules(params?: any) {
  return useQuery({ queryKey: ['pm-schedules', params], queryFn: async () => { const r = await apiClient.get('/pm', { params }); return r.data.data; } });
}

export function usePMPlans(params?: any) {
  return useQuery({ queryKey: ['pm-plans', params], queryFn: async () => { const r = await apiClient.get('/pm/plans', { params }); return r.data.data; } });
}

export function useCreatePMPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => { const r = await apiClient.post('/pm/plans', data); return r.data.data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pm-plans'] }),
  });
}

export function useCompletePM() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => { const r = await apiClient.post(`/pm/${id}/complete`, data); return r.data.data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pm-schedules'] }),
  });
}
