import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export function useVendors(params?: any) {
  return useQuery({ queryKey: ['vendors', params], queryFn: async () => { const r = await apiClient.get('/vendors', { params }); return r.data.data; } });
}

export function useVendor(id: string) {
  return useQuery({ queryKey: ['vendor', id], queryFn: async () => { const r = await apiClient.get(`/vendors/${id}`); return r.data.data; }, enabled: !!id });
}

export function useCreateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => { const r = await apiClient.post('/vendors', data); return r.data.data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendors'] }),
  });
}

export function useUpdateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => { const r = await apiClient.put(`/vendors/${id}`, data); return r.data.data; },
    onSuccess: (_, { id }) => { qc.invalidateQueries({ queryKey: ['vendor', id] }); qc.invalidateQueries({ queryKey: ['vendors'] }); },
  });
}

export function useVendorPerformance(id: string) {
  return useQuery({ queryKey: ['vendor-performance', id], queryFn: async () => { const r = await apiClient.get(`/vendors/${id}/performance`); return r.data.data; }, enabled: !!id });
}
