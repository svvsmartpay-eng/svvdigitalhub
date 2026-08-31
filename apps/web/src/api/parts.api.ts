import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export function useParts(params?: any) {
  return useQuery({ queryKey: ['parts', params], queryFn: async () => { const r = await apiClient.get('/parts', { params }); return r.data.data; } });
}

export function usePart(id: string) {
  return useQuery({ queryKey: ['part', id], queryFn: async () => { const r = await apiClient.get(`/parts/${id}`); return r.data.data; }, enabled: !!id });
}

export function useCreatePart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => { const r = await apiClient.post('/parts', data); return r.data.data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['parts'] }),
  });
}

export function useReceiveStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, quantity, cost }: { id: string, quantity: number, cost: number }) => { const r = await apiClient.post(`/parts/${id}/receive`, { quantity, cost }); return r.data.data; },
    onSuccess: (_, { id }) => { qc.invalidateQueries({ queryKey: ['part', id] }); qc.invalidateQueries({ queryKey: ['parts'] }); },
  });
}
