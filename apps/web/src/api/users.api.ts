import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export function useUsers(params?: any) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: async () => {
      const r = await apiClient.get('/users', { params });
      return r.data.data;
    },
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: async () => {
      const r = await apiClient.get(`/users/${id}`);
      return r.data.data;
    },
    enabled: !!id,
  });
}

export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const r = await apiClient.get('/users/roles');
      return r.data.data;
    },
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const r = await apiClient.post('/users', data);
      return r.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const r = await apiClient.put(`/users/${id}`, data);
      return r.data.data;
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
      const r = await apiClient.post(`/users/${id}/reset-password`, { newPassword });
      return r.data.data;
    },
  });
}
