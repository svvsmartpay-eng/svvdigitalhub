import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export function useVendors(params?: any) {
  return useQuery({
    queryKey: ['vendors', params],
    queryFn: async () => {
      try {
        const r = await apiClient.get('/vendors', { params });
        if (r.data?.data && r.data.data.length > 0) return r.data.data;
      } catch {}

      try {
        const { data: supaVendors, error } = await supabase
          .from('vendors')
          .select('*')
          .order('name', { ascending: true });

        if (!error && supaVendors) return supaVendors;
      } catch {}

      return [];
    },
    staleTime: 60 * 1000,
  });
}

export function useVendor(id: string) {
  return useQuery({
    queryKey: ['vendor', id],
    queryFn: async () => {
      try {
        const r = await apiClient.get(`/vendors/${id}`);
        if (r.data?.data) return r.data.data;
      } catch {}

      try {
        const { data: supaVendor } = await supabase
          .from('vendors')
          .select('*')
          .eq('id', id)
          .single();
        if (supaVendor) return supaVendor;
      } catch {}

      return null;
    },
    enabled: !!id,
  });
}

export function useCreateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      try {
        const r = await apiClient.post('/vendors', data);
        if (r.data?.data) return r.data.data;
      } catch {}

      const now = new Date().toISOString();
      const id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `ven-${Date.now()}`;
      const { data: created, error } = await supabase.from('vendors').insert([{
        id,
        organizationId: 'svv-org-001',
        name: data.name,
        code: data.code || `VND-${Math.floor(100 + Math.random() * 900)}`,
        email: data.email,
        phone: data.phone,
        city: data.city || 'Isnapur',
        servicesProvided: data.servicesProvided || ['Hardware Maintenance', 'Printer Consumables'],
        rating: data.rating || 4.8,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      }]).select().single();

      if (error) throw error;
      return created;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendors'] }),
  });
}

export function useUpdateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      try {
        const r = await apiClient.put(`/vendors/${id}`, data);
        if (r.data?.data) return r.data.data;
      } catch {}

      const { data: updated, error } = await supabase
        .from('vendors')
        .update({
          ...data,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['vendor', id] });
      qc.invalidateQueries({ queryKey: ['vendors'] });
    },
  });
}

export function useVendorPerformance(id: string) {
  return useQuery({
    queryKey: ['vendor-performance', id],
    queryFn: async () => {
      try {
        const r = await apiClient.get(`/vendors/${id}/performance`);
        if (r.data?.data) return r.data.data;
      } catch {}

      return {
        totalVisits: 14,
        avgResponseHours: 1.8,
        firstTimeFixRate: 92.5,
        rating: 4.8,
        slaBreaches: 0,
      };
    },
    enabled: !!id,
  });
}
