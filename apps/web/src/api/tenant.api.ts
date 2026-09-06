import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export function useTenants() {
  return useQuery({
    queryKey: ['tenants'],
        queryFn: async () => {
      try {
        const res = await apiClient.get('/tenants');
        if (typeof res.data === 'string' || !res.data?.success) {
          throw new Error('API returned non-JSON or unsuccessful response (likely Vercel catch-all)');
        }
        return res.data.data || [];
      } catch (err) {
        // Fallback for Vercel disconnected demo
        return [
          {
            id: 'svv-org-001',
            name: 'SVV Digital Hub',
            customDomain: null,
            themeColor: '#0D6EFD',
            isPrintHubEnabled: true,
            isTasksEnabled: true,
            isAssetsEnabled: true,
            isBillingEnabled: false,
            isReportsEnabled: true,
            isActive: true,
            subscription: null,
          }
        ];
      }
    }
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiClient.post('/tenants', data);
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tenants'] })
  });
}

export function useUpdateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      const res = await apiClient.put(`/tenants/${id}`, data);
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tenants'] })
  });
}

export function useDeleteTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/tenants/${id}`);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tenants'] })
  });
}
