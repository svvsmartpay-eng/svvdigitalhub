import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export function useBranches() {
  return useQuery({ 
    queryKey: ['branches'], 
    queryFn: async () => { 
      const r = await apiClient.get('/branches'); 
      return r.data.data; 
    } 
  });
}
