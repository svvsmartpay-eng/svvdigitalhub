import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export function useWorkOrders(params?: any) {
  return useQuery({ queryKey: ['work-orders', params], queryFn: async () => { const r = await apiClient.get('/work-orders', { params }); return r.data.data; } });
}

export function useWorkOrder(id: string) {
  return useQuery({ queryKey: ['work-order', id], queryFn: async () => { const r = await apiClient.get(`/work-orders/${id}`); return r.data.data; }, enabled: !!id });
}

export function useCreateWorkOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => { const r = await apiClient.post('/work-orders', data); return r.data.data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['work-orders'] }),
  });
}

export function useUpdateWorkOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => { const r = await apiClient.patch(`/work-orders/${id}/status`, { status }); return r.data.data; },
    onSuccess: (_, { id }) => { qc.invalidateQueries({ queryKey: ['work-order', id] }); qc.invalidateQueries({ queryKey: ['work-orders'] }); },
  });
}

export function useApproveWorkOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => { const r = await apiClient.post(`/work-orders/${id}/approve`); return r.data.data; },
    onSuccess: (_, id) => { qc.invalidateQueries({ queryKey: ['work-order', id] }); qc.invalidateQueries({ queryKey: ['work-orders'] }); },
  });
}
