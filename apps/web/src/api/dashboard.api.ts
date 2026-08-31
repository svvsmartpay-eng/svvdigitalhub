import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export function useDashboard(params?: any) {
  return useQuery({ queryKey: ['dashboard', params], queryFn: async () => { const r = await apiClient.get('/dashboard', { params }); return r.data.data; } });
}
