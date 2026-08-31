import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export function usePrintOrders(params?: any) {
  return useQuery({
    queryKey: ['print-orders', params],
    queryFn: async () => {
      const res = await apiClient.get('/print-hub/orders', { params });
      return res.data;
    },
  });
}

export function useCreatePrintOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiClient.post('/print-hub/orders', data);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['print-orders'] });
      qc.invalidateQueries({ queryKey: ['print-hub-analytics'] });
      qc.invalidateQueries({ queryKey: ['print-tokens'] });
    },
  });
}

export function useUpdatePrintOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, staffId }: { id: string; status: string; staffId?: string | null }) => {
      const res = await apiClient.patch(`/print-hub/orders/${id}/status`, { status, staffId });
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['print-orders'] });
      qc.invalidateQueries({ queryKey: ['print-tokens'] });
      qc.invalidateQueries({ queryKey: ['print-hub-analytics'] });
    },
  });
}

export function useWhatsAppInbox(branchId?: string) {
  return useQuery({
    queryKey: ['whatsapp-inbox', branchId],
    queryFn: async () => {
      const res = await apiClient.get('/print-hub/whatsapp/inbox', { params: { branchId } });
      return res.data.data;
    },
    refetchInterval: 10000,
  });
}

export function useSendWhatsAppMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiClient.post('/print-hub/whatsapp/messages', data);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['whatsapp-inbox'] });
      qc.invalidateQueries({ queryKey: ['print-orders'] });
    },
  });
}

export function useSendStaffDirectChatMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { branchId?: string; phone: string; messageBody: string; orderId?: string }) => {
      const res = await apiClient.post('/print-hub/whatsapp/send-chat', data);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['whatsapp-inbox'] });
      qc.invalidateQueries({ queryKey: ['print-orders'] });
    },
  });
}

export function useTokensBoard(branchId?: string) {
  return useQuery({
    queryKey: ['print-tokens', branchId],
    queryFn: async () => {
      const res = await apiClient.get('/print-hub/tokens/board', { params: { branchId } });
      return res.data.data;
    },
    refetchInterval: 5000,
  });
}

export function useAdvertisements(branchId?: string) {
  return useQuery({
    queryKey: ['branch-ads', branchId],
    queryFn: async () => {
      const res = await apiClient.get('/print-hub/ads', { params: { branchId } });
      return res.data.data;
    },
  });
}

export function useCreateAdvertisement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiClient.post('/print-hub/ads', data);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branch-ads'] });
    },
  });
}

export function usePrintHubAnalytics(branchId?: string) {
  return useQuery({
    queryKey: ['print-hub-analytics', branchId],
    queryFn: async () => {
      const res = await apiClient.get('/print-hub/analytics', { params: { branchId } });
      return res.data.data;
    },
  });
}

export function useBranchWhatsAppConfigs() {
  return useQuery({
    queryKey: ['branch-whatsapp-configs'],
    queryFn: async () => {
      const res = await apiClient.get('/print-hub/whatsapp/configs');
      return res.data.data;
    },
  });
}

export function useUpsertBranchWhatsAppConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ branchId, data }: { branchId: string; data: any }) => {
      const res = await apiClient.put(`/print-hub/whatsapp/configs/${branchId}`, data);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branch-whatsapp-configs'] });
      qc.invalidateQueries({ queryKey: ['branches'] });
    },
  });
}

export function useTestWhatsAppConnection() {
  return useMutation({
    mutationFn: async ({ branchId, testPhone }: { branchId: string; testPhone: string }) => {
      const res = await apiClient.post(`/print-hub/whatsapp/configs/${branchId}/test`, { testPhone });
      return res.data;
    },
  });
}

export function useStartWhatsAppGateway() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (branchId: string) => {
      const res = await apiClient.post(`/print-hub/whatsapp/gateway/${branchId}/start`);
      return res.data.data;
    },
    onSuccess: (_, branchId) => {
      qc.invalidateQueries({ queryKey: ['whatsapp-gateway-status', branchId] });
      qc.invalidateQueries({ queryKey: ['branch-whatsapp-configs'] });
    },
  });
}

export function useWhatsAppGatewayStatus(branchId?: string, enabled = true) {
  return useQuery({
    queryKey: ['whatsapp-gateway-status', branchId],
    queryFn: async () => {
      if (!branchId) return null;
      const res = await apiClient.get(`/print-hub/whatsapp/gateway/${branchId}/status`);
      return res.data.data;
    },
    enabled: Boolean(branchId) && enabled,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status === 'CONNECTED') return 8000;
      return 2000; // Fast polling when scanning QR
    },
  });
}

export function useDisconnectWhatsAppGateway() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (branchId: string) => {
      const res = await apiClient.post(`/print-hub/whatsapp/gateway/${branchId}/disconnect`);
      return res.data.data;
    },
    onSuccess: (_, branchId) => {
      qc.invalidateQueries({ queryKey: ['whatsapp-gateway-status', branchId] });
      qc.invalidateQueries({ queryKey: ['branch-whatsapp-configs'] });
    },
  });
}
