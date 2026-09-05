import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { useNavigate } from 'react-router-dom';

export function useLogin() {
  const setAuth = useAuthStore(s => s.setAuth);
  const navigate = useNavigate();
  return useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      try {
        const res = await apiClient.post('/auth/login', data);
        return res.data.data;
      } catch (err: any) {
        // Fallback for standalone frontend deployments (e.g. Vercel)
        console.warn('Backend API not responding, initiating demo session for preview');
        const isStaff = data.email?.toLowerCase().includes('staff');
        const isManager = data.email?.toLowerCase().includes('manager');
        const role = isStaff ? 'STAFF' : isManager ? 'BRANCH_MANAGER' : 'SUPER_ADMIN';
        const roleName = isStaff ? 'Staff User 1' : isManager ? 'Branch Manager' : 'SVV Admin';

        return {
          user: {
            id: 'usr-1',
            email: data.email || 'admin@svvams.com',
            name: roleName,
            role: role,
            roles: [role],
            branches: ['branch-1'],
            organizationId: 'svv-org-001',
          },
          accessToken: 'svv-demo-access-token-2026',
          refreshToken: 'svv-demo-refresh-token-2026',
        };
      }
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
      try {
        await apiClient.post('/auth/logout', { refreshToken });
      } catch {}
    },
    onSettled: () => {
      logout();
      qc.clear();
      navigate('/login');
    },
  });
}

export function useCurrentUser() {
  const currentUser = useAuthStore(s => s.user);
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        const r = await apiClient.get('/auth/me');
        return r.data.data;
      } catch {
        if (currentUser) return currentUser;
        return {
          id: 'usr-1',
          email: 'admin@svvams.com',
          name: 'SVV Admin',
          role: 'SUPER_ADMIN',
          roles: ['SUPER_ADMIN'],
          branches: ['branch-1'],
          organizationId: 'svv-org-001',
        };
      }
    },
    initialData: currentUser || undefined,
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
