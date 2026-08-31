import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export function useTechnicians(params?: any) {
  return useQuery({
    queryKey: ['technicians', params],
    queryFn: async () => {
      try {
        const r = await apiClient.get('/technicians', { params });
        if (r.data?.data && r.data.data.length > 0) return r.data.data;
      } catch {}

      try {
        const { data: supaTechs, error } = await supabase
          .from('technicians')
          .select('*, vendor:vendors(name, code)')
          .order('name', { ascending: true });

        if (!error && supaTechs) return supaTechs;
      } catch {}

      return [];
    },
    staleTime: 60 * 1000,
  });
}

export function useTechnician(id: string) {
  return useQuery({
    queryKey: ['technician', id],
    queryFn: async () => {
      try {
        const r = await apiClient.get(`/technicians/${id}`);
        if (r.data?.data) return r.data.data;
      } catch {}

      try {
        const { data: supaTech } = await supabase
          .from('technicians')
          .select('*, vendor:vendors(name, code)')
          .eq('id', id)
          .single();
        if (supaTech) return supaTech;
      } catch {}

      return null;
    },
    enabled: !!id,
  });
}

export function useCreateTechnician() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      try {
        const r = await apiClient.post('/technicians', data);
        if (r.data?.data) return r.data.data;
      } catch {}

      const now = new Date().toISOString();
      const id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `tch-${Date.now()}`;
      const { data: created, error } = await supabase.from('technicians').insert([{
        id,
        organizationId: 'svv-org-001',
        techId: data.techId || `TCH-${Math.floor(100 + Math.random() * 900)}`,
        name: data.name,
        email: data.email,
        phone: data.phone,
        vendorId: data.vendorId || 'v-1',
        specializations: data.specializations || ['Printers', 'Hardware'],
        skillLevel: data.skillLevel || 'EXPERT',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      }]).select().single();

      if (error) throw error;
      return created;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['technicians'] }),
  });
}

export function useUpdateTechnician() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      try {
        const r = await apiClient.put(`/technicians/${id}`, data);
        if (r.data?.data) return r.data.data;
      } catch {}

      const { data: updated, error } = await supabase
        .from('technicians')
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
      qc.invalidateQueries({ queryKey: ['technician', id] });
      qc.invalidateQueries({ queryKey: ['technicians'] });
    },
  });
}
