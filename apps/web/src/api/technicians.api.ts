import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export function useTechnicians(params?: any) {
  return useQuery({ queryKey: ['technicians', params], queryFn: async () => { const r = await apiClient.get('/technicians', { params }); return r.data.data; } });
}

export function useTechnician(id: string) {
  return useQuery({ queryKey: ['technician', id], queryFn: async () => { const r = await apiClient.get(`/technicians/${id}`); return r.data.data; }, enabled: !!id });
}

export function useCreateTechnician() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => { const r = await apiClient.post('/technicians', data); return r.data.data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['technicians'] }),
  });
}

export function useUpdateTechnician() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => { const r = await apiClient.put(`/technicians/${id}`, data); return r.data.data; },
    onSuccess: (_, { id }) => { qc.invalidateQueries({ queryKey: ['technician', id] }); qc.invalidateQueries({ queryKey: ['technicians'] }); },
  });
}
