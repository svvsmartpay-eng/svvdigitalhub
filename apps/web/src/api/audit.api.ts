import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export function useAuditLogs(params?: any) {
  return useQuery({ queryKey: ['audit-logs', params], queryFn: async () => { const r = await apiClient.get('/audit', { params }); return r.data.data; } });
}
