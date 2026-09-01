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
  whatsappNumber?: string;
  status?: string;
  isActive?: boolean;
}

export const DEFAULT_BRANCHES: BranchRecord[] = [
  {
    id: 'f5abaacc-d2b6-4591-91fb-314b2188e18c',
    code: 'SVV-1',
    name: 'SVV Main Hub',
    city: 'Isnapur',
    state: 'Telangana',
    address: 'Main Road, Isnapur Chowrasta, Hyderabad',
    phone: '+91 77386 63866',
    whatsappNumber: '+91 77386 63866',
    status: 'ACTIVE',
    isActive: true,
  },
  {
    id: 'branch-2',
    code: 'SVV-2',
    name: 'SVV Digital Desk',
    city: 'Patancheru',
    state: 'Telangana',
    address: 'Near Bus Stand, Patancheru, Hyderabad',
    phone: '+91 99515 27090',
    whatsappNumber: '+91 99515 27090',
    status: 'ACTIVE',
    isActive: true,
  }
];

export function useBranches() {
  return useQuery({ 
    queryKey: ['branches'], 
    queryFn: async () => { 
      try {
        const r = await apiClient.get('/branches'); 
        if (r.data?.data && r.data.data.length > 0) return r.data.data;
      } catch {}

      try {
        const { data: supaBranches, error } = await supabase.from('branches').select('*');
        if (!error && supaBranches && supaBranches.length > 0) {
          const activeOnly = supaBranches.filter((b: any) => b.isActive !== false);
          if (activeOnly.length > 0) {
            return activeOnly.map((b: any) => ({
              ...b,
              city: b.city || (b.code === 'SVV-1' ? 'Isnapur' : 'Patancheru'),
              whatsappNumber: b.whatsappNumber || b.phone || (b.code === 'SVV-1' ? '+91 77386 63866' : '+91 99515 27090'),
            }));
          }
        }
      } catch {}

      return DEFAULT_BRANCHES;
    },
    staleTime: 5000,
  });
}
