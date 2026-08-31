import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export function useNotifications() {
  return useQuery({ queryKey: ['notifications'], queryFn: async () => { const r = await apiClient.get('/notifications'); return r.data.data; } });
}

export function useMarkAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => { const r = await apiClient.patch(`/notifications/${id}/read`); return r.data.data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => { const r = await apiClient.post('/notifications/read-all'); return r.data.data; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
