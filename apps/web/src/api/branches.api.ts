import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export interface BranchRecord {
  id: string;
  name: string;
  code: string;
  city: string;
  state?: string;
  address?: string;
  phone?: string;
  email?: string;
  whatsappNumber?: string;
  status?: string;
  isActive?: boolean;
}

export function useBranches() {
  return useQuery({ 
    queryKey: ['branches'], 
    queryFn: async () => { 
      try {
        // Primary Source of Truth: Centralized Database via Vercel Backend Fallback or Supabase Directly
        const r = await apiClient.get('/branches'); 
        if (r.data?.data && r.data.data.length > 0) return r.data.data;
      } catch (err) {
        console.warn('API Client failed to fetch branches, falling back to direct Supabase query.', err);
      }

      // Vercel Serverless Direct Supabase Query Fallback
      const { data: supaBranches, error } = await supabase.from('branches').select('*').eq('isActive', true);
      if (error) throw new Error(error.message);
      
      if (supaBranches && supaBranches.length > 0) {
        return supaBranches.map((b: any) => ({
          ...b,
          city: b.city || 'Hyderabad',
          whatsappNumber: b.whatsappNumber || b.phone || '',
        }));
      }

      return [];
    },
    staleTime: 5000,
  });
}
