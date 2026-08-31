import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export function useServiceVisits(params?: any) {
  return useQuery({ queryKey: ['service-visits', params], queryFn: async () => { const r = await apiClient.get('/service-visits', { params }); return r.data.data; } });
}

export function useServiceVisit(id: string) {
  return useQuery({ queryKey: ['service-visit', id], queryFn: async () => { const r = await apiClient.get(`/service-visits/${id}`); return r.data.data; }, enabled: !!id });
}

export function useCreateServiceVisit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => { const r = await apiClient.post('/service-visits', data); return r.data.data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['service-visits'] }),
  });
}

export function useCheckIn(visitId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => { const r = await apiClient.post(`/service-visits/${visitId}/check-in`, data); return r.data.data; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['service-visit', visitId] }); qc.invalidateQueries({ queryKey: ['service-visits'] }); },
  });
}

export function useStartWork(visitId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => { const r = await apiClient.post(`/service-visits/${visitId}/start`); return r.data.data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['service-visit', visitId] }),
  });
}

export function useAddDiagnosis(visitId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => { const r = await apiClient.post(`/service-visits/${visitId}/diagnosis`, data); return r.data.data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['service-visit', visitId] }),
  });
}

export function useAddWorkAction(visitId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => { const r = await apiClient.post(`/service-visits/${visitId}/work-actions`, data); return r.data.data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['service-visit', visitId] }),
  });
}

export function useAddPartsUsed(visitId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => { const r = await apiClient.post(`/service-visits/${visitId}/parts`, data); return r.data.data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['service-visit', visitId] }),
  });
}

export function useAddTestResult(visitId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => { const r = await apiClient.post(`/service-visits/${visitId}/test-results`, data); return r.data.data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['service-visit', visitId] }),
  });
}

export function useAddVerification(visitId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => { const r = await apiClient.post(`/service-visits/${visitId}/verify`, data); return r.data.data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['service-visit', visitId] }),
  });
}

export function useCheckOut(visitId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => { const r = await apiClient.post(`/service-visits/${visitId}/check-out`, data); return r.data.data; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['service-visit', visitId] }); qc.invalidateQueries({ queryKey: ['service-visits'] }); },
  });
}

export function useCloseVisit(visitId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => { const r = await apiClient.post(`/service-visits/${visitId}/close`); return r.data.data; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['service-visit', visitId] }); qc.invalidateQueries({ queryKey: ['service-visits'] }); },
  });
}
