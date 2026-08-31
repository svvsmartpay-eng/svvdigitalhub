import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export function useBranches() {
  return useQuery({ 
    queryKey: ['branches'], 
    queryFn: async () => { 
      try {
        const r = await apiClient.get('/branches'); 
        if (r.data?.data && r.data.data.length > 0) return r.data.data;
      } catch {}

      try {
        const { data, error } = await supabase.from('branches').select('*');
        if (!error && data && data.length > 0) return data;
      } catch {}

      return [
        { id: 'f5abaacc-d2b6-4591-91fb-314b2188e18c', code: 'SVV-1', name: 'SVV Main Hub', city: 'Isnapur' },
        { id: 'branch-2', code: 'SVV-2', name: 'Branch 2', city: 'Patancheru' }
      ];
    },
    staleTime: 60 * 1000,
  });
}

