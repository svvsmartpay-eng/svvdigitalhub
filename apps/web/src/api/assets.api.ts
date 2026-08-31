import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export function useAssets(params?: any) {
  return useQuery({
    queryKey: ['assets', params],
    queryFn: async () => { const r = await apiClient.get('/assets', { params }); return r.data.data; },
  });
}

export function useAsset(id: string) {
  return useQuery({
    queryKey: ['asset', id],
    queryFn: async () => { const r = await apiClient.get(`/assets/${id}`); return r.data.data; },
    enabled: !!id,
  });
}

export function useAssetHistory(id: string) {
  return useQuery({
    queryKey: ['asset-history', id],
    queryFn: async () => { const r = await apiClient.get(`/assets/${id}/history`); return r.data.data; },
    enabled: !!id,
  });
}

export function useAssetStats(branchId?: string) {
  return useQuery({
    queryKey: ['asset-stats', branchId],
    queryFn: async () => { const r = await apiClient.get('/assets/stats', { params: { branchId } }); return r.data.data; },
  });
}

export function useCreateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => { const r = await apiClient.post('/assets', data); return r.data.data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }),
  });
}

export function useUpdateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => { const r = await apiClient.put(`/assets/${id}`, data); return r.data.data; },
    onSuccess: (_, { id }) => { qc.invalidateQueries({ queryKey: ['asset', id] }); qc.invalidateQueries({ queryKey: ['assets'] }); },
  });
}

export function useAssetAnalytics(params?: any) {
  return useQuery({
    queryKey: ['asset-analytics', params],
    queryFn: async () => {
      const r = await apiClient.get('/assets/analytics', { params });
      return r.data.data;
    },
  });
}
