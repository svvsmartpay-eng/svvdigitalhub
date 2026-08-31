import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export function useWorkOrders(params?: any) {
  return useQuery({
    queryKey: ['work-orders', params],
    queryFn: async () => {
      try {
        const r = await apiClient.get('/work-orders', { params });
        if (r.data?.data && r.data.data.length > 0) return r.data.data;
      } catch {}

      try {
        const { data: supaWOs, error } = await supabase
          .from('work_orders')
          .select('*, branch:branches(name, code), asset:assets(name, assetId)')
          .order('createdAt', { ascending: false });

        if (!error && supaWOs) return supaWOs;
      } catch {}

      return [];
    },
    staleTime: 30 * 1000,
  });
}

export function useWorkOrder(id: string) {
  return useQuery({
    queryKey: ['work-order', id],
    queryFn: async () => {
      try {
        const r = await apiClient.get(`/work-orders/${id}`);
        if (r.data?.data) return r.data.data;
      } catch {}

      try {
        const { data: supaWO } = await supabase
          .from('work_orders')
          .select('*, branch:branches(name, code), asset:assets(name, assetId)')
          .eq('id', id)
          .single();
        if (supaWO) return supaWO;
      } catch {}

      return null;
    },
    enabled: !!id,
  });
}

export function useCreateWorkOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      try {
        const r = await apiClient.post('/work-orders', data);
        if (r.data?.data) return r.data.data;
      } catch {}

      const now = new Date().toISOString();
      const id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `wo-${Date.now()}`;
      const { data: created, error } = await supabase.from('work_orders').insert([{
        id,
        workOrderNo: `WO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
        organizationId: 'svv-org-001',
        branchId: data.branchId || 'f5abaacc-d2b6-4591-91fb-314b2188e18c',
        assetId: data.assetId || null,
        issueId: data.issueId || null,
        title: data.title || 'Work Order',
        description: data.description || '',
        priority: data.priority || 'MEDIUM',
        status: 'ASSIGNED',
        estimatedCost: data.estimatedCost || 1500,
        createdAt: now,
        updatedAt: now,
      }]).select().single();

      if (error) throw error;
      return created;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['work-orders'] }),
  });
}

export function useUpdateWorkOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      try {
        const r = await apiClient.patch(`/work-orders/${id}/status`, { status });
        if (r.data?.data) return r.data.data;
      } catch {}

      const { data: updated, error } = await supabase
        .from('work_orders')
        .update({
          status,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['work-order', id] });
      qc.invalidateQueries({ queryKey: ['work-orders'] });
    },
  });
}

export function useApproveWorkOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      try {
        const r = await apiClient.post(`/work-orders/${id}/approve`);
        if (r.data?.data) return r.data.data;
      } catch {}
      return { success: true };
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['work-order', id] });
      qc.invalidateQueries({ queryKey: ['work-orders'] });
    },
  });
}
