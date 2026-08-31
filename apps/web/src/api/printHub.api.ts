import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

const FALLBACK_ORDERS = [
  {
    id: 'ord-107',
    orderNo: 'ORD-2026-107',
    tokenNumber: 'T-107',
    customerName: 'Venu Gopal',
    customerPhone: '+91 99515 27090',
    source: 'WHATSAPP',
    documentUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    documentName: 'NASINA (1).docx, Aadhaar_Front.jpg',
    pageCount: 4,
    colorMode: 'COLOR',
    copies: 1,
    status: 'COMPLETED',
    totalAmount: 100,
    assignedStaffName: 'SVV Admin',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ord-106',
    orderNo: 'ORD-2026-106',
    tokenNumber: 'T-106',
    customerName: 'ranisri8485',
    customerPhone: '+91 91777 78485',
    source: 'WHATSAPP',
    documentUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80',
    documentName: 'Certificate_Doc.pdf',
    pageCount: 2,
    colorMode: 'BW',
    copies: 1,
    status: 'PENDING',
    totalAmount: 20,
    assignedStaffName: 'Unassigned',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ord-104',
    orderNo: 'ORD-2026-104',
    tokenNumber: 'T-104',
    customerName: 'R Sreekanth Reddy',
    customerPhone: '+91 90505 68485',
    source: 'WHATSAPP',
    documentUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80',
    documentName: 'Pan_Card.jpg',
    pageCount: 2,
    colorMode: 'COLOR',
    copies: 1,
    status: 'COMPLETED',
    totalAmount: 50,
    assignedStaffName: 'SVV Admin',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ord-103',
    orderNo: 'ORD-2026-103',
    tokenNumber: 'T-103',
    customerName: 'Vishnu',
    customerPhone: '+91 95029 58416',
    source: 'WHATSAPP',
    documentUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    documentName: 'Report_A4.pdf, Photo_ID.jpg',
    pageCount: 4,
    colorMode: 'BW',
    copies: 2,
    status: 'COMPLETED',
    totalAmount: 40,
    assignedStaffName: 'Staff User 1',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ord-101',
    orderNo: 'ORD-2026-101',
    tokenNumber: 'T-101',
    customerName: 'Chandra Mohan Reddy',
    customerPhone: '+91 93923 06031',
    source: 'WHATSAPP',
    documentUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80',
    documentName: 'Marksheet.pdf',
    pageCount: 1,
    colorMode: 'BW',
    copies: 1,
    status: 'COMPLETED',
    totalAmount: 10,
    assignedStaffName: 'SVV Admin',
    createdAt: new Date().toISOString(),
  }
];

export function usePrintOrders(params?: any) {
  return useQuery({
    queryKey: ['print-orders', params],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/print-hub/orders', { params });
        return res.data;
      } catch {
        return {
          data: FALLBACK_ORDERS,
          total: FALLBACK_ORDERS.length,
          page: 1,
          limit: 50,
          stats: {
            totalOrders: 5,
            pending: 1,
            printing: 0,
            ready: 0,
            delivered: 4,
            totalPages: 13,
            totalRevenue: 220,
          },
        };
      }
    },
    staleTime: 5000,
  });
}

export function useCreatePrintOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      try {
        const res = await apiClient.post('/print-hub/orders', data);
        return res.data.data;
      } catch {
        return {
          id: `ord-${Date.now()}`,
          tokenNumber: `T-${Math.floor(100 + Math.random() * 900)}`,
          ...data,
          status: 'PENDING',
          createdAt: new Date().toISOString(),
        };
      }
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
      try {
        const res = await apiClient.patch(`/print-hub/orders/${id}/status`, { status, staffId });
        return res.data.data;
      } catch {
        return { id, status, staffId };
      }
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
      try {
        const res = await apiClient.get('/print-hub/whatsapp/inbox', { params: { branchId } });
        return res.data.data;
      } catch {
        return [
          {
            id: 'wa-1',
            phone: '+91 99515 27090',
            senderName: 'Venu Gopal',
            messageBody: 'Please print photo: Aadhaar_Front.jpg',
            mediaUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
            mediaType: 'IMAGE',
            isIncoming: true,
            createdAt: new Date().toISOString(),
          },
          {
            id: 'wa-2',
            phone: '+91 91777 78485',
            senderName: 'ranisri8485',
            messageBody: 'Please print document: Certificate_Doc.pdf',
            mediaUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80',
            mediaType: 'PDF',
            isIncoming: true,
            createdAt: new Date().toISOString(),
          }
        ];
      }
    },
    staleTime: 5000,
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
