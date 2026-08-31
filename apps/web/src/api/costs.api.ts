import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export function useCosts(params?: any) {
  return useQuery({ queryKey: ['costs', params], queryFn: async () => { const r = await apiClient.get('/costs', { params }); return r.data.data; } });
}

export function useCostSummary(params?: any) {
  return useQuery({ queryKey: ['cost-summary', params], queryFn: async () => { const r = await apiClient.get('/costs/summary', { params }); return r.data.data; } });
}

export function useCreateCost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => { const r = await apiClient.post('/costs', data); return r.data.data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['costs'] }),
  });
}
