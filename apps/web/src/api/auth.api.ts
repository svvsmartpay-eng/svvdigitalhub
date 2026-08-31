import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { useNavigate } from 'react-router-dom';

export function useLogin() {
  const setAuth = useAuthStore(s => s.setAuth);
  const navigate = useNavigate();
  return useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const res = await apiClient.post('/auth/login', data);
      return res.data.data;
    },
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken);
      navigate('/dashboard');
    },
  });
}

export function useLogout() {
  const { refreshToken, logout } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await apiClient.post('/auth/logout', { refreshToken });
    },
    onSettled: () => {
      logout();
      qc.clear();
      navigate('/login');
    },
  });
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => { const r = await apiClient.get('/auth/me'); return r.data.data; },
    staleTime: 5 * 60 * 1000,
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (data: { oldPassword: string; newPassword: string }) => {
      const r = await apiClient.post('/auth/change-password', data);
      return r.data;
    },
  });
}
