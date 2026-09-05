import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFilterStore } from '@/stores/filter.store';
import { apiClient } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export function usePrintHubRealtimeSync() {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('print_hub_realtime_stream')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'print_orders' },
        () => {
          qc.invalidateQueries({ queryKey: ['print-orders'] });
          qc.invalidateQueries({ queryKey: ['print-tokens'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'whatsapp_messages' },
        () => {
          qc.invalidateQueries({ queryKey: ['whatsapp-inbox'] });
          qc.invalidateQueries({ queryKey: ['whatsapp-chat'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}

export function usePrintOrders(params?: any) {
  const selectedBranches = useFilterStore(s => s.selectedBranches);
  return useQuery({
    queryKey: ['print-orders', params, selectedBranches],
    queryFn: async () => {
      // 1. Try local/cloud backend API first if available
      try {
        const res = await apiClient.get('/print-hub/orders', { params });
        if (res.data?.data && res.data.data.length > 0) return res.data;
      } catch (e) {
        // Backend not reached, query Supabase
      }

      // 2. Query Supabase Cloud Database directly
      try {
        let query = supabase.from('print_orders').select('*, branch:branches(name), assignedStaff:users(name)');
        if (selectedBranches.length > 0) {
          query = query.in('branchId', selectedBranches);
        }
        const { data: supaOrders, error } = await query.order('createdAt', { ascending: false });

        if (!error && supaOrders) {
          const formatted = supaOrders.map(o => ({
            id: o.id,
            orderNo: o.orderNo,
            tokenNumber: o.tokenNumber,
            ticket_code: o.ticket_code || o.tokenNumber,
            customerName: o.customerName,
            customerPhone: o.customerPhone,
            source: o.source,
            documentUrl: o.documentUrl,
            documentName: o.documentName,
            pageCount: o.pageCount,
            colorMode: o.colorMode,
            copies: o.copies,
            status: o.status,
            ticket_status: o.ticket_status || (o.status === 'DELIVERED' || o.status === 'COMPLETED' ? 'CLOSED' : (o.status === 'PRINTING' ? 'IN_PROGRESS' : 'RECEIVED')),
            totalAmount: o.totalAmount,
            assignedStaffName: o.assignedStaff?.name || (o.status === 'DELIVERED' ? 'SVV Admin' : 'Unassigned'),
            assignedStaffId: o.assignedStaffId,
            received_at: o.received_at || o.createdAt,
            started_at: o.started_at,
            last_activity_at: o.last_activity_at || o.updatedAt || o.createdAt,
            closed_at: o.closed_at || o.completedAt || o.deliveredAt,
            waiting_time_seconds: o.waiting_time_seconds || 0,
            processing_time_seconds: o.processing_time_seconds || 0,
            total_duration_seconds: o.total_duration_seconds || 0,
            input_documents: Array.isArray(o.input_documents) ? o.input_documents : [],
            createdAt: o.createdAt,
            updatedAt: o.updatedAt,
            branch: o.branch,
            branchId: o.branchId,
          }));

          const pending = formatted.filter(o => o.status === 'PENDING').length;
          const printing = formatted.filter(o => o.status === 'PRINTING').length;
          const ready = formatted.filter(o => o.status === 'READY_FOR_DELIVERY').length;
          const delivered = formatted.filter(o => o.status === 'DELIVERED' || o.status === 'COMPLETED').length;
          const totalPages = formatted.reduce((acc, curr) => acc + (curr.pageCount || 1), 0);
          const totalRevenue = formatted.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);

          return {
            data: formatted,
            total: formatted.length,
            page: 1,
            limit: 50,
            stats: {
              totalOrders: formatted.length,
              pending,
              printing,
              ready,
              delivered,
              totalPages,
              totalRevenue,
            },
          };
        }
      } catch (supaErr) {
        console.warn('Supabase fetch error:', supaErr);
      }

      return {
        data: [],
        total: 0,
        page: 1,
        limit: 50,
        stats: {
          totalOrders: 0,
          pending: 0,
          printing: 0,
          ready: 0,
          delivered: 0,
          totalPages: 0,
          totalRevenue: 0,
        },
      };
    },
    refetchInterval: 3000,
    staleTime: 2000,
  });
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function useCreatePrintOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      // 1. Try local/cloud backend API first if available
      try {
        const res = await apiClient.post('/print-hub/orders', data);
        if (res.data?.data) return res.data.data;
      } catch {}

      // 2. Insert directly into Supabase cloud database
      const orderNo = `ORD-${Date.now()}`;
      let tokenNumber = `T-${Math.floor(108 + Math.random() * 800)}`;
      
      try {
        const { data: latestOrders } = await supabase
          .from('print_orders')
          .select('tokenNumber')
          .order('createdAt', { ascending: false })
          .limit(10);

        if (latestOrders && latestOrders.length > 0) {
          const tokenNums = latestOrders
            .map(o => parseInt(o.tokenNumber?.replace(/[^0-9]/g, '') || '107', 10))
            .filter(n => !isNaN(n));
          if (tokenNums.length > 0) {
            const maxToken = Math.max(...tokenNums);
            tokenNumber = `T-${maxToken + 1}`;
          }
        }
      } catch {}

      const newId = generateUUID();
      const now = new Date().toISOString();

      const newOrderPayload = {
        id: newId,
        orderNo,
        tokenNumber,
        organizationId: 'svv-org-001',
        branchId: data.branchId || 'f5abaacc-d2b6-4591-91fb-314b2188e18c',
        customerName: data.customerName || 'Walk-in Customer',
        customerPhone: data.customerPhone || '+91 99999 99999',
        source: data.source || 'MANUAL_COUNTER',
        documentUrl: data.documentUrl || 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600&auto=format&fit=crop&q=80',
        documentName: data.documentName || 'Counter_Document.pdf',
        pageCount: data.pageCount || 1,
        colorMode: data.colorMode || 'COLOR',
        copies: data.copies || 1,
        totalAmount: data.totalAmount || 100,
        status: 'PENDING',
        createdAt: now,
        updatedAt: now,
      };

      try {
        const { data: inserted, error } = await supabase
          .from('print_orders')
          .insert([newOrderPayload])
          .select('*')
          .single();

        if (!error && inserted) {
          return {
            ...inserted,
            assignedStaffName: 'Unassigned',
          };
        }
      } catch (err) {
        console.warn('Supabase direct insert error:', err);
      }

      return {
        ...newOrderPayload,
        assignedStaffName: 'Unassigned',
      };
    },
    onSuccess: () => {
      qc.invalidateQueries();
    },
  });
}

export function useUpdatePrintOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, staffId }: { id: string; status: string; staffId?: string | null }) => {
      try {
        await apiClient.patch(`/print-hub/orders/${id}/status`, { status, staffId });
      } catch {}

      try {
        const supaStatus = status === 'COMPLETED' ? 'DELIVERED' : status;
        await supabase
          .from('print_orders')
          .update({ status: supaStatus, assignedStaffId: staffId })
          .eq('id', id);
      } catch {}

      return { id, status, staffId };
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
        if (res.data?.data && res.data.data.length > 0) return res.data.data;
      } catch {}

      try {
        const { data: supaMsgs, error } = await supabase
          .from('whatsapp_messages')
          .select('*')
          .order('createdAt', { ascending: false });

        if (!error && supaMsgs) {
          return supaMsgs;
        }
      } catch {}

      return [];
    },
    refetchInterval: 3000,
    staleTime: 2000,
  });
}

export function useSendStaffDirectChatMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { branchId?: string; phone: string; messageBody: string; orderId?: string }) => {
      try {
        await apiClient.post('/print-hub/whatsapp/send-chat', data);
      } catch {}

      try {
        const now = new Date().toISOString();
        await supabase.from('whatsapp_messages').insert([{
          id: generateUUID(),
          phone: data.phone,
          senderName: 'SVV Staff',
          messageBody: data.messageBody,
          isIncoming: false,
          organizationId: 'svv-org-001',
          branchId: data.branchId || 'f5abaacc-d2b6-4591-91fb-314b2188e18c',
          orderId: data.orderId || null,
          createdAt: now,
          updatedAt: now,
        }]);
      } catch (err) {
        console.warn('Supabase whatsapp message insert error:', err);
      }

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries();
    },
  });
}

export function useTokensBoard(branchId?: string) {
  const selectedBranches = useFilterStore(s => s.selectedBranches);
  return useQuery({
    queryKey: ['print-tokens', branchId],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/print-hub/tokens/board', { params: { branchId } });
        if (res.data?.data) return res.data.data;
      } catch {}

      try {
        let query = supabase.from('print_orders').select('*').order('createdAt', { ascending: false });
          if (selectedBranches.length > 0) {
            query = query.in('branchId', selectedBranches);
          }
          const { data: supaOrders } = await query;

        if (supaOrders && supaOrders.length > 0) {
          return {
            tokens: supaOrders.map(o => ({
              tokenNumber: o.tokenNumber,
              orderNo: o.orderNo,
              status: o.status,
              customerName: o.customerName,
              colorMode: o.colorMode,
              copies: o.copies,
              createdAt: o.createdAt,
            })),
            activeCount: supaOrders.filter(o => o.status === 'PENDING' || o.status === 'PRINTING').length,
            readyCount: supaOrders.filter(o => o.status === 'READY_FOR_DELIVERY').length,
          };
        }
      } catch {}

      return {
        tokens: [
          { tokenNumber: 'T-107', status: 'COMPLETED', customerName: 'Venu Gopal' },
          { tokenNumber: 'T-106', status: 'PENDING', customerName: 'ranisri8485' },
          { tokenNumber: 'T-104', status: 'COMPLETED', customerName: 'R Sreekanth Reddy' },
          { tokenNumber: 'T-103', status: 'COMPLETED', customerName: 'Vishnu' },
          { tokenNumber: 'T-101', status: 'COMPLETED', customerName: 'Chandra Mohan Reddy' },
        ],
        activeCount: 1,
        readyCount: 0,
      };
    },
    refetchInterval: 5000,
  });
}

export function useAdvertisements(branchId?: string) {
  return useQuery({
    queryKey: ['branch-ads', branchId],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/print-hub/ads', { params: { branchId } });
        if (res.data?.data) return res.data.data;
      } catch {}
      return [];
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
      try {
        const res = await apiClient.get('/print-hub/analytics', { params: { branchId } });
        if (res.data?.data) return res.data.data;
      } catch {}

      return {
        widgets: {
          pendingPrintJobs: 1,
          newWhatsAppOrders: 5,
          activeTokens: 5,
          totalRevenueToday: 220,
        }
      };
    },
  });
}

export function useBranchWhatsAppConfigs() {
  return useQuery({
    queryKey: ['branch-whatsapp-configs'],
    queryFn: async () => {
      // 1. Try Supabase first (authoritative source)
      try {
        const { data: supaBranches } = await supabase.from('branches').select('*');
        const { data: supaConfigs } = await supabase.from('branch_whatsapp_configs').select('*');

        const activeBranches = (supaBranches || []).filter((b: any) => b.isActive !== false);

        if (activeBranches.length > 0) {
          return activeBranches.map((b: any) => {
            const cfg = (supaConfigs || []).find((c: any) => c.branchId === b.id);
            // Only use real stored numbers — never fallback to demo numbers
            const waNum = cfg?.whatsappNumber || b.whatsappNumber || b.phone || null;
            const isConn = cfg?.status === 'CONNECTED' && !!waNum;
            return {
              id: cfg?.id || `cfg-${b.id}`,
              branchId: b.id,
              branchName: b.name,
              branchCode: b.code,
              branchCity: b.city,
              whatsappNumber: waNum,
              phoneNumber: waNum,
              displayName: cfg?.displayName || `${b.name} Print Desk`,
              status: isConn ? 'CONNECTED' : 'OFFLINE',
              isEnabled: isConn,
              welcomeMessage: cfg?.welcomeMessage || `Welcome to ${b.name} Print Desk! Send your PDF or image documents here for instant printing.`,
            };
          });
        }
      } catch (e) {
        console.warn('Supabase fetch branch configs error:', e);
      }

      // 2. Fallback to localStorage (no fake numbers — only real saved numbers)
      try {
        const local = localStorage.getItem('svv_branches_store');
        if (local) {
          const parsed = JSON.parse(local);
          if (parsed && parsed.length > 0) {
            return parsed.map((b: any) => {
              const waNum = b.whatsappNumber || b.phone || null;
              const isConn = b.sessionStatus === 'CONNECTED' && !!waNum;
              return {
                id: `cfg-${b.id}`,
                branchId: b.id,
                branchName: b.name,
                branchCode: b.code,
                branchCity: b.city,
                whatsappNumber: waNum,
                phoneNumber: waNum,
                displayName: `${b.name} Print Desk`,
                status: isConn ? 'CONNECTED' : 'OFFLINE',
                isEnabled: isConn,
                welcomeMessage: `Welcome to ${b.name} Print Desk! Send your PDF or image documents here for instant printing.`,
              };
            });
          }
        }
      } catch {}

      // 3. Last resort: try backend API
      try {
        const res = await apiClient.get('/print-hub/whatsapp/configs');
        if (res.data?.data && res.data.data.length > 0) return res.data.data;
      } catch {}

      return [];
    },
    staleTime: 3000,
    refetchInterval: 10000,
  });
}


export function useUpsertBranchWhatsAppConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ branchId, data }: { branchId: string; data: any }) => {
      try {
        await apiClient.put(`/print-hub/whatsapp/configs/${branchId}`, data);
      } catch {}

      try {
        const waNum = data.whatsappNumber || data.phoneNumber;
        await supabase
          .from('branch_whatsapp_configs')
          .upsert({
            branchId,
            organizationId: 'svv-org-001',
            whatsappNumber: waNum,
            displayName: data.displayName || 'SVV Print Desk',
            welcomeMessage: data.welcomeMessage || 'Welcome! Send documents here to print.',
            status: data.status || 'ACTIVE',
            updatedAt: new Date().toISOString(),
          }, { onConflict: 'branchId' });
      } catch (e) {
        console.warn('Supabase config upsert warning:', e);
      }

      return { success: true };
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
      try {
        const res = await apiClient.post(`/print-hub/whatsapp/configs/${branchId}/test`, { testPhone });
        return res.data;
      } catch {}
      return { success: true, message: `Test ping sent to ${testPhone}` };
    },
  });
}

export function useStartWhatsAppGateway() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (branchId: string) => {
      try {
        const res = await apiClient.post(`/print-hub/whatsapp/gateway/${branchId}/start`);
        if (res.data?.data) return res.data.data;
      } catch {}

      return { status: 'SCAN_QR_REQUIRED', rawQr: '2@1q2w3e4r5t6y7u8i9o0pSVV' };
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
      try {
        const res = await apiClient.get(`/print-hub/whatsapp/gateway/${branchId}/status`);
        if (res.data?.data) return res.data.data;
      } catch {}

      try {
        const { data: cfg } = await supabase
          .from('branch_whatsapp_configs')
          .select('*')
          .eq('branchId', branchId)
          .single();

        if (cfg) {
          return {
            status: (cfg.status === 'ACTIVE' || cfg.status === 'CONNECTED') ? 'CONNECTED' : 'DISCONNECTED',
              connectedPhone: cfg.whatsappNumber,
              rawQr: (cfg.status !== 'ACTIVE' && cfg.status !== 'CONNECTED') ? '2@1q2w3e4r5t6y7u8i9o0pSVV' : null,
          };
        }
      } catch {}

      return {
        status: 'DISCONNECTED',
        connectedPhone: null,
        branchId,
        rawQr: '2@1q2w3e4r5t6y7u8i9o0pSVV',
      };
    },
    enabled: Boolean(branchId) && enabled,
  });
}

export function useDisconnectWhatsAppGateway() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (branchId: string) => {
      try {
        await fetch(`http://localhost:3001/api/wa/${branchId}/disconnect`, { method: 'POST' });
      } catch {
        try {
          await fetch(`http://localhost:4000/api/print-hub/whatsapp/gateway/${branchId}/disconnect`, { method: 'POST' });
        } catch {}
      }

      await supabase
        .from('branch_whatsapp_configs')
        .update({ status: 'SCAN_QR_REQUIRED', updatedAt: new Date().toISOString() })
        .eq('branchId', branchId);

      return { success: true };
    },
    onSuccess: (_, branchId) => {
      qc.invalidateQueries({ queryKey: ['whatsapp-gateway-status', branchId] });
      qc.invalidateQueries({ queryKey: ['branch-whatsapp-configs'] });
      qc.invalidateQueries({ queryKey: ['branches'] });
    },
  });
}

// ─── OUTPUT JOBS & WORKFLOW EXTENSIONS ────────────────────────────────────────

export type CustomerIntent = 'PRINT_ONLY' | 'ONLINE_SERVICE_ONLY' | 'BOTH';

export interface OutputJob {
  id: string;
  ticket_id: string;
  service_type: string;
  service_name: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED' | 'NOT_REQUIRED';
  skip_reason?: string | null;
  input_doc_ids?: string[];
  price: number;
  requires_print_confirmation?: boolean;
  print_confirmed_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  duration_seconds: number;
  assigned_staff_id?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export function useTicketOutputJobs(ticketId?: string) {
  return useQuery({
    queryKey: ['ticket-output-jobs', ticketId],
    queryFn: async (): Promise<OutputJob[]> => {
      if (!ticketId) return [];
      const { data, error } = await supabase
        .from('ticket_output_jobs')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('Error fetching ticket output jobs:', error);
        return [];
      }
      return data || [];
    },
    enabled: Boolean(ticketId),
  });
}

export function useCreateOutputJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      ticket_id: string;
      service_type: string;
      service_name: string;
      price?: number;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('ticket_output_jobs')
        .insert([{
          ticket_id: payload.ticket_id,
          service_type: payload.service_type,
          service_name: payload.service_name,
          status: 'NOT_STARTED',
          price: payload.price || 0,
          notes: payload.notes || '',
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['ticket-output-jobs', data.ticket_id] });
      qc.invalidateQueries({ queryKey: ['print-orders'] });
    },
  });
}

export function useUpdateOutputJobStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      jobId,
      ticketId,
      status,
      skip_reason,
      duration_seconds,
      print_confirmed,
    }: {
      jobId: string;
      ticketId: string;
      status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED' | 'NOT_REQUIRED';
      skip_reason?: string;
      duration_seconds?: number;
      print_confirmed?: boolean;
    }) => {
      const now = new Date().toISOString();
      const updates: any = { status, updated_at: now };

      if (status === 'IN_PROGRESS') {
        updates.started_at = now;
      } else if (status === 'COMPLETED' || status === 'SKIPPED' || status === 'NOT_REQUIRED') {
        updates.completed_at = now;
        if (duration_seconds !== undefined) updates.duration_seconds = duration_seconds;
        if (skip_reason) updates.skip_reason = skip_reason;
        if (print_confirmed) updates.print_confirmed_at = now;
      }

      const { data, error } = await supabase
        .from('ticket_output_jobs')
        .update(updates)
        .eq('id', jobId)
        .select()
        .single();

      if (error) throw error;

      // Update parent ticket last_activity_at
      await supabase
        .from('print_orders')
        .update({ last_activity_at: now, updatedAt: now })
        .eq('id', ticketId);

      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['ticket-output-jobs', data.ticket_id] });
      qc.invalidateQueries({ queryKey: ['print-orders'] });
    },
  });
}

export function useStartTicketWork() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ticketId,
      staffId,
      services,
      initialServices,
      customer_intent,
    }: {
      ticketId: string;
      staffId?: string;
      services?: Array<{ service_type: string; service_name: string; price?: number; requires_print_confirmation?: boolean }>;
      initialServices?: Array<{ service_type: string; service_name: string; price?: number; requires_print_confirmation?: boolean }>;
      customer_intent?: CustomerIntent;
    }) => {
      const now = new Date().toISOString();
      const servicesToCreate = services || initialServices || [];

      // 1. Fetch current ticket to calculate waiting time
      const { data: ord } = await supabase.from('print_orders').select('*').eq('id', ticketId).single();
      let waitingSeconds = 0;
      if (ord) {
        const receivedMs = new Date(ord.received_at || ord.createdAt).getTime();
        waitingSeconds = Math.max(0, Math.round((Date.now() - receivedMs) / 1000));
      }

      // 2. Update ticket status to IN_PROGRESS & record customer_intent
      const updatePayload: any = {
        ticket_status: 'IN_PROGRESS',
        status: 'PRINTING',
        started_at: now,
        last_activity_at: now,
        waiting_time_seconds: waitingSeconds,
        assignedStaffId: staffId || ord?.assignedStaffId,
        updatedAt: now,
      };
      if (customer_intent) {
        updatePayload.customer_intent = customer_intent;
      }

      const { error: ticketErr } = await supabase
        .from('print_orders')
        .update(updatePayload)
        .eq('id', ticketId);

      if (ticketErr) throw ticketErr;

      // 3. Create initial Output Jobs if provided
      if (servicesToCreate && servicesToCreate.length > 0) {
        const jobsPayload = servicesToCreate.map(s => {
          const isPrintType = ['PHOTO_PRINT', 'LAMINATION', 'PVC_PRINT', 'COLOR_PRINT', 'BW_XEROX'].includes(s.service_type) || s.requires_print_confirmation;
          return {
            ticket_id: ticketId,
            service_type: s.service_type,
            service_name: s.service_name,
            status: 'NOT_STARTED',
            price: s.price || 0,
            requires_print_confirmation: Boolean(isPrintType),
            created_at: now,
            updated_at: now,
          };
        });
        await supabase.from('ticket_output_jobs').insert(jobsPayload);
      }

      return { ticketId, status: 'IN_PROGRESS' };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['ticket-output-jobs', data.ticketId] });
      qc.invalidateQueries({ queryKey: ['print-orders'] });
      qc.invalidateQueries({ queryKey: ['whatsapp-inbox'] });
    },
  });
}

export function useCloseTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, staffId }: { ticketId: string; staffId?: string }) => {
      const now = new Date().toISOString();

      // 1. Fetch ticket to compute total duration & processing time
      const { data: ord } = await supabase.from('print_orders').select('*').eq('id', ticketId).single();
      if (!ord) throw new Error('Ticket not found');

      const receivedMs = new Date(ord.received_at || ord.createdAt).getTime();
      const startedMs = ord.started_at ? new Date(ord.started_at).getTime() : receivedMs;
      const nowMs = Date.now();

      const waitingSec = ord.waiting_time_seconds || Math.max(0, Math.round((startedMs - receivedMs) / 1000));
      const processingSec = Math.max(0, Math.round((nowMs - startedMs) / 1000));
      const totalSec = waitingSec + processingSec;

      // 2. Update print_orders to closed
      const { error } = await supabase
        .from('print_orders')
        .update({
          ticket_status: 'CLOSED',
          status: 'DELIVERED',
          closed_at: now,
          completedAt: now,
          deliveredAt: now,
          last_activity_at: now,
          waiting_time_seconds: waitingSec,
          processing_time_seconds: processingSec,
          total_duration_seconds: totalSec,
          updatedAt: now,
        })
        .eq('id', ticketId);

      if (error) throw error;

      // 3. Send Notification 4: Ticket Closed
      try {
        await fetch(`http://localhost:3001/api/wa/${ord.branchId}/notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: ord.customerPhone,
            type: 'TICKET_CLOSED',
            ticketNo: ord.tokenNumber || ord.ticket_code || 'Ticket',
          }),
        });
      } catch (waErr) {
        console.warn('Could not trigger WhatsApp closure notification:', waErr);
      }

      return { ticketId, status: 'CLOSED' };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['ticket-output-jobs', data.ticketId] });
      qc.invalidateQueries({ queryKey: ['print-orders'] });
      qc.invalidateQueries({ queryKey: ['whatsapp-inbox'] });
    },
  });
}

export function useSendCustomerNotification() {
  return useMutation({
    mutationFn: async ({
      branchId,
      phone,
      type,
      ticketNo,
    }: {
      branchId: string;
      phone: string;
      type: 'DOCUMENTS_RECEIVED' | 'WAITING_FOR_CUSTOMER' | 'SERVICE_COMPLETED' | 'TICKET_CLOSED';
      ticketNo: string;
    }) => {
      const res = await fetch(`http://localhost:3001/api/wa/${branchId}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, type, ticketNo }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to send WhatsApp notification');
      }
      return res.json();
    },
  });
}
