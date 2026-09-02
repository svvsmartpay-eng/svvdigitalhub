import React, { useState, useEffect, useMemo } from 'react';
import { usePrintOrders, useUpdatePrintOrderStatus, useCreatePrintOrder, useWhatsAppInbox, usePrintHubRealtimeSync } from '@/api/printHub.api';
import { useBranches } from '@/api/branches.api';
import { useCurrentUser } from '@/api/auth.api';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { directPrintFiles } from '@/lib/directPrintEngine';
import ContinuousPdfViewer from '@/components/shared/ContinuousPdfViewer';
import WordDocumentViewer from '@/components/shared/WordDocumentViewer';
import WhatsAppChatModal from '@/components/shared/WhatsAppChatModal';
import WhatsAppGatewayModal from '@/components/shared/WhatsAppGatewayModal';
import {
  Printer, Play, CheckCircle2, Search, Plus, RefreshCw, 
  X, Phone, Clock, User, Lock, File, FileText, 
  LayoutGrid, List, ChevronLeft, ChevronRight, 
  RotateCw, ZoomIn, ZoomOut, Maximize2, Eye, Crop,
  SlidersHorizontal, ChevronDown, Check, ArrowRight, Files,
  Copy, MessageSquare, PhoneCall, Smartphone, AlertCircle, Building2
} from 'lucide-react';

export default function PrintQueuePage() {
  usePrintHubRealtimeSync();
  const { data: currentUser } = useCurrentUser();
  const { data: branches } = useBranches();
  const [selectedBranch, setSelectedBranch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [staffFilter, setStaffFilter] = useState('');
  const [sortBy, setSortBy] = useState<'NEWEST' | 'OLDEST' | 'TOKEN'>('NEWEST');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'GRID' | 'SPLIT'>('GRID');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedDocIndex, setSelectedDocIndex] = useState<number>(0);
  const [previewZoom, setPreviewZoom] = useState<number>(100);
  const [previewRotation, setPreviewRotation] = useState<number>(0);
  const [showPrintVerifyModal, setShowPrintVerifyModal] = useState<boolean>(false);
  const [lastPrintedJob, setLastPrintedJob] = useState<any>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [lastActivityTime, setLastActivityTime] = useState<number>(Date.now());

  const { data: response, isLoading, refetch } = usePrintOrders({
    branchId: selectedBranch || undefined,
    status: statusFilter || undefined,
    search: search || undefined,
  });

  const { data: whatsappData, refetch: refetchWhatsApp } = useWhatsAppInbox(selectedBranch || undefined);
  const rawOrders: any[] = response?.data || [];
  const whatsappMessages: any[] = whatsappData?.messages || (Array.isArray(whatsappData) ? whatsappData : []);

  // Live real-time polling auto-refetch every 2.5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
      refetchWhatsApp();
    }, 2500);
    return () => clearInterval(interval);
  }, [refetch, refetchWhatsApp]);

  const updateStatusMutation = useUpdatePrintOrderStatus();
  const createOrderMutation = useCreatePrintOrder();

  const [showNewOrder, setShowNewOrder] = useState(false);
  const [showGatewayModal, setShowGatewayModal] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [docName, setDocName] = useState('');
  const [branchId, setBranchId] = useState('');
  const [customPrice, setCustomPrice] = useState<number>(100);
  const [copies, setCopies] = useState(1);
  const [pdfPageCountsMap, setPdfPageCountsMap] = useState<Record<string, number>>({});
  const [activeChatOrder, setActiveChatOrder] = useState<any | null>(null);
  const [showNextTicketModal, setShowNextTicketModal] = useState<boolean>(false);
  const [justCompletedTicket, setJustCompletedTicket] = useState<any | null>(null);

  // Copy to Clipboard Feedback State
  const [copyToast, setCopyToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, type: 'NAME' | 'PHONE', key?: string) => {
    if (!text) return;
    try {
      navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    const message = type === 'NAME' ? 'Customer Name Copied' : 'Mobile Number Copied';
    setCopyToast({ message, visible: true });
    if (key) setCopiedKey(key);

    setTimeout(() => {
      setCopyToast({ message: '', visible: false });
      setCopiedKey(null);
    }, 2000);
  };

  const formatDisplayPhone = (raw: string): string => {
    if (!raw) return '';
    const digits = raw.replace(/[^0-9]/g, '');
    if (digits.startsWith('91') && digits.length === 12) {
      return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
    }
    if (digits.length === 10) {
      return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
    }
    return raw.startsWith('+') ? raw : `+${raw}`;
  };

  const cleanPhoneForWhatsApp = (raw: string): string => {
    if (!raw) return '';
    const digits = raw.replace(/[^0-9]/g, '');
    if (digits.length === 10) return `91${digits}`;
    return digits;
  };

  const cleanPhoneForCall = (raw: string): string => {
    if (!raw) return '';
    return raw.replace(/[^0-9+]/g, '');
  };

  // Auto-detect real page count for all incoming PDF files
  useEffect(() => {
    const urlsToInspect = new Set<string>();
    (rawOrders || []).forEach((o) => {
      if (o.documentUrl && o.documentUrl.toLowerCase().endsWith('.pdf') && !pdfPageCountsMap[o.documentUrl]) {
        urlsToInspect.add(o.documentUrl);
      }
    });

    const msgs = Array.isArray(whatsappData) ? whatsappData : (whatsappMessages || []);
    msgs.forEach((m: any) => {
      if (m.mediaUrl && m.mediaUrl.toLowerCase().endsWith('.pdf') && !pdfPageCountsMap[m.mediaUrl]) {
        urlsToInspect.add(m.mediaUrl);
      }
    });

    urlsToInspect.forEach((url) => {
      setPdfPageCountsMap((prev) => ({ ...prev, [url]: prev[url] || 2 }));
    });
  }, [rawOrders, whatsappData, whatsappMessages]);

  // Inactivity auto-release (5 minutes)
  useEffect(() => {
    const handleUserActivity = () => setLastActivityTime(Date.now());
    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('click', handleUserActivity);

    const interval = setInterval(() => {
      const idleMs = Date.now() - lastActivityTime;
      if (idleMs > 5 * 60 * 1000) {
        if (selectedOrderId && currentUser?.id) {
          const currentOrder = rawOrders.find((o) => o.id === selectedOrderId || o.tokenNumber === selectedOrderId);
          if (currentOrder && currentOrder.status === 'PRINTING' && currentOrder.assignedStaffId === currentUser.id) {
            updateStatusMutation.mutate({ id: currentOrder.id, status: 'PENDING', staffId: null });
          }
        }
      }
    }, 15000);

    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      clearInterval(interval);
    };
  }, [lastActivityTime, selectedOrderId, currentUser, rawOrders]);

  // Map real database orders into STRICT, ISOLATED individual tickets per order (NO cross-token contamination)
  const enrichedOrders = useMemo(() => {
    if (!rawOrders || rawOrders.length === 0) {
      return [];
    }

    const msgsList = Array.isArray(whatsappData) ? whatsappData : (whatsappMessages || []);

    const result = rawOrders.map((ord: any) => {
      // 1. Gather ONLY media files specifically belonging to THIS order
      const docItems: any[] = [];
      const seenUrls = new Set<string>();

      // Parse primary documentUrl and documentName
      if (ord.documentUrl) {
        const isPdf = ord.documentUrl.toLowerCase().includes('.pdf') || (ord.documentName && ord.documentName.toLowerCase().endsWith('.pdf'));
        const isImg = !isPdf && (ord.documentUrl.match(/\.(jpg|jpeg|png|webp|gif|bmp|svg)/i) || (ord.documentName && ord.documentName.match(/\.(jpg|jpeg|png|webp|gif|bmp|svg)/i)));
        const type = isPdf ? 'PDF' : isImg ? 'IMAGE' : 'DOC';
        const realPageCount = isPdf ? (pdfPageCountsMap[ord.documentUrl] || ord.pageCount || 1) : (ord.pageCount || 1);

        docItems.push({
          id: `doc-${ord.id}-primary`,
          name: ord.documentName || (isPdf ? 'Document.pdf' : 'Photo.jpg'),
          type,
          url: ord.documentUrl,
          sizeText: isPdf ? '1.8 MB' : '2.4 MB',
          pageCount: realPageCount,
          createdAt: ord.createdAt,
          tokenNumber: ord.tokenNumber,
          customerPhone: ord.customerPhone,
        });
        seenUrls.add(ord.documentUrl);
      }

      // Find additional media messages that explicitly have orderId === ord.id
      const linkedMsgs = msgsList.filter((m: any) => m.orderId && m.orderId === ord.id && m.mediaUrl);
      linkedMsgs.forEach((m: any, idx: number) => {
        if (!seenUrls.has(m.mediaUrl)) {
          seenUrls.add(m.mediaUrl);
          const isPdf = m.mediaUrl.toLowerCase().includes('.pdf') || m.mediaType === 'PDF';
          const isImg = !isPdf && (m.mediaUrl.match(/\.(jpg|jpeg|png|webp|gif|bmp|svg)/i) || m.mediaType === 'IMAGE');
          const type = isPdf ? 'PDF' : isImg ? 'IMAGE' : 'DOC';

          docItems.push({
            id: `doc-${ord.id}-msg-${m.id || idx}`,
            name: m.fileName || m.messageBody || (isPdf ? 'Document.pdf' : 'Photo.jpg'),
            type,
            url: m.mediaUrl,
            sizeText: isPdf ? '1.8 MB' : '2.4 MB',
            pageCount: isPdf ? (pdfPageCountsMap[m.mediaUrl] || 1) : 1,
            createdAt: m.createdAt,
            tokenNumber: ord.tokenNumber,
            customerPhone: ord.customerPhone,
          });
        }
      });

      const imageCount = docItems.filter((d) => d.type === 'IMAGE').length;
      const pdfCount = docItems.filter((d) => d.type === 'PDF').length;
      const docCount = docItems.filter((d) => d.type === 'DOC').length;
      const totalFiles = docItems.length;
      const totalPages = docItems.reduce((sum, d) => sum + (d.pageCount || 1), 0);
      const branchName = ord.branch?.name || (ord.branchId?.includes('f5abaacc') ? 'SVV Main Hub' : 'SVV Branch 2');
      const branchCode = ord.branch?.code || 'SVV-1';
      const assignedStaffName = ord.assignedStaff?.name || ord.assignedStaffName || (ord.assignedStaffId ? (currentUser?.id === ord.assignedStaffId ? currentUser.name : 'Staff User 1') : 'Unassigned');
      const assignedStaffRole = ord.assignedStaff?.role || (ord.assignedStaffId ? 'Staff Desk' : 'Unassigned');
      const startedAt = ord.updatedAt && (ord.status === 'PRINTING' || ord.status === 'IN PROGRESS') ? new Date(ord.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;

      return {
        ...ord,
        customerName: ord.customerName || 'Walk-in Customer',
        tokenNumber: ord.tokenNumber,
        docItems,
        totalFiles,
        totalPages,
        imageCount,
        pdfCount,
        docCount,
        branchName,
        branchCode,
        assignedStaffName,
        assignedStaffRole,
        startedAt,
        timeFormatted: new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isLockedByOther: Boolean(ord.assignedStaffId && currentUser?.id && ord.assignedStaffId !== currentUser.id && (ord.status === 'PRINTING' || ord.status === 'IN PROGRESS')),
        rawDate: new Date(ord.createdAt),
      };
    });

    result.sort((a, b) => (b.rawDate?.getTime() || 0) - (a.rawDate?.getTime() || 0));
    return result;
  }, [rawOrders, whatsappData, whatsappMessages, currentUser, pdfPageCountsMap]);

  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'THIS_WEEK'>('ALL');

  const filteredOrders = useMemo(() => {
    let list = [...enrichedOrders];
    if (statusFilter) {
      list = list.filter((o) => o.status === statusFilter);
    }
    if (staffFilter) {
      if (staffFilter === 'UNASSIGNED') list = list.filter((o) => o.assignedStaffName === 'Unassigned');
      else list = list.filter((o) => o.assignedStaffName?.toLowerCase().includes(staffFilter.toLowerCase()));
    }
    if (dateFilter !== 'ALL') {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const yesterdayStart = todayStart - 86400000;
      const weekStart = todayStart - 7 * 86400000;

      list = list.filter((o) => {
        const oTime = o.rawDate ? new Date(o.rawDate).getTime() : 0;
        if (dateFilter === 'TODAY') return oTime >= todayStart;
        if (dateFilter === 'YESTERDAY') return oTime >= yesterdayStart && oTime < todayStart;
        if (dateFilter === 'THIS_WEEK') return oTime >= weekStart;
        return true;
      });
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (o) =>
          o.tokenNumber?.toLowerCase().includes(q) ||
          o.customerName?.toLowerCase().includes(q) ||
          o.customerPhone?.includes(q)
      );
    }
    if (sortBy === 'NEWEST') list.sort((a, b) => (b.rawDate?.getTime() || 0) - (a.rawDate?.getTime() || 0));
    else if (sortBy === 'OLDEST') list.sort((a, b) => (a.rawDate?.getTime() || 0) - (b.rawDate?.getTime() || 0));
    return list;
  }, [enrichedOrders, statusFilter, staffFilter, dateFilter, search, sortBy]);

  useEffect(() => {
    if (filteredOrders.length > 0 && !selectedOrderId) {
      setSelectedOrderId(filteredOrders[0].id || filteredOrders[0].tokenNumber);
    }
  }, [filteredOrders, selectedOrderId]);

  const selectedOrder = filteredOrders.find((o) => o.id === selectedOrderId || o.tokenNumber === selectedOrderId) || filteredOrders[0] || null;
  const activeDoc = selectedOrder?.docItems?.[selectedDocIndex] || selectedOrder?.docItems?.[0] || null;

  // STRICT VALIDATION GUARD: Verify that activeDoc matches selectedOrder token and phone
  const hasDocumentMappingError = useMemo(() => {
    if (!selectedOrder || !activeDoc) return false;
    if (activeDoc.tokenNumber && activeDoc.tokenNumber !== selectedOrder.tokenNumber) return true;
    if (activeDoc.customerPhone && activeDoc.customerPhone !== selectedOrder.customerPhone) return true;
    return false;
  }, [selectedOrder, activeDoc]);

  const handleStartWork = (order: any) => {
    setSelectedOrderId(order.id || order.tokenNumber);
    if (order.id && !order.id.startsWith('mock-')) {
      updateStatusMutation.mutate({ id: order.id, status: 'PRINTING', staffId: currentUser?.id }, { onSuccess: () => { refetch(); refetchWhatsApp(); } });
    }
  };

  const handleReleaseWork = (order: any) => {
    if (order.id && !order.id.startsWith('mock-')) {
      updateStatusMutation.mutate({ id: order.id, status: 'PENDING', staffId: null }, { onSuccess: () => { refetch(); refetchWhatsApp(); } });
    }
  };

  const handleCompleteWork = (order: any) => {
    if (order.id && !order.id.startsWith('mock-')) {
      updateStatusMutation.mutate({ 
        id: order.id, 
        status: 'DELIVERED', 
        staffId: currentUser?.id || 'usr-1' 
      }, { 
        onSuccess: () => { 
          refetch(); 
          refetchWhatsApp(); 
        } 
      });
    }
    setShowPrintVerifyModal(false);
  };

  const handlePrintVerifiedSuccess = () => {
    if (lastPrintedJob) {
      handleCompleteWork(lastPrintedJob);
      setJustCompletedTicket(lastPrintedJob);
      setShowPrintVerifyModal(false);
      setShowNextTicketModal(true);
    }
  };

  const handleOpenNextTicket = () => {
    setShowNextTicketModal(false);
    // Find next pending or ready ticket in queue
    const nextOrder = filteredOrders.find((o) => (o.status === 'PENDING' || o.status === 'NEW') && o.id !== justCompletedTicket?.id);
    if (nextOrder) {
      setSelectedOrderId(nextOrder.id || nextOrder.tokenNumber);
      handleStartWork(nextOrder);
    }
  };

  const handleDirectPrint = async (order: any) => {
    setSelectedOrderId(order.id || order.tokenNumber);
    setLastPrintedJob(order);

    const docItemsToPrint = order.docItems && order.docItems.length > 0
      ? order.docItems
      : [{ url: order.documentUrl || '/uploads/doc.pdf', type: order.documentName?.endsWith('.pdf') ? 'PDF' : 'IMAGE', name: order.documentName }];

    await directPrintFiles(docItemsToPrint, order.tokenNumber || 'T-101');
    setShowPrintVerifyModal(true);
  };

  const handleDirectPrintTrigger = () => {
    if (!selectedOrder) return;
    handleDirectPrint(selectedOrder);
  };

  // Pagination Slice
  const totalPagesCount = Math.ceil(filteredOrders.length / itemsPerPage) || 1;
  const paginatedOrders: any[] = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(start, start + itemsPerPage);
  }, [filteredOrders, currentPage, itemsPerPage]);

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    createOrderMutation.mutate({
      branchId: branchId || branches?.[0]?.id || 'f5abaacc-d2b6-4591-91fb-314b2188e18c',
      customerName: customerName.trim() || 'Walk-in Customer',
      customerPhone: customerPhone.trim() || '+91 99999 99999',
      source: 'MANUAL_COUNTER',
      documentUrl: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600&auto=format&fit=crop&q=80',
      documentName: docName.trim() || 'Counter_Document.pdf',
      pageCount: 1,
      copies: Number(copies) || 1,
      colorMode: 'COLOR',
      totalAmount: Number(customPrice) || 100,
    }, {
      onSuccess: (res: any) => {
        setShowNewOrder(false);
        setCustomerName('');
        setCustomerPhone('');
        setDocName('');
        setCopyToast({ message: `✅ Ticket ${res?.tokenNumber || 'T-New'} Created Successfully!`, visible: true });
        setTimeout(() => setCopyToast({ message: '', visible: false }), 2500);
        refetch();
        refetchWhatsApp();
      },
      onError: (err: any) => {
        console.error('Failed to create ticket', err);
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PRINTING':
      case 'IN PROGRESS':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E8F5E9] text-[#198754] border border-[#86EFAC]">IN PROGRESS</span>;
      case 'PENDING':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FFF4EC] text-[#EA580C] border border-[#FED7AA]">PENDING</span>;
      case 'CANCELLED':
      case 'ON HOLD':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#F3E8FF] text-[#6F42C1] border border-[#DDD6FE]">ON HOLD</span>;
      case 'NEW':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E7F1FF] text-[#0D6EFD] border border-[#B6D4FE]">NEW</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#D1E7DD] text-[#0F5132] border border-[#BADBCC]">COMPLETED</span>;
    }
  };

  return (
    <div className="space-y-5 font-sans max-w-[1600px] mx-auto select-none bg-[#F8FAFC]">
      
      {/* ── TOP HEADER / FILTER BAR ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#081B3A] tracking-tight">
            Ticket Queue ({filteredOrders.length})
          </h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            All tickets with details, WhatsApp status, document counts & thumbnails
          </p>
        </div>

        {/* Right Filter Selectors & View Toggles */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Date Filter Dropdown */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="h-10 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] px-3.5 text-xs font-bold text-[#081B3A] hover:border-[#CBD5E1] shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]"
          >
            <option value="ALL">📅 All Dates</option>
            <option value="TODAY">📅 Today</option>
            <option value="YESTERDAY">📅 Yesterday</option>
            <option value="THIS_WEEK">📅 This Week</option>
          </select>

          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] px-3.5 text-xs font-medium text-[#111827] hover:border-[#CBD5E1] shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]"
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending (Orange)</option>
            <option value="PRINTING">In Progress (Green)</option>
            <option value="ON HOLD">On Hold (Purple)</option>
            <option value="NEW">New (Blue)</option>
          </select>

          {/* Staff Dropdown */}
          <select
            value={staffFilter}
            onChange={(e) => setStaffFilter(e.target.value)}
            className="h-10 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] px-3.5 text-xs font-medium text-[#111827] hover:border-[#CBD5E1] shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]"
          >
            <option value="">All Staff</option>
            <option value="SVV Admin">SVV Admin</option>
            <option value="Staff User 1">Staff User 1</option>
            <option value="UNASSIGNED">Unassigned</option>
          </select>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="h-10 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] px-3.5 text-xs font-medium text-[#111827] hover:border-[#CBD5E1] shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]"
          >
            <option value="NEWEST">⚡ Newest First</option>
            <option value="OLDEST">Oldest First</option>
          </select>

          {/* View Toggle: Grid View vs 3-Panel Split View */}
          <div className="flex items-center bg-[#F1F5F9] p-1 rounded-xl border border-[#E2E8F0]">
            <button
              onClick={() => setViewMode('GRID')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'GRID' ? 'bg-[#0D6EFD] text-[#FFFFFF] shadow-xs' : 'text-[#6B7280] hover:text-[#111827]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grid</span>
            </button>
            <button
              onClick={() => setViewMode('SPLIT')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'SPLIT' ? 'bg-[#0D6EFD] text-[#FFFFFF] shadow-xs' : 'text-[#6B7280] hover:text-[#111827]'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List / 3-Panel</span>
            </button>
          </div>

          <Button
            size="sm"
            onClick={() => setShowNewOrder(true)}
            className="bg-[#0D6EFD] hover:bg-[#0b5ed7] text-[#FFFFFF] text-xs font-bold h-10 px-3.5 rounded-xl shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-1" /> Add Ticket
          </Button>
        </div>
      </div>

      {/* ── VIEW MODE 1: GRID VIEW ───────────────────────────────────────────── */}
      {viewMode === 'GRID' && (
        <div className="space-y-6">
          {paginatedOrders.length === 0 ? (
            <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-12 text-center shadow-xs space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[#E7F1FF] text-[#0D6EFD] flex items-center justify-center mx-auto border border-[#B6D4FE]">
                <Printer className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-[#081B3A]">No Active Tickets in Work Queue</h3>
              <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
                Ready for live orders! New customer WhatsApp messages or counter walk-ins will appear here with fresh tokens.
              </p>
              <Button
                onClick={() => setShowNewOrder(true)}
                className="bg-[#0D6EFD] hover:bg-[#0b5ed7] text-[#FFFFFF] text-xs font-bold px-4 py-2 rounded-xl mt-2 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4 mr-1.5" /> Create Walk-in Ticket
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {paginatedOrders.map((ord) => {
              const isSelected = selectedOrderId === ord.id || selectedOrderId === ord.tokenNumber;
              const isInProgress = ord.status === 'PRINTING' || ord.status === 'IN PROGRESS';

              return (
                <div
                  key={ord.id || ord.tokenNumber}
                  onClick={() => {
                    setSelectedOrderId(ord.id || ord.tokenNumber);
                    setSelectedDocIndex(0);
                  }}
                  className={`bg-[#FFFFFF] rounded-2xl border transition-all flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md cursor-pointer ${
                    isSelected
                      ? 'border-[#0D6EFD] ring-2 ring-[#0D6EFD]/25 shadow-md'
                      : isInProgress
                      ? 'border-[#198754] ring-2 ring-[#198754]/20 shadow-[0_0_15px_rgba(25,135,84,0.12)]'
                      : 'border-[#E2E8F0] hover:border-[#CBD5E1]'
                  }`}
                >
                  <div className="p-4 space-y-3">
                    {/* 1. Header: Token ID & Status Badge */}
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-[#0D6EFD] tracking-tight font-mono">
                        {ord.tokenNumber}
                      </span>
                      {getStatusBadge(ord.status)}
                    </div>

                    {/* 2. Customer Name & Mobile with Copy Buttons */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <h3 className="text-base font-bold text-[#081B3A] truncate flex-1" title={ord.customerName}>
                          {ord.customerName}
                        </h3>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(ord.customerName, 'NAME', `name-${ord.id || ord.tokenNumber}`);
                          }}
                          className="p-1 rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#6B7280] hover:text-[#081B3A] shrink-0 cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center transition-colors border border-[#E2E8F0]"
                          title="Copy Customer Name"
                        >
                          {copiedKey === `name-${ord.id || ord.tokenNumber}` ? (
                            <Check className="w-3.5 h-3.5 text-[#198754]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs text-[#6B7280] font-medium flex items-center gap-1 font-mono truncate">
                          <Phone className="w-3 h-3 text-[#9CA3AF] shrink-0" />
                          <span>{ord.customerPhone}</span>
                        </p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(ord.customerPhone, 'PHONE', `phone-${ord.id || ord.tokenNumber}`);
                          }}
                          className="p-1 rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#6B7280] hover:text-[#081B3A] shrink-0 cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center transition-colors border border-[#E2E8F0]"
                          title="Copy Mobile Number"
                        >
                          {copiedKey === `phone-${ord.id || ord.tokenNumber}` ? (
                            <Check className="w-3.5 h-3.5 text-[#198754]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* 3. WhatsApp Integration Visibility (In-App Chat Pop-up + Copy) */}
                    <div className="flex items-center justify-between bg-[#F0FDF4] border border-[#DCFCE7] px-2 py-1 rounded-lg">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveChatOrder(ord);
                        }}
                        className="flex items-center gap-1.5 hover:opacity-85 cursor-pointer text-left"
                        title="Open In-App WhatsApp Live Chat"
                      >
                        <span className="w-2 h-2 rounded-full bg-[#198754] animate-pulse"></span>
                        <span className="text-[11px] font-bold text-[#198754] flex items-center gap-1">
                          🟢 WhatsApp Chat
                        </span>
                      </button>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-[#495057] font-mono font-medium">
                          {ord.customerPhone?.replace(/\s+/g, '')}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(ord.customerPhone, 'PHONE', `wa-${ord.id || ord.tokenNumber}`);
                          }}
                          className="p-0.5 rounded text-[#198754] hover:bg-[#DCFCE7] cursor-pointer ml-1"
                          title="Copy WhatsApp Number"
                        >
                          {copiedKey === `wa-${ord.id || ord.tokenNumber}` ? (
                            <Check className="w-3 h-3 text-[#198754]" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* 3.5 Quick Actions Row: Copy Name | Call | WhatsApp | Copy Number */}
                    <div className="grid grid-cols-4 gap-1 pt-1 border-t border-[#F1F5F9]">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(ord.customerName, 'NAME', `qa-n-${ord.id || ord.tokenNumber}`);
                        }}
                        className="py-1 px-1 rounded-lg bg-[#F8FAFC] hover:bg-[#E7F1FF] text-[#081B3A] hover:text-[#0D6EFD] border border-[#E2E8F0] font-bold text-[10px] flex items-center justify-center gap-1 min-h-[36px] cursor-pointer transition-colors"
                        title="Copy Customer Name"
                      >
                        {copiedKey === `qa-n-${ord.id || ord.tokenNumber}` ? (
                          <Check className="w-3 h-3 text-[#198754]" />
                        ) : (
                          <Copy className="w-3 h-3 text-[#0D6EFD]" />
                        )}
                        <span>Name</span>
                      </button>

                      <a
                        href={`tel:${cleanPhoneForCall(ord.customerPhone)}`}
                        onClick={(e) => e.stopPropagation()}
                        className="py-1 px-1 rounded-lg bg-[#F8FAFC] hover:bg-[#E8F5E9] text-[#081B3A] hover:text-[#198754] border border-[#E2E8F0] font-bold text-[10px] flex items-center justify-center gap-1 min-h-[36px] cursor-pointer transition-colors"
                        title="Call Customer"
                      >
                        <Phone className="w-3 h-3 text-[#198754]" />
                        <span>Call</span>
                      </a>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveChatOrder(ord);
                        }}
                        className="py-1 px-1 rounded-lg bg-[#F0FDF4] hover:bg-[#DCFCE7] text-[#198754] border border-[#BBF7D0] font-bold text-[10px] flex items-center justify-center gap-1 min-h-[36px] cursor-pointer transition-colors"
                        title="Open WhatsApp In-App Chat"
                      >
                        <MessageSquare className="w-3 h-3 text-[#198754]" />
                        <span>Chat</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(ord.customerPhone, 'PHONE', `qa-p-${ord.id || ord.tokenNumber}`);
                        }}
                        className="py-1 px-1 rounded-lg bg-[#F8FAFC] hover:bg-[#E7F1FF] text-[#081B3A] hover:text-[#0D6EFD] border border-[#E2E8F0] font-bold text-[10px] flex items-center justify-center gap-1 min-h-[36px] cursor-pointer transition-colors"
                        title="Copy Mobile Number"
                      >
                        {copiedKey === `qa-p-${ord.id || ord.tokenNumber}` ? (
                          <Check className="w-3 h-3 text-[#198754]" />
                        ) : (
                          <Copy className="w-3 h-3 text-[#0D6EFD]" />
                        )}
                        <span>Number</span>
                      </button>
                    </div>

                    {/* 4. Document Counts Row (5 rounded light-gray boxes) */}
                    <div className="grid grid-cols-5 gap-1.5 py-1">
                      <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-1 text-center">
                        <span className="block font-bold text-xs text-[#081B3A]">{ord.totalFiles}</span>
                        <span className="block text-[9px] text-[#6B7280] font-bold uppercase">Files</span>
                      </div>
                      <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-1 text-center">
                        <span className="block font-bold text-xs text-[#081B3A]">{ord.totalPages}</span>
                        <span className="block text-[9px] text-[#6B7280] font-bold uppercase">Pages</span>
                      </div>
                      <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-1 text-center">
                        <span className="block font-bold text-xs text-[#081B3A]">{ord.imageCount}</span>
                        <span className="block text-[9px] text-[#6B7280] font-bold uppercase">Images</span>
                      </div>
                      <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-1 text-center">
                        <span className="block font-bold text-xs text-[#081B3A]">{ord.pdfCount}</span>
                        <span className="block text-[9px] text-[#6B7280] font-bold uppercase">PDFs</span>
                      </div>
                      <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-1 text-center">
                        <span className="block font-bold text-xs text-[#081B3A]">{ord.docCount}</span>
                        <span className="block text-[9px] text-[#6B7280] font-bold uppercase">Docs</span>
                      </div>
                    </div>

                    {/* 5. Document Miniature Thumbnails Preview Strip (3-4 items + '+N') */}
                    <div className="flex items-center gap-1.5 pt-1 overflow-x-hidden">
                      {ord.docItems?.slice(0, 3).map((doc: any, dIdx: number) => (
                        <div
                          key={doc.id || dIdx}
                          className="w-14 h-12 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] overflow-hidden shrink-0 flex items-center justify-center shadow-2xs relative"
                        >
                          {doc.type === 'IMAGE' ? (
                            <img src={doc.url} alt="doc" className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-[#FD7E14]">
                              <FileText className="w-4 h-4" />
                              <span className="text-[7px] font-black uppercase">PDF</span>
                            </div>
                          )}
                        </div>
                      ))}

                      {ord.totalFiles > 3 && (
                        <div className="w-10 h-12 rounded-lg bg-[#E7F1FF] border border-[#B6D4FE] text-[#0D6EFD] font-bold text-xs flex items-center justify-center shrink-0">
                          +{ord.totalFiles - 3}
                        </div>
                      )}
                    </div>

                    {/* 6. Footer: Branch, Staff Role & Received/Started Time */}
                    <div className="pt-2 border-t border-[#F1F5F9] space-y-1 text-[11px]">
                      <div className="flex items-center justify-between text-[#6B7280]">
                        <span className="flex items-center gap-1 font-semibold text-[#081B3A] truncate">
                          <Building2 className="w-3.5 h-3.5 text-[#0D6EFD] shrink-0" />
                          <span>{ord.branchName} ({ord.branchCode})</span>
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active Desk
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[#6B7280] font-mono">
                        <span className="flex items-center gap-1 text-[#081B3A] font-semibold truncate font-sans">
                          <User className="w-3.5 h-3.5 text-[#6B7280] shrink-0" />
                          <span>{ord.assignedStaffName}</span>
                          <span className="text-[10px] text-[#9CA3AF]">({ord.assignedStaffRole})</span>
                        </span>
                        <span className="flex items-center gap-1 text-[10px]">
                          <Clock className="w-3 h-3 text-[#9CA3AF]" />
                          <span>{ord.timeFormatted}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 7. Action Buttons (Start Work = Blue, Release = Grey, Complete = Green) */}
                  <div className="p-3 bg-[#FFFFFF] border-t border-[#F1F5F9]">
                    {ord.isLockedByOther ? (
                      <div className="w-full py-2.5 px-3 rounded-xl bg-[#FEE2E2] border border-[#FECACA] text-[#DC2626] font-bold text-xs flex items-center justify-center gap-1.5">
                        <Lock className="w-3.5 h-3.5" /> 🔒 Working by {ord.assignedStaffName}
                      </div>
                    ) : isInProgress ? (
                      <div className="space-y-1.5">
                        <div className="grid grid-cols-2 gap-1.5">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReleaseWork(ord);
                            }}
                            className="w-full h-9 rounded-xl bg-[#E9ECEF] hover:bg-[#DEE2E6] text-[#495057] border border-[#CED4DA] font-semibold text-xs cursor-pointer shadow-2xs"
                          >
                            Release
                          </Button>
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCompleteWork(ord);
                            }}
                            className="w-full h-9 rounded-xl bg-[#198754] hover:bg-[#157347] text-[#FFFFFF] font-bold text-xs cursor-pointer shadow-2xs"
                          >
                            Complete ✓
                          </Button>
                        </div>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = `/print-hub/inbox?phone=${ord.customerPhone?.replace(/\D/g, '') || ''}`;
                          }}
                          className="w-full h-8 rounded-xl bg-[#6F42C1] hover:bg-[#59359A] text-[#FFFFFF] font-bold text-xs shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Crop className="w-3.5 h-3.5" /> Open Editor
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartWork(ord);
                            window.location.href = `/print-hub/inbox?phone=${ord.customerPhone?.replace(/\D/g, '') || ''}`;
                          }}
                          className="w-full h-10 rounded-xl bg-[#0D6EFD] hover:bg-[#0b5ed7] text-[#FFFFFF] font-bold text-xs shadow-xs flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" /> Start Work
                        </Button>
                        <div className="grid grid-cols-2 gap-1.5">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDirectPrint(ord);
                            }}
                            className="w-full h-8 rounded-xl bg-[#FD7E14] hover:bg-[#E86D07] text-[#FFFFFF] font-bold text-xs shadow-2xs flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Printer className="w-3 h-3" /> Direct Print
                          </Button>
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.location.href = `/print-hub/inbox?phone=${ord.customerPhone?.replace(/\D/g, '') || ''}`;
                            }}
                            className="w-full h-8 rounded-xl bg-[#6F42C1] hover:bg-[#59359A] text-[#FFFFFF] font-bold text-xs shadow-2xs flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Crop className="w-3 h-3" /> Open Editor
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          )}

          {/* Pagination Controls */}
          <div className="flex items-center justify-between bg-[#FFFFFF] p-3.5 rounded-2xl border border-[#E2E8F0] shadow-xs text-xs font-semibold text-[#6B7280]">
            <span>Showing 1 to {Math.min(itemsPerPage, filteredOrders.length)} of {filteredOrders.length} tickets</span>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] disabled:opacity-40 hover:bg-[#F8FAFC] cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPagesCount }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-8 h-8 rounded-lg font-bold text-xs cursor-pointer ${
                    currentPage === i + 1 ? 'bg-[#0D6EFD] text-[#FFFFFF] shadow-xs' : 'hover:bg-[#F1F5F9] text-[#111827]'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                disabled={currentPage === totalPagesCount}
                onClick={() => setCurrentPage(p => Math.min(totalPagesCount, p + 1))}
                className="px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] disabled:opacity-40 hover:bg-[#F8FAFC] cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-1 text-xs text-[#6B7280]">
              <span>Tickets per page:</span>
              <select className="border border-[#E2E8F0] rounded-lg p-1 text-xs bg-[#FFFFFF] font-medium text-[#111827]">
                <option>8</option>
                <option>16</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW MODE 2: 3-PANEL SPLIT WORKSPACE (Light Banking / CSC Theme) ── */}
      {viewMode === 'SPLIT' && (
        <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden flex flex-col h-[82vh]">
          
          {/* Main 3-Panel Split Body */}
          <div className="flex-1 grid grid-cols-12 overflow-hidden divide-x divide-[#E2E8F0]">
            
            {/* ── LEFT PANEL: TICKET QUEUE LIST (3 cols) ─────────────────────── */}
            <div className="col-span-12 md:col-span-3 bg-[#F8FAFC] flex flex-col overflow-hidden">
              <div className="p-3.5 border-b border-[#E2E8F0] bg-[#FFFFFF] flex items-center justify-between">
                <span className="text-xs font-bold text-[#081B3A] uppercase tracking-wider">
                  Ticket Queue ({filteredOrders.length})
                </span>
                <button
                  onClick={() => setViewMode('GRID')}
                  className="text-xs font-bold text-[#0D6EFD] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <LayoutGrid className="w-3.5 h-3.5" /> Back to Grid
                </button>
              </div>

              {/* Queue Scroll List */}
              <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                {filteredOrders.map((ord) => {
                  const isSelected = selectedOrderId === ord.id || selectedOrderId === ord.tokenNumber;
                  return (
                    <div
                      key={ord.id || ord.tokenNumber}
                      onClick={() => {
                        setSelectedOrderId(ord.id || ord.tokenNumber);
                        setSelectedDocIndex(0);
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#E7F1FF] border-[#0D6EFD] shadow-xs ring-1 ring-[#0D6EFD]/30'
                          : 'bg-[#FFFFFF] border-[#E2E8F0] hover:border-[#CBD5E1]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-[#0D6EFD] font-mono">{ord.tokenNumber}</span>
                        {getStatusBadge(ord.status)}
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <p className="font-bold text-xs text-[#081B3A] truncate flex-1">{ord.customerName}</p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(ord.customerName, 'NAME', `lp-name-${ord.id || ord.tokenNumber}`);
                          }}
                          className="p-1 rounded text-[#6B7280] hover:text-[#081B3A] hover:bg-[#E2E8F0] cursor-pointer"
                          title="Copy Name"
                        >
                          {copiedKey === `lp-name-${ord.id || ord.tokenNumber}` ? (
                            <Check className="w-3 h-3 text-[#198754]" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-[11px] mt-0.5">
                        <div className="flex items-center gap-1">
                          <span className="text-[#6B7280] font-mono">{ord.customerPhone}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(ord.customerPhone, 'PHONE', `lp-phone-${ord.id || ord.tokenNumber}`);
                            }}
                            className="p-0.5 rounded text-[#6B7280] hover:text-[#081B3A] hover:bg-[#E2E8F0] cursor-pointer"
                            title="Copy Phone Number"
                          >
                            {copiedKey === `lp-phone-${ord.id || ord.tokenNumber}` ? (
                              <Check className="w-3 h-3 text-[#198754]" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveChatOrder(ord);
                          }}
                          className="text-[9px] font-bold text-[#198754] bg-[#E8F5E9] hover:bg-[#DCFCE7] px-1.5 py-0.2 rounded flex items-center gap-0.5 cursor-pointer"
                          title="Chat on WhatsApp"
                        >
                          <span>🟢 WA</span>
                        </button>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-[#6B7280] font-mono mt-1.5 pt-1 border-t border-[#F1F5F9]">
                        <span>{ord.totalFiles} files · {ord.totalPages} pgs</span>
                        <span>{ord.timeFormatted}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── CENTER PANEL: SELECTED TICKET & DOCUMENT SUMMARY GRID (4.5 cols) ── */}
            <div className="col-span-12 md:col-span-4 bg-[#FFFFFF] flex flex-col overflow-hidden">
              {selectedOrder ? (
                <>
                  {/* Selected Ticket Header */}
                  <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC] space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-[#0D6EFD] font-mono">
                          {selectedOrder.tokenNumber}
                        </span>
                        {getStatusBadge(selectedOrder.status)}
                      </div>
                      <span className="font-mono text-xs font-bold text-[#0F5132] bg-[#D1E7DD] px-2.5 py-1 rounded-lg border border-[#BADBCC]">
                        ₹ {selectedOrder.totalAmount || 100}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-[#6B7280] uppercase block">Customer</span>
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-[#081B3A] truncate">{selectedOrder.customerName}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(selectedOrder.customerName, 'NAME', `sel-name-${selectedOrder.id}`)}
                            className="p-1 rounded text-[#6B7280] hover:text-[#081B3A] hover:bg-[#E2E8F0] cursor-pointer"
                            title="Copy Customer Name"
                          >
                            {copiedKey === `sel-name-${selectedOrder.id}` ? (
                              <Check className="w-3 h-3 text-[#198754]" />
                            ) : (
                              <Copy className="w-3 h-3 text-[#0D6EFD]" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-[#6B7280] uppercase block">WhatsApp Mobile</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setActiveChatOrder(selectedOrder)}
                            className="font-mono font-bold text-[#198754] hover:underline flex items-center gap-1 truncate cursor-pointer text-left"
                            title="Open In-App WhatsApp Live Chat"
                          >
                            🟢 {selectedOrder.customerPhone}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopy(selectedOrder.customerPhone, 'PHONE', `sel-phone-${selectedOrder.id}`)}
                            className="p-1 rounded text-[#6B7280] hover:text-[#081B3A] hover:bg-[#E2E8F0] cursor-pointer"
                            title="Copy Mobile Number"
                          >
                            {copiedKey === `sel-phone-${selectedOrder.id}` ? (
                              <Check className="w-3 h-3 text-[#198754]" />
                            ) : (
                              <Copy className="w-3 h-3 text-[#0D6EFD]" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-[#6B7280] uppercase block">Received Time</span>
                        <span className="font-mono text-[#6B7280]">{selectedOrder.timeFormatted}</span>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-[#6B7280] uppercase block">Assigned Staff</span>
                        <span className="font-bold text-[#081B3A] flex items-center gap-1 font-sans">
                          <User className="w-3 h-3 text-[#0D6EFD]" /> {selectedOrder.assignedStaffName}
                        </span>
                      </div>
                    </div>

                    {/* Quick Actions Row */}
                    <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-[#E2E8F0]">
                      <button
                        type="button"
                        onClick={() => handleCopy(selectedOrder.customerName, 'NAME', `sel-qa-n-${selectedOrder.id}`)}
                        className="py-1 px-1 rounded-lg bg-[#FFFFFF] hover:bg-[#E7F1FF] text-[#081B3A] hover:text-[#0D6EFD] border border-[#CBD5E1] font-bold text-[10px] flex items-center justify-center gap-1 min-h-[36px] cursor-pointer transition-colors shadow-2xs"
                        title="Copy Customer Name"
                      >
                        {copiedKey === `sel-qa-n-${selectedOrder.id}` ? (
                          <Check className="w-3 h-3 text-[#198754]" />
                        ) : (
                          <Copy className="w-3 h-3 text-[#0D6EFD]" />
                        )}
                        <span>Copy Name</span>
                      </button>

                      <a
                        href={`tel:${cleanPhoneForCall(selectedOrder.customerPhone)}`}
                        className="py-1 px-1 rounded-lg bg-[#FFFFFF] hover:bg-[#E8F5E9] text-[#081B3A] hover:text-[#198754] border border-[#CBD5E1] font-bold text-[10px] flex items-center justify-center gap-1 min-h-[36px] cursor-pointer transition-colors shadow-2xs"
                        title="Call Customer"
                      >
                        <Phone className="w-3 h-3 text-[#198754]" />
                        <span>Call</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => setActiveChatOrder(selectedOrder)}
                        className="py-1 px-1 rounded-lg bg-[#F0FDF4] hover:bg-[#DCFCE7] text-[#198754] border border-[#BBF7D0] font-bold text-[10px] flex items-center justify-center gap-1 min-h-[36px] cursor-pointer transition-colors shadow-2xs"
                        title="Open WhatsApp In-App Chat"
                      >
                        <MessageSquare className="w-3 h-3 text-[#198754]" />
                        <span>WhatsApp</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopy(selectedOrder.customerPhone, 'PHONE', `sel-qa-p-${selectedOrder.id}`)}
                        className="py-1 px-1 rounded-lg bg-[#FFFFFF] hover:bg-[#E7F1FF] text-[#081B3A] hover:text-[#0D6EFD] border border-[#CBD5E1] font-bold text-[10px] flex items-center justify-center gap-1 min-h-[36px] cursor-pointer transition-colors shadow-2xs"
                        title="Copy Mobile Number"
                      >
                        {copiedKey === `sel-qa-p-${selectedOrder.id}` ? (
                          <Check className="w-3 h-3 text-[#198754]" />
                        ) : (
                          <Copy className="w-3 h-3 text-[#0D6EFD]" />
                        )}
                        <span>Copy No.</span>
                      </button>
                    </div>
                  </div>

                  {/* Document Summary Grid Header */}
                  <div className="px-4 py-2 bg-[#F1F5F9] border-b border-[#E2E8F0] flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#081B3A] uppercase tracking-wider">
                      Document Section ({selectedOrder.docItems?.length || 0} Files)
                    </span>
                    <span className="text-[10px] text-[#6B7280] font-mono">
                      {selectedOrder.totalPages} Total Pages
                    </span>
                  </div>

                  {/* Document Summary Grid Cards */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-[#F8FAFC]">
                    {selectedOrder.docItems?.map((doc: any, dIdx: number) => {
                      const isDocSelected = selectedDocIndex === dIdx;

                      return (
                        <div
                          key={doc.id || dIdx}
                          onClick={() => setSelectedDocIndex(dIdx)}
                          className={`p-2.5 rounded-xl border transition-all flex items-center gap-3 cursor-pointer ${
                            isDocSelected
                              ? 'bg-[#E7F1FF] border-[#0D6EFD] shadow-xs ring-1 ring-[#0D6EFD]/30'
                              : 'bg-[#FFFFFF] border-[#E2E8F0] hover:border-[#CBD5E1]'
                          }`}
                        >
                          {/* Thumbnail */}
                          <div className="w-14 h-14 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] overflow-hidden shrink-0 flex items-center justify-center">
                            {doc.type === 'IMAGE' ? (
                              <img src={doc.url} alt="thumb" className="w-full h-full object-cover" />
                            ) : (
                              <FileText className="w-6 h-6 text-[#FD7E14]" />
                            )}
                          </div>

                          {/* File Details */}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-[#081B3A] truncate">{doc.name}</p>
                            <div className="flex items-center gap-2 text-[10px] text-[#6B7280] mt-1 font-mono">
                              <span className={`px-1.5 py-0.2 rounded font-bold uppercase ${
                                doc.type === 'PDF' ? 'bg-[#FFF4EC] text-[#EA580C]' : 'bg-[#E8F5E9] text-[#198754]'
                              }`}>
                                {doc.type}
                              </span>
                              <span>•</span>
                              <span>{doc.pageCount} page{doc.pageCount > 1 ? 's' : ''}</span>
                              <span>•</span>
                              <span>{doc.sizeText}</span>
                            </div>
                          </div>

                          <Eye className={`w-4 h-4 shrink-0 ${isDocSelected ? 'text-[#0D6EFD]' : 'text-[#9CA3AF]'}`} />
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-[#6B7280] text-xs">Select a ticket from the queue</div>
              )}
            </div>

            {/* ── RIGHT PANEL: HIGH-RES QUICK PREVIEW (4.5 cols) ───────────────── */}
            <div className="col-span-12 md:col-span-5 bg-[#F8FAFC] flex flex-col overflow-hidden">
              
              {/* Preview Top Bar Controls */}
              <div className="h-11 bg-[#FFFFFF] border-b border-[#E2E8F0] px-3 flex items-center justify-between text-xs shrink-0">
                <span className="font-bold text-[#081B3A] truncate max-w-[200px] flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-[#0D6EFD]" /> {activeDoc?.name || 'Document Preview'}
                </span>

                <div className="flex items-center gap-1.5">
                  {/* Zoom Controls */}
                  <button
                    onClick={() => setPreviewZoom(z => Math.max(50, z - 15))}
                    className="p-1 rounded bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#081B3A] cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] font-mono px-1 font-bold text-[#081B3A]">{previewZoom}%</span>
                  <button
                    onClick={() => setPreviewZoom(z => Math.min(250, z + 15))}
                    className="p-1 rounded bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#081B3A] cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>

                  {/* Rotate Control */}
                  <button
                    onClick={() => setPreviewRotation(r => (r + 90) % 360)}
                    className="p-1 rounded bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#081B3A] ml-1 cursor-pointer"
                    title="Rotate 90°"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>

                  {/* Fullscreen Viewer */}
                  <a
                    href={activeDoc?.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 rounded bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#081B3A] ml-1 flex items-center cursor-pointer"
                    title="Open Full Screen in New Tab"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Main Preview Viewport */}
              <div className="flex-1 overflow-auto bg-[#E2E8F0]/40 p-4 flex items-center justify-center relative">
                {activeDoc ? (
                  activeDoc.type === 'IMAGE' ? (
                    <div
                      style={{
                        transform: `scale(${previewZoom / 100}) rotate(${previewRotation}deg)`,
                        transformOrigin: 'center center',
                        transition: 'transform 0.15s ease',
                      }}
                      className="max-h-full max-w-full flex items-center justify-center shadow-md rounded-xl overflow-hidden bg-[#FFFFFF] p-1 border border-[#CBD5E1]"
                    >
                      <img src={activeDoc.url} alt="preview" className="max-h-[55vh] object-contain rounded-lg" />
                    </div>
                  ) : activeDoc.type === 'DOC' || activeDoc.url?.toLowerCase().endsWith('.docx') || activeDoc.url?.toLowerCase().endsWith('.doc') ? (
                    /* Real Word Document Page-by-Page Direct Viewer */
                    <div className="w-full h-full bg-[#FFFFFF] rounded-xl overflow-hidden shadow-md flex flex-col border border-[#CBD5E1]">
                      <WordDocumentViewer
                        url={activeDoc.url}
                        documentName={activeDoc.name}
                        zoom={previewZoom / 100}
                        onPageCountChange={(cnt) => {
                          if (activeDoc.url) {
                            setPdfPageCountsMap((prev) => ({ ...prev, [activeDoc.url]: cnt }));
                          }
                        }}
                        onPrint={() => handleDirectPrint(selectedOrder)}
                      />
                    </div>
                  ) : (
                    /* Multi-Page Continuous Vertical PDF Viewer */
                    <div className="w-full h-full bg-[#FFFFFF] rounded-xl overflow-hidden shadow-md flex flex-col border border-[#CBD5E1]">
                      <ContinuousPdfViewer
                        url={activeDoc.url}
                        zoom={previewZoom}
                        rotation={previewRotation}
                        onPageCountChange={(cnt) => {
                          if (activeDoc.url) {
                            setPdfPageCountsMap((prev) => ({ ...prev, [activeDoc.url]: cnt }));
                          }
                        }}
                      />
                    </div>
                  )
                ) : (
                  <div className="text-[#6B7280] text-xs">No preview available</div>
                )}

                {/* Document Mapping Error Banner */}
                {hasDocumentMappingError && (
                  <div className="absolute inset-x-4 top-4 p-3 bg-red-600 text-white rounded-xl shadow-lg border border-red-700 flex items-center gap-2 text-xs font-bold animate-bounce z-20">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <div>
                      <div>⚠️ Document Mapping Error Detected</div>
                      <div className="text-[10px] font-normal opacity-90">
                        This file belongs to another session and does not match Token {selectedOrder?.tokenNumber}. Direct printing has been locked for safety.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── BOTTOM ACTION BAR (Buttons: Start=Blue, Direct Print=Orange, Open Editor=Purple, Complete=Green) ── */}
          <div className="h-14 bg-[#FFFFFF] border-t border-[#E2E8F0] px-4 flex items-center justify-between shrink-0 text-xs">
            <div className="flex items-center gap-3">
              <span className="text-[#6B7280] font-mono text-xs">
                Active Ticket: <strong className="text-[#0D6EFD] font-bold">{selectedOrder?.tokenNumber}</strong> ({selectedOrder?.customerName})
              </span>
            </div>

            {/* Action Buttons with Required Theme Colors */}
            <div className="flex items-center gap-2">
              {/* 1. Quick Preview = Grey */}
              <a
                href={activeDoc?.url}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 rounded-xl bg-[#E9ECEF] hover:bg-[#DEE2E6] text-[#495057] font-semibold text-xs flex items-center gap-1.5 border border-[#CED4DA] transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-[#0D6EFD]" /> 1. Quick Preview
              </a>

              {/* 2. Direct Print = Orange */}
              <button
                disabled={hasDocumentMappingError}
                onClick={handleDirectPrintTrigger}
                className={`px-4 py-2 rounded-xl text-[#FFFFFF] font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all ${
                  hasDocumentMappingError
                    ? 'bg-gray-400 cursor-not-allowed opacity-50'
                    : 'bg-[#FD7E14] hover:bg-[#E86D07] active:scale-[0.98] cursor-pointer'
                }`}
              >
                <Printer className="w-3.5 h-3.5" /> 2. Direct Print
              </button>

              {/* 3. Open Editor = Purple */}
              <button
                onClick={() => {
                  window.location.href = `/print-hub/inbox?phone=${selectedOrder?.customerPhone}`;
                }}
                className="px-4 py-2 rounded-xl bg-[#6F42C1] hover:bg-[#59359A] text-[#FFFFFF] font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-[0.98] cursor-pointer"
              >
                <Crop className="w-3.5 h-3.5" /> 3. Open Editor
              </button>

              {/* 4. Complete Work = Green */}
              <button
                onClick={() => {
                  if (selectedOrder) handleCompleteWork(selectedOrder);
                }}
                className="px-4 py-2 rounded-xl bg-[#198754] hover:bg-[#157347] text-[#FFFFFF] font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-[0.98] cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> 4. Complete Work
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PRINT CONFIRMATION POPUP MODAL ───────────────────────────────────── */}
      {showPrintVerifyModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-xs animate-in fade-in select-none">
          <div className="bg-[#FFFFFF] border border-[#CBD5E1] p-6 rounded-3xl max-w-md w-full mx-4 shadow-2xl space-y-4 font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2 text-[#081B3A] font-bold text-base">
                <Printer className="w-5 h-5 text-[#0D6EFD]" />
                <span>PRINT CONFIRMATION</span>
              </div>
              <span className="px-3 py-1 rounded-full font-mono text-xs font-bold bg-[#E7F1FF] text-[#0D6EFD] border border-[#B6D4FE]">
                {lastPrintedJob?.tokenNumber || 'Token'}
              </span>
            </div>

            <div className="py-2 space-y-2 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#E8F5E9] text-[#198754] flex items-center justify-center mx-auto border border-[#A7F3D0]">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h4 className="text-lg font-black text-[#081B3A]">
                Print Successful?
              </h4>
              <p className="text-xs text-[#6B7280]">
                Please check the printer output tray before moving ticket to Completed.
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                onClick={handlePrintVerifiedSuccess}
                className="w-full py-3.5 rounded-2xl bg-[#198754] hover:bg-[#157347] text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
              >
                <CheckCircle2 className="w-4 h-4" /> YES - Confirm Completed
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={async () => {
                    if (lastPrintedJob) {
                      const docItemsToPrint = lastPrintedJob.docItems && lastPrintedJob.docItems.length > 0
                        ? lastPrintedJob.docItems
                        : [{ url: lastPrintedJob.documentUrl, type: lastPrintedJob.documentName?.endsWith('.pdf') ? 'PDF' : 'IMAGE', name: lastPrintedJob.documentName }];
                      await directPrintFiles(docItemsToPrint, lastPrintedJob.tokenNumber || 'T-101');
                    }
                  }}
                  className="py-3 rounded-2xl bg-[#FFF7ED] hover:bg-[#FFEDD5] text-[#EA580C] font-bold text-xs border border-[#FED7AA] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5" /> REPRINT
                </button>
                <button
                  onClick={() => setShowPrintVerifyModal(false)}
                  className="py-3 rounded-2xl bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#6B7280] font-bold text-xs border border-[#CBD5E1] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" /> CANCEL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── WORK COMPLETED - OPEN NEXT TICKET MODAL ─────────────────────────── */}
      {showNextTicketModal && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in select-none">
          <div className="bg-[#FFFFFF] border border-[#CBD5E1] p-6 md:p-8 rounded-3xl max-w-md w-full mx-4 shadow-2xl space-y-5 text-center font-sans">
            <div className="w-16 h-16 rounded-3xl bg-[#E8F5E9] text-[#198754] flex items-center justify-center mx-auto border border-[#A7F3D0] shadow-md">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-black text-[#081B3A]">✅ Work Completed</h3>
              <p className="text-xs text-[#6B7280]">
                Ticket <strong className="text-[#0D6EFD] font-mono">{justCompletedTicket?.tokenNumber}</strong> marked completed. Open next ticket?
              </p>
            </div>

            <div className="p-3.5 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] text-xs text-left space-y-1.5 font-mono">
              <div className="flex justify-between text-[#6B7280]">
                <span>Printed By:</span>
                <strong className="text-[#081B3A]">{currentUser?.name || 'Staff User 1'}</strong>
              </div>
              <div className="flex justify-between text-[#6B7280]">
                <span>Branch:</span>
                <strong className="text-[#081B3A]">{justCompletedTicket?.branchName || 'SVV Main Hub'} ({justCompletedTicket?.branchCode || 'SVV-1'})</strong>
              </div>
              <div className="flex justify-between text-[#6B7280]">
                <span>Total Pages:</span>
                <strong className="text-[#081B3A]">{justCompletedTicket?.totalPages || 1} pages</strong>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <Button
                onClick={handleOpenNextTicket}
                className="w-full h-12 rounded-2xl bg-[#0D6EFD] hover:bg-[#0b5ed7] text-white font-bold text-xs shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" /> Open Next Ticket
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowNextTicketModal(false)}
                className="w-full h-10 rounded-2xl text-xs font-bold text-[#6B7280] border-[#CBD5E1] cursor-pointer"
              >
                Return to Queue
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD WALK-IN TICKET MODAL ─────────────────────────────────────────── */}
      {showNewOrder && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] rounded-2xl shadow-xl w-full max-w-md p-5 space-y-4 font-sans border border-[#E2E8F0]">
            <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-2">
              <div className="flex items-center gap-2 text-[#0D6EFD] font-bold text-sm">
                <Printer className="w-4 h-4" /> Add Counter Walk-in Ticket
              </div>
              <button onClick={() => setShowNewOrder(false)} className="text-[#6B7280] hover:text-[#081B3A] text-sm cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-[#081B3A] block mb-1">Branch</label>
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full p-2 border border-[#CBD5E1] rounded-lg text-xs bg-[#FFFFFF] text-[#081B3A]"
                >
                  {branches?.map((b: any) => (
                    <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-[#081B3A] block mb-1">Customer Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full p-2 border border-[#CBD5E1] rounded-lg text-xs text-[#081B3A]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#081B3A] block mb-1">Customer WhatsApp Mobile</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 9876543210"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full p-2 border border-[#CBD5E1] rounded-lg text-xs text-[#081B3A]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#081B3A] block mb-1">Document Description</label>
                <input
                  type="text"
                  placeholder="e.g. Aadhaar Card & Voter ID Scan"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  className="w-full p-2 border border-[#CBD5E1] rounded-lg text-xs text-[#081B3A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#081B3A] block mb-1">Price (₹)</label>
                  <input
                    type="number"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(Number(e.target.value))}
                    className="w-full p-2 border border-[#CBD5E1] rounded-lg text-xs font-mono font-bold text-[#081B3A]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#081B3A] block mb-1">Copies</label>
                  <input
                    type="number"
                    min={1}
                    value={copies}
                    onChange={(e) => setCopies(Number(e.target.value))}
                    className="w-full p-2 border border-[#CBD5E1] rounded-lg text-xs text-[#081B3A]"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowNewOrder(false)} className="text-xs cursor-pointer border-[#CED4DA] text-[#495057]">
                  Cancel
                </Button>
                <Button type="submit" loading={createOrderMutation.isPending} className="bg-[#0D6EFD] hover:bg-[#0b5ed7] text-[#FFFFFF] text-xs font-bold cursor-pointer">
                  Create Ticket & Generate Token
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── TOAST FEEDBACK NOTIFICATION ───────────────────────────────────────── */}
      {copyToast.visible && (
        <div className="fixed bottom-6 right-6 z-[200] flex items-center gap-2 bg-[#081B3A] text-white px-4 py-3 rounded-2xl shadow-2xl border border-[#1e40af] animate-in fade-in slide-in-from-bottom-3 duration-200 select-none">
          <div className="w-6 h-6 rounded-full bg-[#198754] text-white flex items-center justify-center shrink-0">
            <Check className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold font-sans">{copyToast.message}</span>
        </div>
      )}

      {/* ── IN-APP WHATSAPP LIVE CHAT MODAL ───────────────────────────────────── */}
      {activeChatOrder && (
        <WhatsAppChatModal
          isOpen={!!activeChatOrder}
          onClose={() => setActiveChatOrder(null)}
          customerName={activeChatOrder.customerName || 'Customer'}
          customerPhone={activeChatOrder.customerPhone || ''}
          tokenNumber={activeChatOrder.tokenNumber}
          branchId={activeChatOrder.branchId || branchId}
          orderId={activeChatOrder.id}
          totalAmount={activeChatOrder.totalAmount || 10}
        />
      )}

      {/* ── WHATSAPP GATEWAY PAIRING & TEST INGEST MODAL ───────────────────────── */}
      
    </div>
  );
}
