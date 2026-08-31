import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export function usePluginSettings() {
  return useQuery({
    queryKey: ['plugin-settings'],
    queryFn: async () => {
      const res = await apiClient.get('/plugins');
      return res.data.data;
    },
    staleTime: 60 * 1000,
  });
}

export function useTogglePlugin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, isEnabled }: { key: string; isEnabled: boolean }) => {
      const res = await apiClient.patch(`/plugins/${key}/toggle`, { isEnabled });
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plugin-settings'] });
      qc.invalidateQueries({ queryKey: ['print-orders'] });
      qc.invalidateQueries({ queryKey: ['print-hub-analytics'] });
    },
  });
}
