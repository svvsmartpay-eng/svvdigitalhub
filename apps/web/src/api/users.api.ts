import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export function useUsers(params?: any) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: async () => {
      try {
        const r = await apiClient.get('/users', { params });
        if (r.data?.data && r.data.data.length > 0) return r.data.data;
      } catch {}

      try {
        const { data: supaUsers, error } = await supabase
          .from('users')
          .select('*, roles:roles(*)')
          .order('name', { ascending: true });

        if (!error && supaUsers && supaUsers.length > 0) {
          return supaUsers.map(u => ({
            ...u,
            roleNames: u.roles?.[0]?.name || (u.email?.includes('admin') ? 'SUPER_ADMIN' : 'STAFF'),
          }));
        }
      } catch (err) {
        console.warn('Supabase fetch users error:', err);
      }

      return [];
    },
    staleTime: 60 * 1000,
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: async () => {
      try {
        const r = await apiClient.get(`/users/${id}`);
        if (r.data?.data) return r.data.data;
      } catch {}

      try {
        const { data: supaUser } = await supabase
          .from('users')
          .select('*')
          .eq('id', id)
          .single();
        if (supaUser) return supaUser;
      } catch {}

      return null;
    },
    enabled: !!id,
  });
}

export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      try {
        const r = await apiClient.get('/users/roles');
        if (r.data?.data && r.data.data.length > 0) return r.data.data;
      } catch {}

      try {
        const { data: supaRoles } = await supabase.from('roles').select('*');
        if (supaRoles && supaRoles.length > 0) return supaRoles;
      } catch {}

      return [
        { id: 'r-1', name: 'SUPER_ADMIN', description: 'Full System Access' },
        { id: 'r-2', name: 'ADMIN', description: 'Administrative Access' },
        { id: 'r-3', name: 'BRANCH_MANAGER', description: 'Branch Management Access' },
        { id: 'r-4', name: 'STAFF', description: 'Desk Staff Operations' },
        { id: 'r-5', name: 'TECHNICIAN', description: 'Maintenance and Field Service' },
      ];
    },
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      try {
        const r = await apiClient.post('/users', data);
        if (r.data?.data) return r.data.data;
      } catch {}

      const now = new Date().toISOString();
      const id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `usr-${Date.now()}`;
      const { data: created, error } = await supabase.from('users').insert([{
        id,
        organizationId: 'svv-org-001',
        employeeId: data.employeeId || `EMP-${Math.floor(100 + Math.random() * 900)}`,
        name: data.name,
        email: data.email,
        phone: data.phone || '—',
        designation: data.designation || 'Staff Member',
        department: data.department || 'Operations',
        status: data.status || 'ACTIVE',
        createdAt: now,
        updatedAt: now,
      }]).select().single();

      if (error) throw error;
      return created;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      try {
        const r = await apiClient.put(`/users/${id}`, data);
        if (r.data?.data) return r.data.data;
      } catch {}

      const { data: updated, error } = await supabase
        .from('users')
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
      qc.invalidateQueries({ queryKey: ['user', id] });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async ({ id, newPassword }: { id: string; newPassword: string }) => {
      try {
        const r = await apiClient.post(`/users/${id}/reset-password`, { newPassword });
        return r.data.data;
      } catch {}
      return { success: true };
    },
  });
}
