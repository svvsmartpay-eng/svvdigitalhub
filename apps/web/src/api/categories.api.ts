import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export function useCategories() {
  return useQuery({ 
    queryKey: ['categories'], 
    queryFn: async () => { 
      const r = await apiClient.get('/categories'); 
      return r.data.data; 
    } 
  });
}
