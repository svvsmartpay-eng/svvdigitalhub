import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { supabase } from '@/lib/supabase';

const DEFAULT_USERS = [
  {
    id: 'usr-1',
    employeeId: 'EMP-001',
    name: 'SVV Admin',
    email: 'admin@svvams.com',
    phone: '',
    designation: 'Super Administrator',
    department: 'Executive Operations',
    status: 'ACTIVE',
    roleNames: 'SUPER_ADMIN',
    roles: [{ id: 'r-1', name: 'SUPER_ADMIN', type: 'SUPER_ADMIN' }],
    branches: [{ id: 'f5abaacc-d2b6-4591-91fb-314b2188e18c', name: 'SVV Main Hub', code: 'SVV-1' }],
    createdAt: '2026-01-10T10:00:00Z',
  },
  {
    id: 'usr-2',
    employeeId: 'EMP-002',
    name: 'Rajesh Sharma',
    email: 'manager@svvams.com',
    phone: '',
    designation: 'Branch Operations Manager',
    department: 'Branch Operations',
    status: 'ACTIVE',
    roleNames: 'BRANCH_MANAGER',
    roles: [{ id: 'r-3', name: 'BRANCH_MANAGER', type: 'BRANCH_MANAGER' }],
    branches: [{ id: 'f5abaacc-d2b6-4591-91fb-314b2188e18c', name: 'SVV Main Hub', code: 'SVV-1' }],
    createdAt: '2026-01-12T10:00:00Z',
  },
  {
    id: 'usr-3',
    employeeId: 'EMP-003',
    name: 'Staff User 1',
    email: 'staff@svvams.com',
    phone: '+91 77807 32293',
    designation: 'Print & Counter Operator',
    department: 'Print Operations',
    status: 'ACTIVE',
    roleNames: 'STAFF',
    roles: [{ id: 'r-4', name: 'STAFF', type: 'STAFF' }],
    branches: [{ id: 'f5abaacc-d2b6-4591-91fb-314b2188e18c', name: 'SVV Main Hub', code: 'SVV-1' }],
    createdAt: '2026-01-15T10:00:00Z',
  },
  {
    id: 'usr-4',
    employeeId: 'EMP-004',
    name: 'Sunil Varma',
    email: 'sunil@svvams.com',
    phone: '+91 95029 50416',
    designation: 'Customer Service & Desk Staff',
    department: 'Front Desk',
    status: 'ACTIVE',
    roleNames: 'STAFF',
    roles: [{ id: 'r-4', name: 'STAFF', type: 'STAFF' }],
    branches: [{ id: 'branch-2', name: 'Branch 2 (Patancheru)', code: 'SVV-2' }],
    createdAt: '2026-02-01T10:00:00Z',
  },
  {
    id: 'usr-5',
    employeeId: 'EMP-005',
    name: 'Ramesh K',
    email: 'tech@svvams.com',
    phone: '+91 94401 23456',
    designation: 'Hardware & Network Technician',
    department: 'Technical Maintenance',
    status: 'ACTIVE',
    roleNames: 'TECHNICIAN',
    roles: [{ id: 'r-5', name: 'TECHNICIAN', type: 'TECHNICIAN' }],
    branches: [
      { id: 'f5abaacc-d2b6-4591-91fb-314b2188e18c', name: 'SVV Main Hub', code: 'SVV-1' },
      { id: 'branch-2', name: 'Branch 2 (Patancheru)', code: 'SVV-2' }
    ],
    createdAt: '2026-02-10T10:00:00Z',
  }
];

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
          .select('*')
          .order('name', { ascending: true });

        if (!error && supaUsers && supaUsers.length > 0) {
          const { data: branches } = await supabase.from('branches').select('*');
          const { data: roles } = await supabase.from('roles').select('*');

          return supaUsers.map(u => {
            const roleName = u.role || (u.email?.includes('admin') ? 'SUPER_ADMIN' : u.email?.includes('manager') ? 'BRANCH_MANAGER' : 'STAFF');
            const matchingRole = roles?.find(r => r.name === roleName || r.type === roleName) || { id: 'r-1', name: roleName, type: roleName };
            const matchingBranch = branches?.find(b => b.id === u.branchId) || { id: 'f5abaacc-d2b6-4591-91fb-314b2188e18c', name: 'SVV Main Hub', code: 'SVV-1' };

            return {
              ...u,
              roleNames: roleName,
              roles: u.roles || [matchingRole],
              branches: u.branches || [matchingBranch],
            };
          });
        }
      } catch (err) {
        console.warn('Supabase fetch users error:', err);
      }

      return DEFAULT_USERS;
    },
    staleTime: 5000,
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

      return DEFAULT_USERS.find(u => u.id === id) || null;
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
        { id: 'r-1', name: 'SUPER_ADMIN', type: 'SUPER_ADMIN', description: 'Full System Access' },
        { id: 'r-2', name: 'ADMIN', type: 'ADMIN', description: 'Administrative Access' },
        { id: 'r-3', name: 'BRANCH_MANAGER', type: 'BRANCH_MANAGER', description: 'Branch Management Access' },
        { id: 'r-4', name: 'STAFF', type: 'STAFF', description: 'Desk Staff Operations' },
        { id: 'r-5', name: 'TECHNICIAN', type: 'TECHNICIAN', description: 'Maintenance and Field Service' },
      ];
    },
    staleTime: 60 * 1000,
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
      
      const payload = {
        id,
        organizationId: 'svv-org-001',
        employeeId: data.employeeId || `EMP-${Math.floor(100 + Math.random() * 900)}`,
        name: data.name,
        email: data.email,
        phone: data.phone || '—',
        designation: data.designation || 'Staff Member',
        department: data.department || 'Operations',
        status: data.status || 'ACTIVE',
        branchId: data.branchIds?.[0] || 'f5abaacc-d2b6-4591-91fb-314b2188e18c',
        createdAt: now,
        updatedAt: now,
      };

      try {
        await supabase.from('users').upsert(payload, { onConflict: 'id' });
      } catch (e) {
        console.warn('Supabase insert user error:', e);
      }

      return payload;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
    },
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

      try {
        await supabase
          .from('users')
          .update({
            name: data.name,
            phone: data.phone,
            designation: data.designation,
            department: data.department,
            status: data.status,
            branchId: data.branchIds?.[0] || data.branchId,
            updatedAt: new Date().toISOString(),
          })
          .eq('id', id);
      } catch (e) {
        console.warn('Supabase update user error:', e);
      }

      return { id, ...data };
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['user', id] });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await apiClient.delete(`/users/${id}`);
      } catch {}

      try {
        await supabase.from('users').delete().eq('id', id);
      } catch (e) {
        console.warn('Supabase delete user error:', e);
      }

      return { id, success: true };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async ({ id, newPassword }: { id: string; newPassword: string }) => {
      try {
        const r = await apiClient.post(`/users/${id}/reset-password`, { newPassword });
        return r.data?.data || { success: true };
      } catch {}
      return { success: true };
    },
  });
}
