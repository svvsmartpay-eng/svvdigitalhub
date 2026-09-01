import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useWhatsAppInbox, useCreatePrintOrder, useUpdatePrintOrderStatus, usePrintOrders, usePrintHubRealtimeSync } from '@/api/printHub.api';
import { useBranches } from '@/api/branches.api';
import { useCurrentUser } from '@/api/auth.api';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import DocumentQuickPrintViewer from './DocumentQuickPrintViewer';
import WordDocumentViewer from '@/components/shared/WordDocumentViewer';
import WhatsAppChatModal from '@/components/shared/WhatsAppChatModal';
import WhatsAppGatewayModal from '@/components/shared/WhatsAppGatewayModal';
import {
  Printer, Check, FileText, Phone, User, Search, CheckCircle2,
  Eye, Crop, RotateCw, RotateCcw, CreditCard, Scissors, Upload,
  MousePointer, Files, RefreshCw, Sparkles, AlertCircle, ArrowRight,
  ZoomIn, ZoomOut, Maximize, Move, Layers, Grid, Sliders, ShieldCheck,
  Zap, Clock, UserCheck, Image as ImageIcon, Copy, Trash2, Undo, Redo,
  CheckCheck, Lock, Unlock, HelpCircle, ChevronRight, Minimize2,
  X, Maximize2, Sparkle, LayoutGrid, CheckSquare, Crosshair,
  Square, FlipHorizontal, Play, Download, MessageSquare, Smartphone
} from 'lucide-react';

function formatDisplayPhone(raw: string): string {
  if (!raw) return '';
  const digits = raw.replace(/[^0-9]/g, '');
  if (digits.startsWith('91') && digits.length === 12) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  if (digits.length >= 14) {
    return `+91 (WA #${digits.slice(-4)})`;
  }
  return raw.startsWith('+') ? raw : `+${raw}`;
}

export type PrintMode = 'PVC_CARD' | 'A4_FULL_PAGE' | 'PASSPORT_PHOTOS';
export type CropToolType = 'SCANNER_CORNER_PERSPECTIVE' | 'FREE_TRANSFORM';

export interface CropBox {
  x: number; // percentage 0..100
  y: number; // percentage 0..100
  w: number; // percentage 0..100
  h: number; // percentage 0..100
}

export interface QuadCorners {
  tl: { x: number; y: number }; // percentages 0..100
  tr: { x: number; y: number };
  br: { x: number; y: number };
  bl: { x: number; y: number };
}

export default function WhatsAppInboxPage() {
  usePrintHubRealtimeSync();
  const { data: currentUser } = useCurrentUser();
  const operatorName = currentUser?.name || 'Staff User 1';

  const { data: branches } = useBranches();
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const { data: messages, isLoading, refetch } = useWhatsAppInbox(selectedBranchId || undefined);
  const { data: ordersResponse, refetch: refetchOrders } = usePrintOrders({ branchId: selectedBranchId || undefined });

  const createOrderMutation = useCreatePrintOrder();
  const updateStatusMutation = useUpdatePrintOrderStatus();

  // Search in queue
  const [queueSearch, setQueueSearch] = useState('');

  // Active Selected Chat & Document State
  const [activePhone, setActivePhone] = useState<string>('');
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number>(0);
  const [selectedDocMsg, setSelectedDocMsg] = useState<any | null>(null);

  // ── Print Mode Selection (PVC Card vs A4 Full Page vs Passport Photos) ───────
  const [printMode, setPrintMode] = useState<PrintMode>('PVC_CARD');
  const [a4Orientation, setA4Orientation] = useState<'PORTRAIT' | 'LANDSCAPE'>('PORTRAIT');

  // ── Document Quick Print Viewer State (Direct PDF / DOCX Lossless Print) ────
  const [showDocQuickPrint, setShowDocQuickPrint] = useState<boolean>(false);
  const [showGatewayModal, setShowGatewayModal] = useState<boolean>(false);

  // ── Print Verification & Work Locking State ────────────────────────────────
  const [showPrintVerificationModal, setShowPrintVerificationModal] = useState<boolean>(false);
  const [lastActivityTime, setLastActivityTime] = useState<number>(Date.now());
  const [lastPrintedDocInfo, setLastPrintedDocInfo] = useState<{ title: string; tokenNumber: string; printDataUrl?: string; pageCss?: string } | null>(null);

  // ── Stage 3: Print Confirmation Modal State ────────────────────────────────
  const [showPrintConfirmModal, setShowPrintConfirmModal] = useState<boolean>(false);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('Canon iR-ADV C3520 (Main Network Laser)');
  const [selectedPaperSize, setSelectedPaperSize] = useState<string>('PVC_CR80');
  const [printCopies, setPrintCopies] = useState<number>(1);
  const [printColorMode, setPrintColorMode] = useState<'COLOR' | 'BW'>('COLOR');

  // ── Stage 4: Completed Modal State ─────────────────────────────────────────
  const [showCompletedModal, setShowCompletedModal] = useState<boolean>(false);

  // ── Crop Studio Mode & Target State ─────────────────────────────────────────
  const [showCropModal, setShowCropModal] = useState<boolean>(false);
  const [activeCropTarget, setActiveCropTarget] = useState<'FRONT' | 'BACK'>('FRONT');
  const [cropToolType, setCropToolType] = useState<CropToolType>('SCANNER_CORNER_PERSPECTIVE');

  // ── Document Loading State ──────────────────────────────────────────────────
  const [documentImageSrc, setDocumentImageSrc] = useState<string>('');
  const [loadedSourceImage, setLoadedSourceImage] = useState<HTMLImageElement | null>(null);
  const [isFileLoading, setIsFileLoading] = useState<boolean>(false);
  const [fileLoadError, setFileLoadError] = useState<string | null>(null);

  // ── PVC Card Collection Tray (Multi-Card Management) ──────────────────────
  const [cardTray, setCardTray] = useState<Array<{
    id: string;
    name: string;
    frontCrop: { isSaved: boolean; dataUrl: string; label?: string };
    backCrop: { isSaved: boolean; dataUrl: string; label?: string };
  }>>([
    {
      id: 'card-1',
      name: 'PVC Card 1',
      frontCrop: { isSaved: false, dataUrl: '', label: '' },
      backCrop: { isSaved: false, dataUrl: '', label: '' },
    },
  ]);
  const [activeCardSlotId, setActiveCardSlotId] = useState<string>('card-1');

  // ── Permanent Independent PVC Saved Crops ─────────────────────────────────
  const [pvcFrontCrop, setPvcFrontCrop] = useState<{ isSaved: boolean; dataUrl: string }>({
    isSaved: false,
    dataUrl: '',
  });
  const [pvcBackCrop, setPvcBackCrop] = useState<{ isSaved: boolean; dataUrl: string }>({
    isSaved: false,
    dataUrl: '',
  });
  const [confirmReplaceSide, setConfirmReplaceSide] = useState<'FRONT' | 'BACK' | null>(null);

  // ── 4-Corner Perspective Quads (Front & Back) ───────────────────────────────
  const [frontQuad, setFrontQuad] = useState<QuadCorners>({
    tl: { x: 4, y: 8 },
    tr: { x: 96, y: 8 },
    br: { x: 96, y: 92 },
    bl: { x: 4, y: 92 },
  });
  const [backQuad, setBackQuad] = useState<QuadCorners>({
    tl: { x: 4, y: 8 },
    tr: { x: 96, y: 8 },
    br: { x: 96, y: 92 },
    bl: { x: 4, y: 92 },
  });

  // ── Crop Box Regions (Front & Back) ─────────────────────────────────────────
  const [frontCropBox, setFrontCropBox] = useState<CropBox>({ x: 4, y: 8, w: 92, h: 84 });
  const [backCropBox, setBackCropBox] = useState<CropBox>({ x: 4, y: 8, w: 92, h: 84 });
  const [frontBoxRotation, setFrontBoxRotation] = useState<number>(0);
  const [backBoxRotation, setBackBoxRotation] = useState<number>(0);

  // Separate image sources if Front & Back were sent as 2 separate files
  const [frontSourceImg, setFrontSourceImg] = useState<HTMLImageElement | null>(null);
  const [backSourceImg, setBackSourceImg] = useState<HTMLImageElement | null>(null);

  // Drag State for 4-Corner Scanner & Free Transform
  const [dragMode, setDragMode] = useState<
    'NONE' | 'MOVE_BOX' | 'RESIZE_NW' | 'RESIZE_N' | 'RESIZE_NE' | 'RESIZE_E' | 'RESIZE_SE' | 'RESIZE_S' | 'RESIZE_SW' | 'RESIZE_W' |
    'DRAG_CORNER_TL' | 'DRAG_CORNER_TR' | 'DRAG_CORNER_BR' | 'DRAG_CORNER_BL' |
    'DRAG_EDGE_TOP' | 'DRAG_EDGE_RIGHT' | 'DRAG_EDGE_BOTTOM' | 'DRAG_EDGE_LEFT' |
    'DRAG_MOVE_QUAD' | 'ROTATE_BOX_HANDLE'
  >('NONE');
  const [dragStartPoint, setDragStartPoint] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initialBoxOnDrag, setInitialBoxOnDrag] = useState<CropBox>({ x: 0, y: 0, w: 0, h: 0 });
  const [initialQuadOnDrag, setInitialQuadOnDrag] = useState<QuadCorners>({
    tl: { x: 0, y: 0 }, tr: { x: 0, y: 0 }, br: { x: 0, y: 0 }, bl: { x: 0, y: 0 }
  });
  const [initialBoxRotationOnDrag, setInitialBoxRotationOnDrag] = useState<number>(0);
  const [activeHoverCorner, setActiveHoverCorner] = useState<string | null>(null);

  // Viewport Zoom & Global Document Rotation
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [rotationAngle, setRotationAngle] = useState<number>(0);

  // Image Cleanup Filters
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [filterMode, setFilterMode] = useState<'VIBRANT' | 'CLEAN_BW' | 'DOC_WHITE' | 'ORIGINAL'>('VIBRANT');

  // A4 Layout Mode Configuration (Position & Scale of Cropped Document on A4)
  const [a4LayoutStyle, setA4LayoutStyle] = useState<'AUTO_FIT' | 'CARD_TOP' | 'CARD_CENTER' | 'DOUBLE_XEROX'>('CARD_TOP');
  const [a4ScalePercent, setA4ScalePercent] = useState<number>(100);
  const [pdfPageCount, setPdfPageCount] = useState<number>(1);
  const [isPdfDocument, setIsPdfDocument] = useState<boolean>(false);
  const [isOfficeDocument, setIsOfficeDocument] = useState<boolean>(false);
  const [officeDocInfo, setOfficeDocInfo] = useState<{ name: string; url: string; type: string } | null>(null);
  const [pdfDocProxy, setPdfDocProxy] = useState<any>(null);
  const [pdfPagesList, setPdfPagesList] = useState<Array<{ pageNum: number; dataUrl: string; img: HTMLImageElement; width: number; height: number }>>([]);
  const [currentPdfPage, setCurrentPdfPage] = useState<number>(1);
  const [selectedPdfPages, setSelectedPdfPages] = useState<number[]>([1]);
  const [pdfPrintOption, setPdfPrintOption] = useState<'CURRENT' | 'ALL' | 'SELECTED'>('ALL');
  const [isRenderingPdfPages, setIsRenderingPdfPages] = useState<boolean>(false);

  // Custom Price Override
  const [customPrice, setCustomPrice] = useState<number>(10);
  const [showChatModal, setShowChatModal] = useState<boolean>(false);

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

  // Canvas Refs
  const modalWorkspaceContainerRef = useRef<HTMLDivElement | null>(null);
  const frontPreviewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const backPreviewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pvcSheetPreviewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const a4PreviewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const hiddenPdfCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Queue Tab Filter
  const [queueStatusTab, setQueueStatusTab] = useState<'ALL' | 'PENDING' | 'DONE'>('ALL');

  // ── Unified Queue Synchronized 1:1 with Print Queue Backend Orders ───────────
  const queueItems = React.useMemo(() => {
    const normalizePhoneKey = (p?: string): string => {
      if (!p) return '';
      const digits = p.replace(/[^0-9]/g, '');
      return digits.length >= 10 ? digits.slice(-10) : digits;
    };

    const resolveCustomerName = (senderName?: string, orderName?: string, phone?: string): string => {
      const isGeneric = (n?: string) => !n || n.includes('Print Desk') || n.includes('SVV Communication') || n === 'Walk-in Customer' || n === 'Test Walk-in Customer';
      if (!isGeneric(senderName)) return senderName!.trim();
      if (!isGeneric(orderName)) return orderName!.trim();
      if (phone) return formatDisplayPhone(phone);
      return 'Walk-in Customer';
    };

    // 1. Group all orders by normalized customer phone
    const groupedOrdersMap: Map<string, any> = new Map();

    (ordersResponse?.data || []).forEach((ord: any) => {
      const ordDate = new Date(ord.createdAt);

      // Find ONLY WhatsApp media messages specifically linked to THIS order ID
      const matchingMessages = (messages || []).filter((m: any) => m.orderId === ord.id);
      const latestMsg = matchingMessages[matchingMessages.length - 1] || null;
      const finalCustomerName = resolveCustomerName(latestMsg?.senderName, ord.customerName, ord.customerPhone);

      const mediaItems: any[] = [];
      const seenUrls = new Set<string>();

      // Primary document
      if (ord.documentUrl) {
        const isPdf = ord.documentUrl.toLowerCase().includes('.pdf') || (ord.documentName && ord.documentName.toLowerCase().endsWith('.pdf'));
        const isDocx = ord.documentUrl.toLowerCase().includes('.docx') || (ord.documentName && ord.documentName.toLowerCase().endsWith('.docx'));

        mediaItems.push({
          id: `ord-doc-${ord.id}-0`,
          phone: ord.customerPhone,
          mediaUrl: ord.documentUrl,
          mediaType: isPdf ? 'PDF' : isDocx ? 'DOC' : 'IMAGE',
          messageBody: ord.documentName || (isPdf ? 'Document.pdf' : 'Photo.jpg'),
          createdAt: ord.createdAt,
          tokenNumber: ord.tokenNumber,
        });
        seenUrls.add(ord.documentUrl);
      }

      // Add extra media messages explicitly belonging to this order
      matchingMessages.filter((m: any) => m.mediaUrl).forEach((m: any, idx: number) => {
        if (!seenUrls.has(m.mediaUrl)) {
          seenUrls.add(m.mediaUrl);
          const isPdf = m.mediaUrl.toLowerCase().includes('.pdf') || m.mediaType === 'PDF';
          const isDocx = m.mediaUrl.toLowerCase().includes('.docx') || m.mediaType === 'DOC';

          mediaItems.push({
            id: `msg-${m.id || idx}`,
            phone: m.phone,
            mediaUrl: m.mediaUrl,
            mediaType: isPdf ? 'PDF' : isDocx ? 'DOC' : 'IMAGE',
            messageBody: m.fileName || m.messageBody || (isPdf ? 'Document.pdf' : 'Photo.jpg'),
            createdAt: m.createdAt,
            tokenNumber: ord.tokenNumber,
          });
        }
      });

      const status: 'QUEUED' | 'PRINTING' | 'READY' | 'COMPLETED' =
        ord.status === 'DELIVERED' ? 'COMPLETED' :
        ord.status === 'READY_FOR_DELIVERY' ? 'READY' :
        ord.status === 'IN_PROGRESS' ? 'PRINTING' : 'QUEUED';

      let durationText = '';
      if (status === 'COMPLETED' || ord.status === 'DELIVERED') {
        const completedTime = ord.updatedAt ? new Date(ord.updatedAt).getTime() : (ordDate.getTime() + 120000);
        const diffMs = Math.max(15000, completedTime - ordDate.getTime());
        const mins = Math.floor(diffMs / 60000);
        const secs = Math.floor((diffMs % 60000) / 1000);
        durationText = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
      } else {
        const elapsedMs = Math.max(0, Date.now() - ordDate.getTime());
        const elapsedMins = Math.floor(elapsedMs / 60000);
        if (elapsedMins >= 60) {
          const hours = Math.floor(elapsedMins / 60);
          const remMins = elapsedMins % 60;
          durationText = `${hours}h ${remMins}m ago`;
        } else {
          durationText = elapsedMins > 0 ? `${elapsedMins}m ago` : '<1m ago';
        }
      }

      const lockedByStaffId = ord.assignedStaffId;
      const lockedByStaffName = ord.assignedStaff?.name || '';
      const isLockedByOther = Boolean(lockedByStaffId && currentUser?.id && lockedByStaffId !== currentUser.id && ord.status === 'PRINTING');
      const isLockedByMe = Boolean(lockedByStaffId === currentUser?.id || (!lockedByStaffId && ord.status === 'PRINTING'));

      groupedOrdersMap.set(ord.id, {
        id: ord.id,
        phone: ord.customerPhone || '',
        customerName: finalCustomerName,
        branch: ord.branch,
        branchName: ord.branch?.name || 'Isnapur',
        order: ord,
        orderNo: ord.orderNo,
        tokenNumber: ord.tokenNumber || `T-${ord.id.slice(-3)}`,
        latestMsg,
        mediaMessages: mediaItems,
        status,
        fileName: ord.documentName || 'Document',
        receivedTime: ordDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        servedBy: ord.assignedStaff?.name || operatorName,
        lockedByStaffId,
        lockedByStaffName,
        isLockedByOther,
        isLockedByMe,
        amount: ord.totalAmount || 100,
        rawDate: ordDate,
        durationText,
      });
    });

    const ordersList = Array.from(groupedOrdersMap.values());

    // 2. Add any incoming WhatsApp chats that don't have orders yet
    const orderPhoneKeys = new Set(ordersList.map((o: any) => normalizePhoneKey(o.phone)));
    const unassignedChats: any[] = [];
    const chatMap: Record<string, boolean> = {};

    (messages || []).forEach((m: any) => {
      const phoneKey = normalizePhoneKey(m.phone);
      if (phoneKey && !orderPhoneKeys.has(phoneKey) && !chatMap[phoneKey] && m.mediaUrl) {
        chatMap[phoneKey] = true;
        const msgDate = new Date(m.createdAt);
        const userMsgs = (messages || []).filter((msg: any) => normalizePhoneKey(msg.phone) === phoneKey);
        const mediaMsgs = userMsgs.filter((msg: any) => msg.mediaUrl);
        const custName = resolveCustomerName(m.senderName, undefined, m.phone);

        let cleanName = m.messageBody || 'Document';
        if (cleanName.startsWith('Please print photo:') || cleanName.startsWith('Please print document:') || cleanName.startsWith('Please print')) {
          cleanName = cleanName.replace(/^Please print (photo|document):\s*/i, '').replace(/^Please print\s*/i, '').trim();
        }

        unassignedChats.push({
          id: `chat-${phoneKey}`,
          phone: m.phone,
          customerName: custName,
          branch: m.branch,
          branchName: m.branch?.name || 'Isnapur',
          order: null,
          orderNo: '',
          tokenNumber: `WA-${phoneKey.slice(-4)}`,
          latestMsg: m,
          mediaMessages: mediaMsgs,
          status: 'QUEUED' as const,
          fileName: cleanName,
          receivedTime: msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          servedBy: operatorName,
          lockedByStaffId: null,
          lockedByStaffName: '',
          isLockedByOther: false,
          isLockedByMe: true,
          amount: 100,
          rawDate: msgDate,
          durationText: '<1m in queue',
        });
      }
    });

    const list = [...ordersList, ...unassignedChats];

    // Maintain consistent ordering with Print Queue (newest first, active on top)
    list.sort((a, b) => {
      const priority: Record<string, number> = { QUEUED: 0, PRINTING: 1, READY: 2, COMPLETED: 3 };
      const diff = (priority[a.status] ?? 0) - (priority[b.status] ?? 0);
      if (diff !== 0) return diff;
      return (b.rawDate?.getTime() || 0) - (a.rawDate?.getTime() || 0);
    });

    if (!selectedJobId && list.length > 0) {
      setSelectedJobId(list[0].id);
      setActivePhone(list[0].phone);
    }
    return list;
  }, [messages, ordersResponse, selectedJobId, operatorName]);

  const filteredQueue = queueItems.filter(q => {
    const matchesSearch =
      q.tokenNumber.toLowerCase().includes(queueSearch.toLowerCase()) ||
      q.orderNo.toLowerCase().includes(queueSearch.toLowerCase()) ||
      q.fileName.toLowerCase().includes(queueSearch.toLowerCase()) ||
      q.customerName.toLowerCase().includes(queueSearch.toLowerCase()) ||
      q.phone.includes(queueSearch);

    if (!matchesSearch) return false;

    if (queueStatusTab === 'PENDING') return q.status !== 'COMPLETED';
    if (queueStatusTab === 'DONE') return q.status === 'COMPLETED';
    return true;
  });

  const activeJob = queueItems.find((j: any) => (selectedJobId && j.id === selectedJobId) || (activePhone && j.phone === activePhone)) || queueItems[0];
  const activeMediaList: any[] = (activeJob as any)?.mediaMessages || [];

  /**
   * Render single PDF page to image canvas
   */
  const renderSinglePdfPage = async (pdfDoc: any, pageNum: number) => {
    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2.2 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      const dataUrl = canvas.toDataURL('image/png');
      const img = new Image();
      img.src = dataUrl;
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
      });
      return { pageNum, dataUrl, img, width: viewport.width, height: viewport.height };
    } catch (e) {
      console.error(`[PDF Loader] Error rendering page ${pageNum}:`, e);
      return null;
    }
  };

  const handleSelectPdfPage = async (pageNum: number) => {
    if (pageNum < 1 || pageNum > pdfPageCount) return;
    setCurrentPdfPage(pageNum);

    const existing = pdfPagesList.find((p) => p.pageNum === pageNum);
    if (existing) {
      setDocumentImageSrc(existing.dataUrl);
      setLoadedSourceImage(existing.img);
    } else if (pdfDocProxy) {
      setIsFileLoading(true);
      const rendered = await renderSinglePdfPage(pdfDocProxy, pageNum);
      if (rendered) {
        setDocumentImageSrc(rendered.dataUrl);
        setLoadedSourceImage(rendered.img);
        setPdfPagesList((prev) => [...prev.filter((p) => p.pageNum !== pageNum), rendered].sort((a, b) => a.pageNum - b.pageNum));
      }
      setIsFileLoading(false);
    }
  };

  const handleTogglePageSelection = (pageNum: number) => {
    setSelectedPdfPages((prev) => {
      if (prev.includes(pageNum)) {
        if (prev.length === 1) return prev; // Keep at least one page selected
        return prev.filter((p) => p !== pageNum);
      } else {
        return [...prev, pageNum].sort((a, b) => a - b);
      }
    });
  };

  const handleSelectAllPdfPages = () => {
    const all = Array.from({ length: pdfPageCount }, (_, i) => i + 1);
    setSelectedPdfPages(all);
  };

  /**
   * Load real source file into the Universal Preview Canvas
   */
  const loadSourceFile = useCallback(async (url: string, isPdfHint = false) => {
    if (!url) {
      setLoadedSourceImage(null);
      setDocumentImageSrc('');
      setFileLoadError(null);
      return;
    }

    setIsFileLoading(true);
    setFileLoadError(null);

    const cleanRelUrl = url.startsWith('http')
      ? url.replace(/^http:\/\/[^/]+/, '')
      : (url.startsWith('/') ? url : `/${url}`);
    const directBackendUrl = url.startsWith('http') ? url : `http://localhost:4000${cleanRelUrl}`;
    const primaryUrl = directBackendUrl;
    
    const isWord = url.toLowerCase().endsWith('.doc') || url.toLowerCase().endsWith('.docx') || url.toLowerCase().endsWith('.rtf') || url.toLowerCase().endsWith('.odt');
    const isExcel = url.toLowerCase().endsWith('.xls') || url.toLowerCase().endsWith('.xlsx') || url.toLowerCase().endsWith('.csv');
    const isText = url.toLowerCase().endsWith('.txt');
    const isOffice = isWord || isExcel || isText;
    const isPdf = isPdfHint || url.toLowerCase().endsWith('.pdf');

    // ── 1. REAL OFFICE DOCUMENTS (DOCX, XLSX, TXT) ───────────────────────────
    if (isOffice) {
      setIsPdfDocument(false);
      setIsOfficeDocument(true);
      setPdfPageCount(1);
      setPdfPagesList([]);
      setDocumentImageSrc('');
      setLoadedSourceImage(null);
      setOfficeDocInfo({
        name: cleanRelUrl.split('/').pop() || 'Document.docx',
        url: directBackendUrl,
        type: isWord ? 'Microsoft Word Document (.docx)' : isExcel ? 'Excel Spreadsheet (.xlsx)' : 'Text Document (.txt)',
      });
      setIsFileLoading(false);
      return;
    }

    setIsOfficeDocument(false);
    setOfficeDocInfo(null);

    // ── 2. REAL PDF DOCUMENTS ────────────────────────────────────────────────
    if (isPdf) {
      setIsPdfDocument(true);
      setPrintMode('A4_FULL_PAGE');
      setCustomPrice(10);
      setA4LayoutStyle('AUTO_FIT');
      setA4ScalePercent(100);
      setActiveCropBox({ x: 0, y: 0, w: 100, h: 100 });
      setActiveQuad({ tl: { x: 0, y: 0 }, tr: { x: 100, y: 0 }, br: { x: 100, y: 100 }, bl: { x: 0, y: 100 } });
      setCurrentPdfPage(1);
      setPdfPageCount(1);
      setSelectedPdfPages([1]);
      setDocumentImageSrc(primaryUrl);
      setIsFileLoading(false);
    } else {
      // ── 3. REAL IMAGE FILES (JPG, PNG, WEBP) ───────────────────────────────
      setIsPdfDocument(false);
      const tryLoadImg = (src: string, isRetry = false) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          setDocumentImageSrc(src);
          setLoadedSourceImage(img);
          setIsFileLoading(false);
        };
        img.onerror = () => {
          if (!isRetry && src !== directBackendUrl) {
            tryLoadImg(directBackendUrl, true);
          } else {
            setIsFileLoading(false);
            setLoadedSourceImage(null);
            setDocumentImageSrc('');
            setFileLoadError('Image preview unavailable. Click below to open original file.');
          }
        };
        img.src = src;
      };
      tryLoadImg(primaryUrl);
    }
  }, []);

  useEffect(() => {
    if (activeJob && activeMediaList.length > 0) {
      const idx = Math.min(selectedMediaIndex, activeMediaList.length - 1);
      const currentDoc = activeMediaList[idx] || activeMediaList[0];
      setSelectedDocMsg(currentDoc);

      if (currentDoc?.mediaUrl) {
        const isPdf = currentDoc.mediaType === 'PDF' || currentDoc.mediaUrl.toLowerCase().endsWith('.pdf');
        loadSourceFile(currentDoc.mediaUrl, isPdf);
      } else {
        setDocumentImageSrc('');
        setLoadedSourceImage(null);
      }
    } else {
      setSelectedDocMsg(null);
      setDocumentImageSrc('');
      setLoadedSourceImage(null);
    }
  }, [activePhone, activeJob, activeMediaList, selectedMediaIndex, loadSourceFile]);

  // Handle local file upload
  const handleLocalFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      const fileUrl = URL.createObjectURL(file);
      loadSourceFile(fileUrl, true);
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        loadSourceFile(dataUrl, false);
      };
      reader.readAsDataURL(file);
    }
  };

  // ── Mode Switcher Helper ────────────────────────────────────────────────────
  const handleSetPrintMode = (mode: PrintMode) => {
    setPrintMode(mode);
    if (mode === 'A4_FULL_PAGE') {
      setCustomPrice(10);
    } else if (mode === 'PVC_CARD') {
      setCustomPrice(100);
    } else {
      setCustomPrice(50);
    }
  };

  // ── Active Crop Getter & Setter ─────────────────────────────────────────────
  const activeCropBox = activeCropTarget === 'FRONT' ? frontCropBox : backCropBox;
  const setActiveCropBox = (newBox: CropBox | ((b: CropBox) => CropBox)) => {
    if (typeof newBox === 'function') {
      if (activeCropTarget === 'FRONT') setFrontCropBox(prev => newBox(prev));
      else setBackCropBox(prev => newBox(prev));
    } else {
      if (activeCropTarget === 'FRONT') setFrontCropBox(newBox);
      else setBackCropBox(newBox);
    }
  };

  const activeQuad = activeCropTarget === 'FRONT' ? frontQuad : backQuad;
  const setActiveQuad = (newQuad: QuadCorners | ((q: QuadCorners) => QuadCorners)) => {
    if (typeof newQuad === 'function') {
      if (activeCropTarget === 'FRONT') setFrontQuad(prev => newQuad(prev));
      else setBackQuad(prev => newQuad(prev));
    } else {
      if (activeCropTarget === 'FRONT') setFrontQuad(newQuad);
      else setBackQuad(newQuad);
    }
  };

  const activeBoxRotation = activeCropTarget === 'FRONT' ? frontBoxRotation : backBoxRotation;
  const setActiveBoxRotation = (deg: number) => {
    if (activeCropTarget === 'FRONT') setFrontBoxRotation(deg);
    else setBackBoxRotation(deg);
  };

  // ── Drag & Resize Calculations ──────────────────────────────────────────────
  const getEventPercent = (clientX: number, clientY: number) => {
    const rect = modalWorkspaceContainerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100)),
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, mode: typeof dragMode = 'MOVE_BOX') => {
    e.stopPropagation();
    if (!loadedSourceImage) return;

    const pt = getEventPercent(e.clientX, e.clientY);
    setDragMode(mode);
    setDragStartPoint(pt);
    setInitialBoxOnDrag({ ...activeCropBox });
    setInitialQuadOnDrag({
      tl: { ...activeQuad.tl },
      tr: { ...activeQuad.tr },
      br: { ...activeQuad.br },
      bl: { ...activeQuad.bl },
    });
    setInitialBoxRotationOnDrag(activeBoxRotation);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragMode === 'NONE' || !loadedSourceImage) return;

    const current = getEventPercent(e.clientX, e.clientY);
    const deltaX = current.x - dragStartPoint.x;
    const deltaY = current.y - dragStartPoint.y;
    const b = initialBoxOnDrag;
    const q = initialQuadOnDrag;

    // ── 4-Corner Perspective Dragging ─────────────────────────────────────────
    if (dragMode === 'DRAG_CORNER_TL') {
      setActiveQuad({
        ...q,
        tl: { x: Math.max(0, Math.min(98, q.tl.x + deltaX)), y: Math.max(0, Math.min(98, q.tl.y + deltaY)) },
      });
    } else if (dragMode === 'DRAG_CORNER_TR') {
      setActiveQuad({
        ...q,
        tr: { x: Math.max(2, Math.min(100, q.tr.x + deltaX)), y: Math.max(0, Math.min(98, q.tr.y + deltaY)) },
      });
    } else if (dragMode === 'DRAG_CORNER_BR') {
      setActiveQuad({
        ...q,
        br: { x: Math.max(2, Math.min(100, q.br.x + deltaX)), y: Math.max(2, Math.min(100, q.br.y + deltaY)) },
      });
    } else if (dragMode === 'DRAG_CORNER_BL') {
      setActiveQuad({
        ...q,
        bl: { x: Math.max(0, Math.min(98, q.bl.x + deltaX)), y: Math.max(2, Math.min(100, q.bl.y + deltaY)) },
      });
    } else if (dragMode === 'DRAG_EDGE_TOP') {
      setActiveQuad({
        ...q,
        tl: { ...q.tl, y: Math.max(0, Math.min(95, q.tl.y + deltaY)) },
        tr: { ...q.tr, y: Math.max(0, Math.min(95, q.tr.y + deltaY)) },
      });
    } else if (dragMode === 'DRAG_EDGE_BOTTOM') {
      setActiveQuad({
        ...q,
        bl: { ...q.bl, y: Math.max(5, Math.min(100, q.bl.y + deltaY)) },
        br: { ...q.br, y: Math.max(5, Math.min(100, q.br.y + deltaY)) },
      });
    } else if (dragMode === 'DRAG_EDGE_LEFT') {
      setActiveQuad({
        ...q,
        tl: { ...q.tl, x: Math.max(0, Math.min(95, q.tl.x + deltaX)) },
        bl: { ...q.bl, x: Math.max(0, Math.min(95, q.bl.x + deltaX)) },
      });
    } else if (dragMode === 'DRAG_EDGE_RIGHT') {
      setActiveQuad({
        ...q,
        tr: { ...q.tr, x: Math.max(5, Math.min(100, q.tr.x + deltaX)) },
        br: { ...q.br, x: Math.max(5, Math.min(100, q.br.x + deltaX)) },
      });
    } else if (dragMode === 'DRAG_MOVE_QUAD') {
      const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));
      setActiveQuad({
        tl: { x: clamp(q.tl.x + deltaX, 0, 100), y: clamp(q.tl.y + deltaY, 0, 100) },
        tr: { x: clamp(q.tr.x + deltaX, 0, 100), y: clamp(q.tr.y + deltaY, 0, 100) },
        br: { x: clamp(q.br.x + deltaX, 0, 100), y: clamp(q.br.y + deltaY, 0, 100) },
        bl: { x: clamp(q.bl.x + deltaX, 0, 100), y: clamp(q.bl.y + deltaY, 0, 100) },
      });
    }
    // ── Free Transform Box & Rotate Handle ────────────────────────────────────
    else if (dragMode === 'ROTATE_BOX_HANDLE') {
      const boxCenterX = b.x + b.w / 2;
      const boxCenterY = b.y + b.h / 2;
      const angleRad = Math.atan2(current.y - boxCenterY, current.x - boxCenterX);
      const angleDeg = Math.round((angleRad * 180) / Math.PI) + 90;
      setActiveBoxRotation((angleDeg + 360) % 360);
    } else if (dragMode === 'MOVE_BOX') {
      const newX = Math.max(0, Math.min(100 - b.w, b.x + deltaX));
      const newY = Math.max(0, Math.min(100 - b.h, b.y + deltaY));
      setActiveCropBox({ ...b, x: Math.round(newX), y: Math.round(newY) });
    } else if (dragMode === 'RESIZE_SE') {
      const newW = Math.max(5, Math.min(100 - b.x, b.w + deltaX));
      const newH = Math.max(5, Math.min(100 - b.y, b.h + deltaY));
      setActiveCropBox({ ...b, w: Math.round(newW), h: Math.round(newH) });
    } else if (dragMode === 'RESIZE_NW') {
      const newX = Math.max(0, Math.min(b.x + b.w - 5, b.x + deltaX));
      const newY = Math.max(0, Math.min(b.y + b.h - 5, b.y + deltaY));
      const newW = b.w + (b.x - newX);
      const newH = b.h + (b.y - newY);
      setActiveCropBox({ x: Math.round(newX), y: Math.round(newY), w: Math.round(newW), h: Math.round(newH) });
    } else if (dragMode === 'RESIZE_NE') {
      const newY = Math.max(0, Math.min(b.y + b.h - 5, b.y + deltaY));
      const newW = Math.max(5, Math.min(100 - b.x, b.w + deltaX));
      const newH = b.h + (b.y - newY);
      setActiveCropBox({ ...b, y: Math.round(newY), w: Math.round(newW), h: Math.round(newH) });
    } else if (dragMode === 'RESIZE_SW') {
      const newX = Math.max(0, Math.min(b.x + b.w - 5, b.x + deltaX));
      const newW = b.w + (b.x - newX);
      const newH = Math.max(5, Math.min(100 - b.y, b.h + deltaY));
      setActiveCropBox({ ...b, x: Math.round(newX), w: Math.round(newW), h: Math.round(newH) });
    } else if (dragMode === 'RESIZE_E') {
      const newW = Math.max(5, Math.min(100 - b.x, b.w + deltaX));
      setActiveCropBox({ ...b, w: Math.round(newW) });
    } else if (dragMode === 'RESIZE_W') {
      const newX = Math.max(0, Math.min(b.x + b.w - 5, b.x + deltaX));
      const newW = b.w + (b.x - newX);
      setActiveCropBox({ ...b, x: Math.round(newX), w: Math.round(newW) });
    } else if (dragMode === 'RESIZE_S') {
      const newH = Math.max(5, Math.min(100 - b.y, b.h + deltaY));
      setActiveCropBox({ ...b, h: Math.round(newH) });
    } else if (dragMode === 'RESIZE_N') {
      const newY = Math.max(0, Math.min(b.y + b.h - 5, b.y + deltaY));
      const newH = b.h + (b.y - newY);
      setActiveCropBox({ ...b, y: Math.round(newY), h: Math.round(newH) });
    }
  };

  const handleMouseUp = () => {
    setDragMode('NONE');
  };

  // ── True Source Image Buffer Rotation (Hardware-Accelerated Canvas) ─────────
  const rotateSourceImage = (angleDelta: 90 | -90) => {
    if (!loadedSourceImage) return;

    const offscreen = document.createElement('canvas');
    const srcW = loadedSourceImage.naturalWidth || loadedSourceImage.width;
    const srcH = loadedSourceImage.naturalHeight || loadedSourceImage.height;

    // Swap dimensions for 90° / -90° rotation
    offscreen.width = srcH;
    offscreen.height = srcW;

    const ctx = offscreen.getContext('2d');
    if (!ctx) return;

    ctx.translate(offscreen.width / 2, offscreen.height / 2);
    ctx.rotate((angleDelta * Math.PI) / 180);
    ctx.drawImage(loadedSourceImage, -srcW / 2, -srcH / 2, srcW, srcH);

    const newUrl = offscreen.toDataURL('image/jpeg', 0.95);
    setDocumentImageSrc(newUrl);

    const newImg = new Image();
    newImg.crossOrigin = 'anonymous';
    newImg.onload = () => {
      setLoadedSourceImage(newImg);
      if (activeCropTarget === 'FRONT') setFrontSourceImg(newImg);
      if (activeCropTarget === 'BACK') setBackSourceImg(newImg);
    };
    newImg.src = newUrl;

    // Reset rotationAngle to 0 since the image buffer itself is now rotated
    setRotationAngle(0);

    // Rotate activeQuad corners so they follow the rotated document
    if (angleDelta === 90) {
      setActiveQuad(q => ({
        tl: { x: Math.max(0, Math.min(100, Math.round(100 - q.bl.y))), y: Math.max(0, Math.min(100, Math.round(q.bl.x))) },
        tr: { x: Math.max(0, Math.min(100, Math.round(100 - q.tl.y))), y: Math.max(0, Math.min(100, Math.round(q.tl.x))) },
        br: { x: Math.max(0, Math.min(100, Math.round(100 - q.tr.y))), y: Math.max(0, Math.min(100, Math.round(q.tr.x))) },
        bl: { x: Math.max(0, Math.min(100, Math.round(100 - q.br.y))), y: Math.max(0, Math.min(100, Math.round(q.br.x))) },
      }));
      setActiveCropBox(b => ({
        x: Math.max(0, Math.min(100, Math.round(100 - (b.y + b.h)))),
        y: Math.max(0, Math.min(100, Math.round(b.x))),
        w: Math.round(b.h),
        h: Math.round(b.w),
      }));
    } else {
      setActiveQuad(q => ({
        tl: { x: Math.max(0, Math.min(100, Math.round(q.tr.y))), y: Math.max(0, Math.min(100, Math.round(100 - q.tr.x))) },
        tr: { x: Math.max(0, Math.min(100, Math.round(q.br.y))), y: Math.max(0, Math.min(100, Math.round(100 - q.br.x))) },
        br: { x: Math.max(0, Math.min(100, Math.round(q.bl.y))), y: Math.max(0, Math.min(100, Math.round(100 - q.bl.x))) },
        bl: { x: Math.max(0, Math.min(100, Math.round(q.tl.y))), y: Math.max(0, Math.min(100, Math.round(100 - q.tl.x))) },
      }));
      setActiveCropBox(b => ({
        x: Math.max(0, Math.min(100, Math.round(b.y))),
        y: Math.max(0, Math.min(100, Math.round(100 - (b.x + b.w)))),
        w: Math.round(b.h),
        h: Math.round(b.w),
      }));
    }
  };

  // ── Smart Scanner Action Helpers ────────────────────────────────────────────
  const handleAutoDetectEdges = () => {
    // Automatically snap to standard landscape card region with auto-straightening
    setActiveQuad({
      tl: { x: 3, y: 5 },
      tr: { x: 97, y: 5 },
      br: { x: 97, y: 95 },
      bl: { x: 3, y: 95 },
    });
    setActiveCropBox({ x: 3, y: 5, w: 94, h: 90 });
    setActiveBoxRotation(0);
  };

  const handleStraightenPerspective = () => {
    const q = activeQuad;
    const avgTop = (q.tl.y + q.tr.y) / 2;
    const avgBottom = (q.bl.y + q.br.y) / 2;
    const avgLeft = (q.tl.x + q.bl.x) / 2;
    const avgRight = (q.tr.x + q.br.x) / 2;

    setActiveQuad({
      tl: { x: avgLeft, y: avgTop },
      tr: { x: avgRight, y: avgTop },
      br: { x: avgRight, y: avgBottom },
      bl: { x: avgLeft, y: avgBottom },
    });
    setActiveBoxRotation(0);
  };

  const handleResetQuad = () => {
    setActiveQuad({
      tl: { x: 2, y: 2 },
      tr: { x: 98, y: 2 },
      br: { x: 98, y: 98 },
      bl: { x: 2, y: 98 },
    });
    setActiveCropBox({ x: 2, y: 2, w: 96, h: 96 });
    setActiveBoxRotation(0);
  };

  // Quick Snapping Helpers
  const handleFitCardHorizontal = () => {
    setPrintMode('PVC_CARD');
    setCustomPrice(100);
    setActiveQuad({
      tl: { x: 3, y: 5 },
      tr: { x: 97, y: 5 },
      br: { x: 97, y: 95 },
      bl: { x: 3, y: 95 },
    });
    setActiveCropBox({ x: 3, y: 5, w: 94, h: 90 });
    setActiveBoxRotation(0);
  };

  const handleFitCardVertical = () => {
    setPrintMode('PVC_CARD');
    setCustomPrice(100);
    setActiveQuad({
      tl: { x: 10, y: 2 },
      tr: { x: 90, y: 2 },
      br: { x: 90, y: 98 },
      bl: { x: 10, y: 98 },
    });
    setActiveCropBox({ x: 10, y: 2, w: 80, h: 96 });
    setActiveBoxRotation(0);
  };

  const handleSnapFront = () => {
    setPrintMode('PVC_CARD');
    setCustomPrice(100);
    setActiveQuad({
      tl: { x: 4, y: 55 },
      tr: { x: 49, y: 55 },
      br: { x: 49, y: 97 },
      bl: { x: 4, y: 97 },
    });
    setFrontCropBox({ x: 4, y: 55, w: 45, h: 42 });
    setActiveCropTarget('FRONT');
  };

  const handleSnapBack = () => {
    setPrintMode('PVC_CARD');
    setCustomPrice(100);
    setActiveQuad({
      tl: { x: 51, y: 55 },
      tr: { x: 96, y: 55 },
      br: { x: 96, y: 97 },
      bl: { x: 51, y: 97 },
    });
    setBackCropBox({ x: 51, y: 55, w: 45, h: 42 });
    setActiveCropTarget('BACK');
  };

  const handleAddFront = () => {
    setFrontQuad({ ...activeQuad });
    setFrontCropBox({ ...activeCropBox });
    setFrontBoxRotation(activeBoxRotation);
    setFrontSourceImg(loadedSourceImage);

    // Auto-advance to Back side so operator can immediately crop the back side
    setActiveCropTarget('BACK');
    if (activeMediaList.length > 1 && selectedMediaIndex === 0) {
      setSelectedMediaIndex(1);
      setSelectedDocMsg(activeMediaList[1]);
      if (activeMediaList[1].mediaUrl) {
        const isPdf = activeMediaList[1].mediaType === 'PDF' || activeMediaList[1].mediaUrl.toLowerCase().endsWith('.pdf');
        loadSourceFile(activeMediaList[1].mediaUrl, isPdf);
      }
    }
  };

  const handleAddBack = () => {
    setBackQuad({ ...activeQuad });
    setBackCropBox({ ...activeCropBox });
    setBackBoxRotation(activeBoxRotation);
    setBackSourceImg(loadedSourceImage);
  };

  const handleSnapPassport = () => {
    setPrintMode('PASSPORT_PHOTOS');
    setCustomPrice(50);
    setActiveQuad({
      tl: { x: 25, y: 15 },
      tr: { x: 75, y: 15 },
      br: { x: 75, y: 80 },
      bl: { x: 25, y: 80 },
    });
    setActiveCropBox({ x: 25, y: 15, w: 50, h: 65 });
  };

  const handleSnapFullPage = () => {
    setPrintMode('A4_FULL_PAGE');
    setCustomPrice(10);
    const fullQuad: QuadCorners = {
      tl: { x: 0, y: 0 },
      tr: { x: 100, y: 0 },
      br: { x: 100, y: 100 },
      bl: { x: 0, y: 100 },
    };
    setFrontQuad(fullQuad);
    setBackQuad(fullQuad);
    const fullBox: CropBox = { x: 0, y: 0, w: 100, h: 100 };
    setFrontCropBox(fullBox);
    setBackCropBox(fullBox);
  };

  // ── Hardware Accelerated 2D Affine Triangle & Perspective Mesh Engine ──────
  const drawAffineTriangle = (
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    x0: number, y0: number,
    x1: number, y1: number,
    x2: number, y2: number,
    u0: number, v0: number,
    u1: number, v1: number,
    u2: number, v2: number
  ) => {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.closePath();
    ctx.clip();

    const denom = (u0 * (v1 - v2) - u1 * v0 + u1 * v2 + u2 * v0 - u2 * v1);
    if (Math.abs(denom) > 0.0001) {
      const a = (x0 * (v1 - v2) - x1 * v0 + x1 * v2 + x2 * v0 - x2 * v1) / denom;
      const c = -(x0 * (u1 - u2) - x1 * u0 + x1 * u2 + x2 * u0 - x2 * u1) / denom;
      const e = (x0 * (u1 * v2 - u2 * v1) - x1 * (u0 * v2 - u2 * v0) + x2 * (u0 * v1 - u1 * v0)) / denom;

      const b = (y0 * (v1 - v2) - y1 * v0 + y1 * v2 + y2 * v0 - y2 * v1) / denom;
      const d = -(y0 * (u1 - u2) - y1 * u0 + y1 * u2 + y2 * u0 - y2 * u1) / denom;
      const f = (y0 * (u1 * v2 - u2 * v1) - y1 * (u0 * v2 - u2 * v0) + y2 * (u0 * v1 - u1 * v0)) / denom;

      ctx.transform(a, b, c, d, e, f);
      ctx.drawImage(img, 0, 0);
    }
    ctx.restore();
  };

  const renderPerspectiveMesh = (
    ctx: CanvasRenderingContext2D,
    sourceImg: HTMLImageElement,
    quad: QuadCorners,
    destW: number,
    destH: number
  ) => {
    const imgW = sourceImg.naturalWidth || sourceImg.width;
    const imgH = sourceImg.naturalHeight || sourceImg.height;

    const p0 = { x: (quad.tl.x / 100) * imgW, y: (quad.tl.y / 100) * imgH };
    const p1 = { x: (quad.tr.x / 100) * imgW, y: (quad.tr.y / 100) * imgH };
    const p2 = { x: (quad.br.x / 100) * imgW, y: (quad.br.y / 100) * imgH };
    const p3 = { x: (quad.bl.x / 100) * imgW, y: (quad.bl.y / 100) * imgH };

    const GRID = 16;
    for (let gy = 0; gy < GRID; gy++) {
      for (let gx = 0; gx < GRID; gx++) {
        const u0 = gx / GRID;
        const u1 = (gx + 1) / GRID;
        const v0 = gy / GRID;
        const v1 = (gy + 1) / GRID;

        const dx0 = u0 * destW;
        const dx1 = u1 * destW;
        const dy0 = v0 * destH;
        const dy1 = v1 * destH;

        const srcPt = (u: number, v: number) => {
          const topX = p0.x + u * (p1.x - p0.x);
          const topY = p0.y + u * (p1.y - p0.y);
          const botX = p3.x + u * (p2.x - p3.x);
          const botY = p3.y + u * (p2.y - p3.y);
          return {
            x: topX + v * (botX - topX),
            y: topY + v * (botY - topY)
          };
        };

        const s00 = srcPt(u0, v0);
        const s10 = srcPt(u1, v0);
        const s11 = srcPt(u1, v1);
        const s01 = srcPt(u0, v1);

        drawAffineTriangle(ctx, sourceImg, dx0, dy0, dx1, dy0, dx0, dy1, s00.x, s00.y, s10.x, s10.y, s01.x, s01.y);
        drawAffineTriangle(ctx, sourceImg, dx1, dy0, dx1, dy1, dx0, dy1, s10.x, s10.y, s11.x, s11.y, s01.x, s01.y);
      }
    }
  };

  // ── Real-Time Synchronized Render Pipeline ──────────────────────────────────
  const renderCardToCanvas = useCallback((
    canvas: HTMLCanvasElement,
    sourceImg: HTMLImageElement | null,
    box: CropBox,
    quad: QuadCorners,
    boxRotation: number,
    preserveNaturalAspect = false
  ) => {
    let targetW = 1012; // 300 DPI CR80 Width (85.6mm)
    let targetH = 638;  // 300 DPI CR80 Height (54mm)

    if (sourceImg && preserveNaturalAspect) {
      const imgW = sourceImg.naturalWidth || sourceImg.width;
      const imgH = sourceImg.naturalHeight || sourceImg.height;

      if (cropToolType === 'SCANNER_CORNER_PERSPECTIVE') {
        const topW = Math.hypot((quad.tr.x - quad.tl.x) * imgW / 100, (quad.tr.y - quad.tl.y) * imgH / 100);
        const botW = Math.hypot((quad.br.x - quad.bl.x) * imgW / 100, (quad.br.y - quad.bl.y) * imgH / 100);
        const leftH = Math.hypot((quad.bl.x - quad.tl.x) * imgW / 100, (quad.bl.y - quad.tl.y) * imgH / 100);
        const rightH = Math.hypot((quad.br.x - quad.tr.x) * imgW / 100, (quad.br.y - quad.tr.y) * imgH / 100);
        const avgW = Math.max(10, (topW + botW) / 2);
        const avgH = Math.max(10, (leftH + rightH) / 2);
        const aspect = avgW / avgH;
        targetW = 1200;
        targetH = Math.round(1200 / aspect);
      } else {
        const sw = Math.max(10, (box.w / 100) * imgW);
        const sh = Math.max(10, (box.h / 100) * imgH);
        const aspect = sw / sh;
        targetW = 1200;
        targetH = Math.round(1200 / aspect);
      }
    }

    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) ${
      filterMode === 'CLEAN_BW' ? 'grayscale(100%) contrast(150%)' :
      filterMode === 'DOC_WHITE' ? 'contrast(200%) brightness(120%)' :
      filterMode === 'VIBRANT' ? 'saturate(135%) contrast(110%)' : 'none'
    }`;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!sourceImg) return;

    if (cropToolType === 'SCANNER_CORNER_PERSPECTIVE') {
      // Perspective Mesh Unwarping (Removes all tilt, skew, and angles!)
      renderPerspectiveMesh(ctx, sourceImg, quad, canvas.width, canvas.height);
    } else {
      // Free Transform with Rotation Handle
      const imgW = sourceImg.naturalWidth || sourceImg.width;
      const imgH = sourceImg.naturalHeight || sourceImg.height;

      const sx = Math.max(0, (box.x / 100) * imgW);
      const sy = Math.max(0, (box.y / 100) * imgH);
      const sw = Math.max(10, Math.min(imgW - sx, (box.w / 100) * imgW));
      const sh = Math.max(10, Math.min(imgH - sy, (box.h / 100) * imgH));

      ctx.save();
      const totalRot = (rotationAngle + boxRotation) % 360;
      if (totalRot === 90 || totalRot === 270) {
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((totalRot * Math.PI) / 180);
        ctx.drawImage(sourceImg, sx, sy, sw, sh, -canvas.height / 2, -canvas.width / 2, canvas.height, canvas.width);
      } else if (totalRot === 180) {
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(Math.PI);
        ctx.drawImage(sourceImg, sx, sy, sw, sh, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
      } else {
        ctx.drawImage(sourceImg, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      }
      ctx.restore();
    }
  }, [brightness, contrast, filterMode, rotationAngle, cropToolType]);

  // ── High-Res Crop Snapshot Generator ────────────────────────────────────────
  const generateCurrentCropSnapshot = useCallback((): string => {
    if (!loadedSourceImage) return '';
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 1012; // 300 DPI CR80 (85.6mm)
    tempCanvas.height = 638; // 300 DPI CR80 (54mm)
    renderCardToCanvas(tempCanvas, loadedSourceImage, activeCropBox, activeQuad, activeBoxRotation);
    return tempCanvas.toDataURL('image/jpeg', 0.98);
  }, [loadedSourceImage, activeCropBox, activeQuad, activeBoxRotation, renderCardToCanvas]);

  const executeSaveFront = () => {
    const dataUrl = generateCurrentCropSnapshot();
    if (!dataUrl) return;
    const cropObj = {
      isSaved: true,
      dataUrl,
      label: activeJob?.fileName || 'Front Image',
    };
    setPvcFrontCrop({ isSaved: true, dataUrl });
    setCardTray((prev) =>
      prev.map((card) =>
        card.id === activeCardSlotId ? { ...card, frontCrop: cropObj } : card
      )
    );
    setConfirmReplaceSide(null);
    // STRICT RULE: Operator remains in 100% manual control (NO auto next file or auto switch)
  };

  const executeSaveBack = () => {
    const dataUrl = generateCurrentCropSnapshot();
    if (!dataUrl) return;
    const cropObj = {
      isSaved: true,
      dataUrl,
      label: activeJob?.fileName || 'Back Image',
    };
    setPvcBackCrop({ isSaved: true, dataUrl });
    setCardTray((prev) =>
      prev.map((card) =>
        card.id === activeCardSlotId ? { ...card, backCrop: cropObj } : card
      )
    );
    setConfirmReplaceSide(null);
    // STRICT RULE: Operator remains in 100% manual control (NO auto next file or auto switch)
  };

  const handleAddFrontClick = () => {
    if (pvcFrontCrop.isSaved) {
      setConfirmReplaceSide('FRONT');
    } else {
      executeSaveFront();
    }
  };

  const handleAddBackClick = () => {
    if (pvcBackCrop.isSaved) {
      setConfirmReplaceSide('BACK');
    } else {
      executeSaveBack();
    }
  };

  // Card Slot Management Handlers
  const handleAddCardSlot = () => {
    const newId = `card-${cardTray.length + 1}`;
    const newSlot = {
      id: newId,
      name: `PVC Card ${cardTray.length + 1}`,
      frontCrop: { isSaved: false, dataUrl: '', label: '' },
      backCrop: { isSaved: false, dataUrl: '', label: '' },
    };
    setCardTray((prev) => [...prev, newSlot]);
    setActiveCardSlotId(newId);
    setPvcFrontCrop({ isSaved: false, dataUrl: '' });
    setPvcBackCrop({ isSaved: false, dataUrl: '' });
  };

  const handleSelectCardSlot = (slotId: string) => {
    setActiveCardSlotId(slotId);
    const slot = cardTray.find((c) => c.id === slotId);
    if (slot) {
      setPvcFrontCrop({ isSaved: slot.frontCrop.isSaved, dataUrl: slot.frontCrop.dataUrl });
      setPvcBackCrop({ isSaved: slot.backCrop.isSaved, dataUrl: slot.backCrop.dataUrl });
    }
  };

  const handleRemoveFront = (slotId: string) => {
    setCardTray((prev) =>
      prev.map((card) =>
        card.id === slotId
          ? { ...card, frontCrop: { isSaved: false, dataUrl: '', label: '' } }
          : card
      )
    );
    if (activeCardSlotId === slotId) {
      setPvcFrontCrop({ isSaved: false, dataUrl: '' });
    }
  };

  const handleRemoveBack = (slotId: string) => {
    setCardTray((prev) =>
      prev.map((card) =>
        card.id === slotId
          ? { ...card, backCrop: { isSaved: false, dataUrl: '', label: '' } }
          : card
      )
    );
    if (activeCardSlotId === slotId) {
      setPvcBackCrop({ isSaved: false, dataUrl: '' });
    }
  };

  const handleClearCardSlot = (slotId: string) => {
    setCardTray((prev) =>
      prev.map((card) =>
        card.id === slotId
          ? {
              ...card,
              frontCrop: { isSaved: false, dataUrl: '', label: '' },
              backCrop: { isSaved: false, dataUrl: '', label: '' },
            }
          : card
      )
    );
    if (activeCardSlotId === slotId) {
      setPvcFrontCrop({ isSaved: false, dataUrl: '' });
      setPvcBackCrop({ isSaved: false, dataUrl: '' });
    }
  };

  const handleDeleteCardSlot = (slotId: string) => {
    if (cardTray.length <= 1) return;
    const remaining = cardTray.filter((c) => c.id !== slotId);
    setCardTray(remaining);
    setActiveCardSlotId(remaining[0].id);
    setPvcFrontCrop(remaining[0].frontCrop);
    setPvcBackCrop(remaining[0].backCrop);
  };

  const getCardSlotStatus = (card: {
    id: string;
    name: string;
    frontCrop: { isSaved: boolean; dataUrl: string };
    backCrop: { isSaved: boolean; dataUrl: string };
  }) => {
    const hasFront = Boolean(card.frontCrop?.isSaved && card.frontCrop?.dataUrl);
    const hasBack = Boolean(card.backCrop?.isSaved && card.backCrop?.dataUrl);

    if (hasFront && hasBack) {
      return {
        status: 'COMPLETE',
        text: '✓ Complete Card',
        badgeClass: 'bg-emerald-950 text-emerald-300 border-emerald-500/50',
      };
    }
    if (hasFront && !hasBack) {
      return {
        status: 'WAITING_BACK',
        text: 'Front Added (Waiting for Back)',
        badgeClass: 'bg-amber-950 text-amber-300 border-amber-500/50',
      };
    }
    if (!hasFront && hasBack) {
      return {
        status: 'WAITING_FRONT',
        text: 'Back Added (Waiting for Front)',
        badgeClass: 'bg-blue-950 text-blue-300 border-blue-500/50',
      };
    }
    return {
      status: 'EMPTY',
      text: 'Empty Card Slot',
      badgeClass: 'bg-gray-800 text-gray-400 border-gray-700',
    };
  };

  // Synchronously update Live Previews on every state change
  useEffect(() => {
    const updatePvcSheet = () => {
      if (pvcSheetPreviewCanvasRef.current && frontPreviewCanvasRef.current && backPreviewCanvasRef.current) {
        const sheetCanvas = pvcSheetPreviewCanvasRef.current;
        sheetCanvas.width = 2100;
        sheetCanvas.height = 750;
        const sCtx = sheetCanvas.getContext('2d');
        if (sCtx) {
          sCtx.fillStyle = '#ffffff';
          sCtx.fillRect(0, 0, sheetCanvas.width, sheetCanvas.height);

          // Draw Left = Front Card
          if (pvcFrontCrop.isSaved && pvcFrontCrop.dataUrl) {
            const fImg = new Image();
            fImg.src = pvcFrontCrop.dataUrl;
            if (fImg.complete) sCtx.drawImage(fImg, 25, 55, 1000, 630);
            else sCtx.drawImage(frontPreviewCanvasRef.current, 25, 55, 1000, 630);
          } else {
            sCtx.drawImage(frontPreviewCanvasRef.current, 25, 55, 1000, 630);
          }
          sCtx.strokeStyle = '#94a3b8';
          sCtx.lineWidth = 2;
          sCtx.setLineDash([8, 8]);
          sCtx.strokeRect(25, 55, 1000, 630);

          // Draw Right = Back Card
          if (pvcBackCrop.isSaved && pvcBackCrop.dataUrl) {
            const bImg = new Image();
            bImg.src = pvcBackCrop.dataUrl;
            if (bImg.complete) sCtx.drawImage(bImg, 1075, 55, 1000, 630);
            else sCtx.drawImage(backPreviewCanvasRef.current, 1075, 55, 1000, 630);
          } else {
            sCtx.drawImage(backPreviewCanvasRef.current, 1075, 55, 1000, 630);
          }
          sCtx.strokeRect(1075, 55, 1000, 630);
          sCtx.setLineDash([]);

          sCtx.fillStyle = '#64748b';
          sCtx.font = 'bold 13px sans-serif';
          sCtx.fillText('✂️ FRONT (CR80)', 890, 710);
          sCtx.fillText('✂️ BACK (CR80)', 1930, 710);
        }
      }
    };

    // 1. FRONT PREVIEW: Always displays saved pvcFrontCrop (locked), or live front crop
    if (frontPreviewCanvasRef.current) {
      const fCanvas = frontPreviewCanvasRef.current;
      fCanvas.width = 1012;
      fCanvas.height = 638;
      const fCtx = fCanvas.getContext('2d');
      if (fCtx) {
        if (pvcFrontCrop.isSaved && pvcFrontCrop.dataUrl) {
          // Locked Saved Front Card - Never overwritten by active crop or new image loads
          const img = new Image();
          img.onload = () => {
            fCtx.drawImage(img, 0, 0, fCanvas.width, fCanvas.height);
            updatePvcSheet();
          };
          img.src = pvcFrontCrop.dataUrl;
          if (img.complete) {
            fCtx.drawImage(img, 0, 0, fCanvas.width, fCanvas.height);
            updatePvcSheet();
          }
        } else if (activeCropTarget === 'FRONT' && loadedSourceImage) {
          renderCardToCanvas(fCanvas, loadedSourceImage, activeCropBox, activeQuad, activeBoxRotation);
          updatePvcSheet();
        } else if (frontSourceImg) {
          renderCardToCanvas(fCanvas, frontSourceImg, frontCropBox, frontQuad, frontBoxRotation);
          updatePvcSheet();
        } else {
          fCtx.fillStyle = '#f8fafc';
          fCtx.fillRect(0, 0, fCanvas.width, fCanvas.height);
          fCtx.strokeStyle = '#94a3b8';
          fCtx.lineWidth = 3;
          fCtx.setLineDash([8, 8]);
          fCtx.strokeRect(20, 20, fCanvas.width - 40, fCanvas.height - 40);
          fCtx.setLineDash([]);
          fCtx.fillStyle = '#64748b';
          fCtx.font = 'bold 30px sans-serif';
          fCtx.textAlign = 'center';
          fCtx.fillText('🪪 FRONT CARD PENDING', fCanvas.width / 2, fCanvas.height / 2 - 15);
          fCtx.font = '22px sans-serif';
          fCtx.fillText("Crop Image A & Click 'Add to PVC Front'", fCanvas.width / 2, fCanvas.height / 2 + 25);
          updatePvcSheet();
        }
      }
    }

    // 2. BACK PREVIEW: Always displays saved pvcBackCrop (locked), or live back crop
    if (backPreviewCanvasRef.current) {
      const bCanvas = backPreviewCanvasRef.current;
      bCanvas.width = 1012;
      bCanvas.height = 638;
      const bCtx = bCanvas.getContext('2d');
      if (bCtx) {
        if (pvcBackCrop.isSaved && pvcBackCrop.dataUrl) {
          // Locked Saved Back Card - Never overwritten by active crop or new image loads
          const img = new Image();
          img.onload = () => {
            bCtx.drawImage(img, 0, 0, bCanvas.width, bCanvas.height);
            updatePvcSheet();
          };
          img.src = pvcBackCrop.dataUrl;
          if (img.complete) {
            bCtx.drawImage(img, 0, 0, bCanvas.width, bCanvas.height);
            updatePvcSheet();
          }
        } else if (activeCropTarget === 'BACK' && loadedSourceImage) {
          renderCardToCanvas(bCanvas, loadedSourceImage, activeCropBox, activeQuad, activeBoxRotation);
          updatePvcSheet();
        } else if (backSourceImg) {
          renderCardToCanvas(bCanvas, backSourceImg, backCropBox, backQuad, backBoxRotation);
          updatePvcSheet();
        } else {
          bCtx.fillStyle = '#f8fafc';
          bCtx.fillRect(0, 0, bCanvas.width, bCanvas.height);
          bCtx.strokeStyle = '#94a3b8';
          bCtx.lineWidth = 3;
          bCtx.setLineDash([8, 8]);
          bCtx.strokeRect(20, 20, bCanvas.width - 40, bCanvas.height - 40);
          bCtx.setLineDash([]);
          bCtx.fillStyle = '#64748b';
          bCtx.font = 'bold 30px sans-serif';
          bCtx.textAlign = 'center';
          bCtx.fillText('🔄 BACK CARD PENDING', bCanvas.width / 2, bCanvas.height / 2 - 15);
          bCtx.font = '22px sans-serif';
          bCtx.fillText("Crop Image B & Click 'Add to PVC Back'", bCanvas.width / 2, bCanvas.height / 2 + 25);
          updatePvcSheet();
        }
      }
    }
    // 4. A4 Full Page Preview Canvas (Places CROPPED document onto standard A4 page)
    if (a4PreviewCanvasRef.current && loadedSourceImage) {
      const a4Canvas = a4PreviewCanvasRef.current;
      if (a4Orientation === 'LANDSCAPE') {
        a4Canvas.width = 1754; // A4 150 DPI
        a4Canvas.height = 1240;
      } else {
        a4Canvas.width = 1240; // A4 150 DPI
        a4Canvas.height = 1754;
      }

      const aCtx = a4Canvas.getContext('2d');
      if (aCtx) {
        // Crisp white A4 page background
        aCtx.fillStyle = '#ffffff';
        aCtx.fillRect(0, 0, a4Canvas.width, a4Canvas.height);

        // Draw standard page print boundary outline
        aCtx.strokeStyle = '#e2e8f0';
        aCtx.lineWidth = 2;
        aCtx.strokeRect(30, 30, a4Canvas.width - 60, a4Canvas.height - 60);

        // Render current crop with true natural aspect ratio (zero stretching)
        const croppedCanvas = document.createElement('canvas');
        renderCardToCanvas(croppedCanvas, loadedSourceImage, activeCropBox, activeQuad, activeBoxRotation, true);

        const cropAspect = croppedCanvas.width / Math.max(1, croppedCanvas.height);

        // Base width for card/doc on A4 (at 100% scale)
        let baseDocW = 505;
        if (cropAspect < 1.0) {
          baseDocW = 600; // Tall document / Aadhaar letter
        }

        if (a4LayoutStyle === 'DOUBLE_XEROX') {
          // Double Xerox Mode (Front on Top, Back on Bottom at true natural aspect)
          const maxAllowedW = a4Canvas.width - 100;
          const maxAllowedH = (a4Canvas.height - 200) / 2;
          let cardW = baseDocW * (a4ScalePercent / 100);
          let cardH = cardW / cropAspect;
          if (cardH > maxAllowedH) {
            cardH = maxAllowedH;
            cardW = cardH * cropAspect;
          }
          if (cardW > maxAllowedW) {
            cardW = maxAllowedW;
            cardH = cardW / cropAspect;
          }
          const frontX = (a4Canvas.width - cardW) / 2;
          const frontY = 80;

          // Draw Front
          if (pvcFrontCrop.isSaved && pvcFrontCrop.dataUrl) {
            const fImg = new Image();
            fImg.src = pvcFrontCrop.dataUrl;
            if (fImg.complete) aCtx.drawImage(fImg, frontX, frontY, cardW, cardH);
            else aCtx.drawImage(croppedCanvas, frontX, frontY, cardW, cardH);
          } else {
            aCtx.drawImage(croppedCanvas, frontX, frontY, cardW, cardH);
          }
          aCtx.strokeStyle = '#cbd5e1';
          aCtx.strokeRect(frontX, frontY, cardW, cardH);

          // Draw Back
          const backY = frontY + cardH + 50;
          if (pvcBackCrop.isSaved && pvcBackCrop.dataUrl) {
            const bImg = new Image();
            bImg.src = pvcBackCrop.dataUrl;
            if (bImg.complete) aCtx.drawImage(bImg, frontX, backY, cardW, cardH);
            else aCtx.drawImage(croppedCanvas, frontX, backY, cardW, cardH);
          } else {
            aCtx.drawImage(croppedCanvas, frontX, backY, cardW, cardH);
          }
          aCtx.strokeStyle = '#cbd5e1';
          aCtx.strokeRect(frontX, backY, cardW, cardH);

        } else if (a4LayoutStyle === 'CARD_TOP') {
          // Single Doc Top (Standard Xerox Position at true natural aspect)
          const maxAllowedW = a4Canvas.width - 80;
          const maxAllowedH = a4Canvas.height - 120;
          let cardW = baseDocW * (a4ScalePercent / 100);
          let cardH = cardW / cropAspect;
          if (cardH > maxAllowedH) {
            cardH = maxAllowedH;
            cardW = cardH * cropAspect;
          }
          if (cardW > maxAllowedW) {
            cardW = maxAllowedW;
            cardH = cardW / cropAspect;
          }
          const cx = (a4Canvas.width - cardW) / 2;
          const cy = 80;
          aCtx.drawImage(croppedCanvas, cx, cy, cardW, cardH);
          aCtx.strokeStyle = '#cbd5e1';
          aCtx.strokeRect(cx, cy, cardW, cardH);

        } else if (a4LayoutStyle === 'CARD_CENTER') {
          // Single Doc Centered on A4 Page at true natural aspect
          const maxAllowedW = a4Canvas.width - 80;
          const maxAllowedH = a4Canvas.height - 80;
          let cardW = baseDocW * (a4ScalePercent / 100);
          let cardH = cardW / cropAspect;
          if (cardH > maxAllowedH) {
            cardH = maxAllowedH;
            cardW = cardH * cropAspect;
          }
          if (cardW > maxAllowedW) {
            cardW = maxAllowedW;
            cardH = cardW / cropAspect;
          }
          const cx = (a4Canvas.width - cardW) / 2;
          const cy = (a4Canvas.height - cardH) / 2;
          aCtx.drawImage(croppedCanvas, cx, cy, cardW, cardH);
          aCtx.strokeStyle = '#cbd5e1';
          aCtx.strokeRect(cx, cy, cardW, cardH);

        } else {
          // AUTO_FIT / Full Page Fit (Scales to fill entire A4 sheet with margins)
          const margin = 40;
          const maxW = (a4Canvas.width - margin * 2) * (a4ScalePercent / 100);
          const maxH = (a4Canvas.height - margin * 2) * (a4ScalePercent / 100);
          const scale = Math.min(maxW / croppedCanvas.width, maxH / croppedCanvas.height);
          const dw = croppedCanvas.width * scale;
          const dh = croppedCanvas.height * scale;
          const dx = (a4Canvas.width - dw) / 2;
          const dy = (a4Canvas.height - dh) / 2;

          aCtx.drawImage(croppedCanvas, dx, dy, dw, dh);
        }
      }
    }
  }, [
    pvcFrontCrop, pvcBackCrop, activeCropTarget, loadedSourceImage,
    activeCropBox, activeQuad, activeBoxRotation, rotationAngle,
    a4Orientation, a4LayoutStyle, a4ScalePercent,
    brightness, contrast, filterMode, renderCardToCanvas
  ]);

  /**
   * Work Ownership Handlers (Start Work, Release Work, Print Ready)
   */
  const handleStartWork = () => {
    if (!activeJob) return;
    setLastActivityTime(Date.now());
    if (activeJob.order?.id) {
      updateStatusMutation.mutate(
        { id: activeJob.order.id, status: 'PRINTING', staffId: currentUser?.id },
        {
          onSuccess: () => {
            refetch();
            refetchOrders();
          },
        }
      );
    } else {
      createOrderMutation.mutate(
        {
          branchId: activeJob.branch?.id || branches?.[0]?.id,
          customerName: activeJob.customerName,
          customerPhone: activeJob.phone,
          source: 'WHATSAPP',
          documentUrl: selectedDocMsg?.mediaUrl || '/uploads/doc.pdf',
          documentName: activeJob.fileName,
          pageCount: 1,
          copies: 1,
          colorMode: 'COLOR',
          totalAmount: customPrice,
          assignedStaffId: currentUser?.id,
          notes: `In Progress · Started by: ${operatorName}`,
        },
        {
          onSuccess: (newOrd) => {
            updateStatusMutation.mutate(
              { id: newOrd.id, status: 'PRINTING', staffId: currentUser?.id },
              {
                onSuccess: () => {
                  refetch();
                  refetchOrders();
                },
              }
            );
          },
        }
      );
    }
  };

  const handleReleaseWork = () => {
    if (!activeJob?.order?.id) return;
    setLastActivityTime(Date.now());
    updateStatusMutation.mutate(
      { id: activeJob.order.id, status: 'PENDING', staffId: null },
      {
        onSuccess: () => {
          refetch();
          refetchOrders();
        },
      }
    );
  };

  const handleMarkPrintReady = () => {
    if (!activeJob?.order?.id) return;
    setLastActivityTime(Date.now());
    updateStatusMutation.mutate(
      { id: activeJob.order.id, status: 'READY_FOR_DELIVERY', staffId: currentUser?.id },
      {
        onSuccess: () => {
          refetch();
          refetchOrders();
        },
      }
    );
  };

  const handlePrintVerifiedSuccess = () => {
    setShowPrintVerificationModal(false);
    if (activeJob?.order?.id) {
      updateStatusMutation.mutate(
        { id: activeJob.order.id, status: 'DELIVERED', staffId: currentUser?.id },
        {
          onSuccess: () => {
            refetch();
            refetchOrders();
          },
        }
      );
    }
  };

  const handlePrintFailed = () => {
    setShowPrintVerificationModal(false);
    if (activeJob?.order?.id) {
      updateStatusMutation.mutate(
        { id: activeJob.order.id, status: 'PRINTING', staffId: currentUser?.id },
        {
          onSuccess: () => {
            refetch();
            refetchOrders();
          },
        }
      );
    }
  };

  const handleRetryPrint = () => {
    if (!lastPrintedDocInfo?.printDataUrl) return;
    const printWin = window.open('', '_blank', 'width=980,height=780');
    if (!printWin) return;
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>SVV Print Desk - ${lastPrintedDocInfo.tokenNumber || 'Document'}</title>
          <style>${lastPrintedDocInfo.pageCss || ''}</style>
        </head>
        <body>
          <img src="${lastPrintedDocInfo.printDataUrl}" onload="window.focus(); window.print();" />
        </body>
      </html>
    `);
    printWin.document.close();
  };

  /**
   * Universal 1-Click Print Engine (Handles Multi-Page PDF, A4 Full Page, vs PVC Plastic Card)
   */
  const handle1ClickPrint = () => {
    if (!documentImageSrc && !loadedSourceImage) {
      alert('Please select or upload a document before printing.');
      return;
    }

    // ── Multi-Page PDF Printing ──────────────────────────────────────────────
    if (isPdfDocument && pdfPagesList.length > 0) {
      const pagesToPrint = (
        pdfPrintOption === 'CURRENT'
          ? [pdfPagesList.find((p) => p.pageNum === currentPdfPage) || { dataUrl: documentImageSrc, pageNum: currentPdfPage }]
          : pdfPrintOption === 'SELECTED'
          ? pdfPagesList.filter((p) => selectedPdfPages.includes(p.pageNum))
          : pdfPagesList
      ).filter((p) => p && p.dataUrl);

      if (pagesToPrint.length === 0) {
        pagesToPrint.push({ dataUrl: documentImageSrc, pageNum: currentPdfPage, img: loadedSourceImage!, width: 1240, height: 1754 });
      }

      // Save/Update Order in Progress
      if (activeJob) {
        if (!activeJob.order) {
          createOrderMutation.mutate({
            branchId: activeJob.branch?.id || branches?.[0]?.id,
            customerName: activeJob.customerName,
            customerPhone: activeJob.phone,
            source: 'WHATSAPP',
            documentUrl: selectedDocMsg?.mediaUrl || '/uploads/doc.pdf',
            documentName: activeJob.fileName,
            pageCount: pagesToPrint.length,
            copies: printCopies,
            colorMode: printColorMode,
            paperSize: 'A4 Paper',
            totalAmount: customPrice * pagesToPrint.length * printCopies,
            assignedStaffId: currentUser?.id,
            notes: `PDF Document (${pagesToPrint.length} Pages printed) · ${activeJob.fileName} · Served By: ${operatorName}`,
          }, {
            onSuccess: () => {
              refetch();
              refetchOrders();
            }
          });
        }
      }

      const printWin = window.open('', '_blank', 'width=980,height=780');
      if (printWin) {
        printWin.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>SVV Print Desk - ${activeJob?.tokenNumber || 'Document'}</title>
              <style>
                @page { size: A4 ${a4Orientation.toLowerCase()}; margin: 5mm; }
                body { margin: 0; padding: 0; background: #fff; }
                .pdf-print-page { 
                  page-break-after: always; 
                  display: flex; 
                  align-items: center; 
                  justify-content: center; 
                  width: 100%; 
                  height: 98vh; 
                  box-sizing: border-box;
                }
                .pdf-print-page:last-child { page-break-after: avoid; }
                img { width: 100%; height: auto; max-height: 98vh; object-fit: contain; }
              </style>
            </head>
            <body>
              ${pagesToPrint.map((p) => `<div class="pdf-print-page"><img src="${p.dataUrl}" /></div>`).join('')}
              <script>window.onload = function() { window.focus(); window.print(); };</script>
            </body>
          </html>
        `);
        printWin.document.close();
      }
      return;
    }

    let printDataUrl = '';
    let pageCss = '';

    if (printMode === 'A4_FULL_PAGE') {
      // Print Single Full A4 Page
      printDataUrl = a4PreviewCanvasRef.current ? a4PreviewCanvasRef.current.toDataURL('image/png') : documentImageSrc;
      pageCss = `@page { size: A4 ${a4Orientation.toLowerCase()}; margin: 5mm; } body { margin: 0; padding: 0; display: flex; align-items: center; justify-content: center; background: #fff; } img { width: 100%; height: auto; max-height: 98vh; object-fit: contain; }`;
    } else {
      // Print PVC 2-Sided Sheet
      printDataUrl = pvcSheetPreviewCanvasRef.current ? pvcSheetPreviewCanvasRef.current.toDataURL('image/png') : '';
      pageCss = `@page { size: A4 landscape; margin: 5mm; } body { margin: 0; padding: 10px; display: flex; align-items: center; justify-content: center; background: #fff; } img { max-width: 100%; max-height: 98vh; object-fit: contain; }`;
    }

    if (!printDataUrl) return;

    // Save/Update Order in Progress
    if (activeJob) {
      if (!activeJob.order) {
        createOrderMutation.mutate({
          branchId: activeJob.branch?.id || branches?.[0]?.id,
          customerName: activeJob.customerName,
          customerPhone: activeJob.phone,
          source: 'WHATSAPP',
          documentUrl: selectedDocMsg?.mediaUrl || '/uploads/doc.pdf',
          documentName: activeJob.fileName,
          pageCount: 1,
          copies: 1,
          colorMode: 'COLOR',
          doubleSided: printMode === 'PVC_CARD',
          paperSize: printMode === 'A4_FULL_PAGE' ? 'A4 Paper' : 'PVC Plastic (CR80)',
          totalAmount: customPrice,
          assignedStaffId: currentUser?.id,
          notes: `${printMode === 'A4_FULL_PAGE' ? 'A4 Full Page Document' : 'PVC Smart Card'}: ${activeJob.fileName} · Served By: ${operatorName}`,
        }, {
          onSuccess: () => {
            refetch();
            refetchOrders();
          }
        });
      }
    }

    // Save info for Print Verification Modal
    setLastPrintedDocInfo({
      title: activeJob?.fileName || 'Document',
      tokenNumber: activeJob?.tokenNumber || '',
      printDataUrl,
      pageCss,
    });

    const printWin = window.open('', '_blank', 'width=980,height=780');
    if (printWin) {
      printWin.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>SVV Print Desk - ${activeJob?.tokenNumber || 'Document'}</title>
            <style>
              ${pageCss}
            </style>
          </head>
          <body>
            <img src="${printDataUrl}" onload="window.focus(); window.print();" />
          </body>
        </html>
      `);
      printWin.document.close();
    }
  };

  const handleOpenPrintConfirmation = () => {
    setShowPrintConfirmModal(true);
  };

  const handleExecutePrintWorkflow = () => {
    setShowPrintConfirmModal(false);
    handle1ClickPrint();
    setShowCompletedModal(true);
  };

  const handleSaveWorkspaceState = () => {
    if (activeCropTarget === 'FRONT') {
      handleAddFrontClick();
    } else {
      handleAddBackClick();
    }
  };

  return (
    <div className="h-[94vh] flex flex-col bg-[#F8FAFC] text-[#081B3A] font-sans overflow-hidden select-none">
      <canvas ref={hiddenPdfCanvasRef} className="hidden" />
      <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleLocalFileUpload} />

      {/* ── TOP HEADER BAR (Dark Navy #081B3A Master Theme) ────────────────── */}
      <div className="h-12 bg-[#081B3A] px-4 flex items-center justify-between shrink-0 shadow-xs text-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#0D6EFD] text-white flex items-center justify-center font-bold shadow-xs">
            <Crop className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white tracking-tight">Stage 2: Editor Workspace</span>
              <span className="text-[10px] px-2 py-0.2 rounded-full bg-[#198754] text-white font-bold">
                Live Single-Screen
              </span>
            </div>
          </div>
        </div>

        {/* Center: Mode Switcher Tabs (PVC Mode vs A4 Layout vs Passport) */}
        <div className="flex items-center gap-1 bg-[#0f2952] p-1 rounded-xl border border-[#1e40af]">
          <button
            onClick={() => handleSetPrintMode('PVC_CARD')}
            className={`px-3.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              printMode === 'PVC_CARD' ? 'bg-[#0D6EFD] text-white shadow-xs' : 'text-[#CBD5E1] hover:text-white'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" /> 🪪 PVC Mode
          </button>
          <button
            onClick={() => handleSetPrintMode('A4_FULL_PAGE')}
            className={`px-3.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              printMode === 'A4_FULL_PAGE' ? 'bg-[#6F42C1] text-white shadow-xs' : 'text-[#CBD5E1] hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> 📄 A4 Layout Mode
          </button>
          <button
            onClick={() => handleSetPrintMode('PASSPORT_PHOTOS')}
            className={`px-3.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              printMode === 'PASSPORT_PHOTOS' ? 'bg-[#FD7E14] text-white shadow-xs' : 'text-[#CBD5E1] hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" /> 📷 Passport Mode
          </button>
        </div>

        {/* Top Right: Active Ticket & Back to Queue */}
        <div className="flex items-center gap-2">
          {activeJob && (
            <div className="flex items-center gap-2 bg-[#0f2952] px-3 py-1 rounded-xl border border-[#1e40af] text-xs">
              <span className="font-mono font-bold text-[#0D6EFD] bg-white px-2 py-0.5 rounded-md">
                {activeJob.tokenNumber}
              </span>
              <span className="font-bold text-white truncate max-w-[130px]">{activeJob.customerName}</span>
              <button
                type="button"
                onClick={() => handleCopy(activeJob.customerName, 'NAME', `tb-name-${activeJob.id}`)}
                className="p-1 rounded text-[#CBD5E1] hover:text-white hover:bg-[#1e40af] cursor-pointer"
                title="Copy Customer Name"
              >
                {copiedKey === `tb-name-${activeJob.id}` ? (
                  <Check className="w-3 h-3 text-[#86EFAC]" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
              <span className="text-[10px] text-[#86EFAC] font-mono">🟢 {formatDisplayPhone(activeJob.phone)}</span>
              <button
                type="button"
                onClick={() => handleCopy(activeJob.phone, 'PHONE', `tb-phone-${activeJob.id}`)}
                className="p-1 rounded text-[#CBD5E1] hover:text-white hover:bg-[#1e40af] cursor-pointer"
                title="Copy Mobile Number"
              >
                {copiedKey === `tb-phone-${activeJob.id}` ? (
                  <Check className="w-3 h-3 text-[#86EFAC]" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          )}

          <Button
            size="sm"
            onClick={() => setShowGatewayModal(true)}
            className="h-8 text-xs font-bold bg-[#198754] hover:bg-[#157347] text-white border border-[#157347] cursor-pointer rounded-xl flex items-center gap-1.5"
            title="Scan QR Code to link WhatsApp"
          >
            <Smartphone className="w-3.5 h-3.5" /> 📱 Link WhatsApp
          </Button>

          <Button
            size="sm"
            onClick={() => {
              window.location.href = '/print-hub/queue';
            }}
            className="h-8 text-xs font-bold bg-[#0f2952] hover:bg-[#1e40af] text-white border border-[#1e40af] cursor-pointer rounded-xl"
          >
            ← Ticket Queue
          </Button>
        </div>
      </div>

      {/* ── MAIN 3-PANEL UNIFIED EDITOR WORKSPACE ────────────────────────────── */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden bg-[#F8FAFC] divide-x divide-[#E2E8F0]">
        
        {/* ── LEFT PANEL: FILE LIST & FRONT/BACK SELECTION (3 cols) ──────────── */}
        <div className="col-span-12 md:col-span-3 bg-[#F8FAFC] flex flex-col justify-between overflow-hidden">
          <div className="p-3 border-b border-[#E2E8F0] bg-[#FFFFFF] flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-[#081B3A] uppercase tracking-wider block">
                Customer Files ({activeMediaList.length || 1})
              </span>
              <button
                type="button"
                onClick={() => setShowChatModal(true)}
                className="text-[10px] text-[#198754] hover:underline font-mono font-semibold flex items-center gap-1 cursor-pointer"
                title="Open WhatsApp In-App Live Chat"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#198754] animate-pulse"></span>
                <span>🟢 WhatsApp Chat</span>
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowChatModal(true)}
                className="px-2 py-1 rounded-lg bg-[#F0FDF4] hover:bg-[#DCFCE7] text-[#198754] border border-[#BBF7D0] flex items-center gap-1 font-bold text-xs cursor-pointer shadow-2xs"
                title="Chat with Customer on WhatsApp"
              >
                <MessageSquare className="w-3 h-3" /> Chat
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-2 py-1 rounded-lg bg-[#E7F1FF] hover:bg-[#DBEAFE] text-[#0D6EFD] flex items-center gap-1 font-bold text-xs cursor-pointer"
                title="Add File"
              >
                <Upload className="w-3 h-3" /> + Upload
              </button>
            </div>
          </div>

          {/* Files List Strip */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
            {activeMediaList.length === 0 ? (
              <div
                onClick={() => setSelectedMediaIndex(0)}
                className="p-2.5 rounded-2xl bg-[#E7F1FF] border border-[#0D6EFD] flex items-center gap-2.5 cursor-pointer shadow-2xs"
              >
                <div className="w-12 h-12 rounded-xl bg-[#FFFFFF] overflow-hidden shrink-0 border border-[#CBD5E1] flex items-center justify-center">
                  {documentImageSrc ? (
                    <img src={documentImageSrc} alt="thumb" className="w-full h-full object-cover" />
                  ) : (
                    <FileText className="w-5 h-5 text-[#9CA3AF]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-[#081B3A] truncate">{activeJob?.fileName || 'Document.jpg'}</p>
                  <p className="text-[10px] text-[#6B7280] font-mono">Image • 2.6 MB</p>
                </div>
                <CheckCircle2 className="w-4 h-4 text-[#198754] shrink-0" />
              </div>
            ) : (
              activeMediaList.map((m, idx) => {
                const isCur = selectedMediaIndex === idx;
                let cleanName = m.messageBody || '';
                if (cleanName.startsWith('Please print photo:') || cleanName.startsWith('Please print document:') || cleanName.startsWith('Please print')) {
                  cleanName = cleanName.replace(/^Please print (photo|document):\s*/i, '').replace(/^Please print\s*/i, '').trim();
                }
                if (cleanName.includes('/')) cleanName = cleanName.split('/').pop() || cleanName;
                if (!cleanName || cleanName.length > 25) {
                  cleanName = m.mediaType === 'PDF' ? `Document_${idx + 1}.pdf` : `Image_${idx + 1}.jpg`;
                }

                const roleTitle = idx === 0 ? '🪪 Doc 1 (Front)' : idx === 1 ? '🔄 Doc 2 (Back)' : `📄 Doc ${idx + 1}`;

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setSelectedMediaIndex(idx);
                      setSelectedDocMsg(m);
                      if (idx === 0) {
                        setActiveCropTarget('FRONT');
                      } else {
                        setActiveCropTarget('BACK');
                      }
                      if (m.mediaUrl) {
                        const isPdf = m.mediaType === 'PDF' || m.mediaUrl.toLowerCase().endsWith('.pdf');
                        loadSourceFile(m.mediaUrl, isPdf);
                      }
                    }}
                    className={`p-2.5 rounded-2xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                      isCur
                        ? 'bg-[#E7F1FF] border-[#0D6EFD] shadow-xs ring-2 ring-[#0D6EFD]/25'
                        : 'bg-[#FFFFFF] border-[#E2E8F0] hover:border-[#CBD5E1]'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#F8FAFC] overflow-hidden shrink-0 border border-[#CBD5E1] flex items-center justify-center">
                      {m.mediaType === 'IMAGE' ? (
                        <img src={m.mediaUrl} alt="thumb" className="w-full h-full object-cover" />
                      ) : (
                        <FileText className="w-6 h-6 text-[#FD7E14]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[#081B3A] truncate">
                        <span className={idx === 0 ? 'text-[#198754]' : idx === 1 ? 'text-[#0D6EFD]' : 'text-[#081B3A]'}>
                          {roleTitle}
                        </span>
                        <span className="text-[#6B7280] text-[11px] font-normal ml-1">• {cleanName}</span>
                      </p>
                      <p className="text-[10px] text-[#6B7280] font-mono flex items-center gap-1.5 mt-0.5">
                        <span className={`px-1.5 py-0.2 rounded font-bold text-[9px] ${
                          idx === 0 ? 'bg-[#E8F5E9] text-[#198754]' :
                          idx === 1 ? 'bg-[#E7F1FF] text-[#0D6EFD]' :
                          'bg-[#F1F5F9] text-[#6B7280]'
                        }`}>
                          #{idx + 1}
                        </span>
                        <span>{m.mediaType === 'PDF' ? 'PDF Doc' : 'Image'}</span>
                      </p>
                    </div>
                    <CheckCircle2 className={`w-4 h-4 shrink-0 ${isCur ? 'text-[#198754]' : 'text-[#CBD5E1]'}`} />
                  </div>
                );
              })
            )}

            {/* PVC Card Tray Slots */}
            {printMode === 'PVC_CARD' && (
              <div className="mt-3 bg-[#FFFFFF] p-3 rounded-2xl border border-[#CBD5E1] space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#081B3A] uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#0D6EFD]" /> Card Tray ({cardTray.length})
                  </span>
                  <button
                    onClick={handleAddCardSlot}
                    className="px-2 py-0.5 rounded-lg bg-[#E7F1FF] hover:bg-[#DBEAFE] text-[#0D6EFD] font-bold text-[10px] cursor-pointer"
                  >
                    + New Slot
                  </button>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                  {cardTray.map((card) => {
                    const isCur = card.id === activeCardSlotId;
                    const cardInfo = getCardSlotStatus(card);
                    return (
                      <button
                        key={card.id}
                        onClick={() => handleSelectCardSlot(card.id)}
                        className={`px-2.5 py-1.5 rounded-xl border text-[10px] font-bold shrink-0 transition-all cursor-pointer ${
                          isCur
                            ? 'bg-[#E7F1FF] border-[#0D6EFD] text-[#0D6EFD] shadow-2xs ring-1 ring-[#0D6EFD]/30'
                            : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#6B7280]'
                        }`}
                      >
                        <div>{card.name}</div>
                        <span className={`text-[8px] font-mono px-1 py-0.2 rounded ${cardInfo.badgeClass}`}>
                          {cardInfo.text}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Left Footer: Ticket Metadata */}
          <div className="p-3 border-t border-[#E2E8F0] bg-[#FFFFFF] space-y-1 text-xs">
            <div className="flex items-center justify-between text-[#6B7280]">
              <span>Customer:</span>
              <strong className="text-[#081B3A] font-bold">{activeJob?.customerName || 'Walk-in'}</strong>
            </div>
            <div className="flex items-center justify-between text-[#6B7280]">
              <span>Staff:</span>
              <strong className="text-[#0D6EFD] font-bold">{operatorName}</strong>
            </div>
          </div>
        </div>

        {/* ── CENTER PANEL: MAIN EDITING CANVAS WITH INTEGRATED CROP TOOLS (5 cols) ── */}
        <div
          className="col-span-12 md:col-span-5 flex flex-col justify-between overflow-hidden relative bg-[#F1F5F9]"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          {/* Integrated Top Workspace Toolbar */}
          <div className="h-11 bg-[#FFFFFF] border-b border-[#E2E8F0] px-3 flex items-center justify-between text-xs shrink-0 shadow-2xs">
            {/* Front / Back Switcher OR PDF Page Controls */}
            {isPdfDocument ? (
              <div className="flex items-center gap-2 bg-[#F8FAFC] px-2 py-1 rounded-xl border border-[#CBD5E1]">
                <button
                  disabled={currentPdfPage <= 1}
                  onClick={() => handleSelectPdfPage(currentPdfPage - 1)}
                  className="px-2 py-0.5 rounded-lg bg-[#FFFFFF] border border-[#CBD5E1] text-[#081B3A] font-bold text-xs disabled:opacity-30 hover:bg-[#E2E8F0] cursor-pointer"
                  title="Previous Page"
                >
                  ◀ Prev
                </button>
                <span className="font-mono text-xs font-bold text-[#0D6EFD] px-1">
                  📄 Page {currentPdfPage} of {pdfPageCount}
                </span>
                <button
                  disabled={currentPdfPage >= pdfPageCount}
                  onClick={() => handleSelectPdfPage(currentPdfPage + 1)}
                  className="px-2 py-0.5 rounded-lg bg-[#FFFFFF] border border-[#CBD5E1] text-[#081B3A] font-bold text-xs disabled:opacity-30 hover:bg-[#E2E8F0] cursor-pointer"
                  title="Next Page"
                >
                  Next ▶
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 bg-[#F1F5F9] p-0.5 rounded-xl border border-[#E2E8F0]">
                <button
                  onClick={() => {
                    setActiveCropTarget('FRONT');
                    setSelectedMediaIndex(0);
                    if (frontSourceImg) {
                      setLoadedSourceImage(frontSourceImg);
                    } else if (activeMediaList[0]?.mediaUrl) {
                      const isPdf = activeMediaList[0].mediaType === 'PDF' || activeMediaList[0].mediaUrl.toLowerCase().endsWith('.pdf');
                      loadSourceFile(activeMediaList[0].mediaUrl, isPdf);
                    }
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeCropTarget === 'FRONT' ? 'bg-[#198754] text-white shadow-2xs' : 'text-[#495057] hover:text-[#081B3A]'
                  }`}
                >
                  🪪 Front Side
                </button>
                <button
                  onClick={() => {
                    setActiveCropTarget('BACK');
                    if (activeMediaList.length > 1) setSelectedMediaIndex(1);
                    if (backSourceImg) {
                      setLoadedSourceImage(backSourceImg);
                    } else if (activeMediaList[1]?.mediaUrl) {
                      const isPdf = activeMediaList[1].mediaType === 'PDF' || activeMediaList[1].mediaUrl.toLowerCase().endsWith('.pdf');
                      loadSourceFile(activeMediaList[1].mediaUrl, isPdf);
                    }
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeCropTarget === 'BACK' ? 'bg-[#0D6EFD] text-white shadow-2xs' : 'text-[#495057] hover:text-[#081B3A]'
                  }`}
                >
                  🔄 Back Side
                </button>
              </div>
            )}

            {/* Editing Tools Controls */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCropToolType('SCANNER_CORNER_PERSPECTIVE')}
                className={`px-2 py-1 rounded-lg font-bold text-xs flex items-center gap-1 cursor-pointer ${
                  cropToolType === 'SCANNER_CORNER_PERSPECTIVE' ? 'bg-[#0D6EFD] text-white shadow-2xs' : 'bg-[#F8FAFC] text-[#495057] border border-[#E2E8F0]'
                }`}
                title="4-Corner Scanner Perspective"
              >
                <Sliders className="w-3 h-3" /> 4-Corner
              </button>

              <button
                onClick={() => setCropToolType('FREE_TRANSFORM')}
                className={`px-2 py-1 rounded-lg font-bold text-xs flex items-center gap-1 cursor-pointer ${
                  cropToolType === 'FREE_TRANSFORM' ? 'bg-[#0D6EFD] text-white shadow-2xs' : 'bg-[#F8FAFC] text-[#495057] border border-[#E2E8F0]'
                }`}
                title="Free Transform Crop"
              >
                <Crop className="w-3 h-3" /> Free Crop
              </button>

              <button
                onClick={handleAutoDetectEdges}
                className="px-2 py-1 rounded-lg bg-[#E8F5E9] hover:bg-[#DCFCE7] text-[#198754] font-bold text-xs border border-[#86EFAC] flex items-center gap-1 cursor-pointer"
                title="Auto Detect Document Card"
              >
                <Sparkles className="w-3 h-3" /> Auto Detect
              </button>

              <button
                onClick={() => rotateSourceImage(90)}
                className="px-2 py-1 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#495057] font-bold text-xs border border-[#E2E8F0] flex items-center gap-1 cursor-pointer"
                title="Rotate 90°"
              >
                <RotateCw className="w-3 h-3 text-[#0D6EFD]" /> 90°
              </button>

              <button
                onClick={handleResetQuad}
                className="p-1.5 rounded-lg bg-[#FFF4EC] hover:bg-[#FED7AA] text-[#EA580C] border border-[#FDBA74] cursor-pointer"
                title="Reset Crop"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Interactive Canvas Viewport */}
          <div className="flex-1 flex items-center justify-center overflow-hidden p-4 relative select-none">
            {isOfficeDocument && officeDocInfo ? (
              <div className="w-full h-full bg-[#FFFFFF] rounded-2xl border border-[#CBD5E1] shadow-md overflow-hidden flex flex-col">
                <WordDocumentViewer
                  url={officeDocInfo.url}
                  documentName={officeDocInfo.name}
                  onPageCountChange={(cnt) => setPdfPageCount(cnt)}
                  onPrint={() => handle1ClickPrint()}
                />
              </div>
            ) : (
              <div
                ref={modalWorkspaceContainerRef}
                style={{ transform: `scale(${zoomScale})`, transition: 'transform 0.1s ease-out' }}
                className="relative max-w-[94%] max-h-[88%] bg-[#FFFFFF] shadow-lg rounded-2xl border border-[#CBD5E1] p-1.5 flex items-center justify-center"
              >
                {fileLoadError ? (
                  <div className="p-8 flex flex-col items-center justify-center text-center space-y-3 max-w-sm">
                    <AlertCircle className="w-10 h-10 text-[#EA580C]" />
                    <p className="text-xs font-bold text-[#081B3A]">{fileLoadError}</p>
                    {selectedDocMsg?.mediaUrl && (
                      <a
                        href={`http://localhost:4000${selectedDocMsg.mediaUrl.startsWith('/') ? selectedDocMsg.mediaUrl : `/${selectedDocMsg.mediaUrl}`}`}
                        target="_blank"
                        rel="noreferrer"
                        download
                        className="px-3 py-1.5 rounded-xl bg-[#0D6EFD] hover:bg-[#0b5ed7] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Download className="w-3.5 h-3.5" /> Open Original File
                      </a>
                    )}
                  </div>
                ) : documentImageSrc ? (
                  <img
                    src={documentImageSrc}
                    alt="Document"
                    className="max-h-[460px] max-w-full object-contain pointer-events-none select-none block rounded-xl"
                  />
                ) : (
                  <div className="text-[#6B7280] p-8 text-xs">No document loaded</div>
                )}

              {/* ── INTERACTIVE 4-CORNER / PERSPECTIVE MASK ── */}
              {loadedSourceImage && cropToolType === 'SCANNER_CORNER_PERSPECTIVE' && (
                <div className="absolute inset-0 pointer-events-none z-20">
                  <svg className="w-full h-full absolute inset-0 overflow-visible pointer-events-none">
                    <defs>
                      <mask id="smart-crop-mask-unified">
                        <rect width="100%" height="100%" fill="white" />
                        <polygon
                          points={`
                            ${activeQuad.tl.x}%,${activeQuad.tl.y}%
                            ${activeQuad.tr.x}%,${activeQuad.tr.y}%
                            ${activeQuad.br.x}%,${activeQuad.br.y}%
                            ${activeQuad.bl.x}%,${activeQuad.bl.y}%
                          `}
                          fill="black"
                        />
                      </mask>
                    </defs>

                    {/* Dark transparent overlay OUTSIDE crop */}
                    <rect width="100%" height="100%" fill="rgba(0, 0, 0, 0.40)" mask="url(#smart-crop-mask-unified)" />

                    {/* Bounding Box */}
                    <polygon
                      points={`
                        ${activeQuad.tl.x}%,${activeQuad.tl.y}%
                        ${activeQuad.tr.x}%,${activeQuad.tr.y}%
                        ${activeQuad.br.x}%,${activeQuad.br.y}%
                        ${activeQuad.bl.x}%,${activeQuad.bl.y}%
                      `}
                      fill="none"
                      stroke="#0D6EFD"
                      strokeWidth="2"
                      strokeDasharray="4 3"
                    />
                  </svg>

                  {/* Center Drag to Move Entire Crop Area */}
                  <div
                    style={{
                      left: `${(activeQuad.tl.x + activeQuad.tr.x + activeQuad.br.x + activeQuad.bl.x) / 4}%`,
                      top: `${(activeQuad.tl.y + activeQuad.tr.y + activeQuad.br.y + activeQuad.bl.y) / 4}%`,
                    }}
                    onMouseDown={(e) => handleMouseDown(e, 'DRAG_MOVE_QUAD')}
                    className="absolute w-8 h-8 -ml-4 -mt-4 bg-[#0D6EFD]/80 hover:bg-[#0D6EFD] text-white rounded-full flex items-center justify-center cursor-move shadow-md pointer-events-auto transition-transform hover:scale-110 border border-white"
                    title="Drag to move entire crop window"
                  >
                    <Move className="w-4 h-4" />
                  </div>

                  {/* 4 Corner Magnetic Handles */}
                  {[
                    { key: 'DRAG_CORNER_TL' as const, pos: activeQuad.tl },
                    { key: 'DRAG_CORNER_TR' as const, pos: activeQuad.tr },
                    { key: 'DRAG_CORNER_BR' as const, pos: activeQuad.br },
                    { key: 'DRAG_CORNER_BL' as const, pos: activeQuad.bl },
                  ].map((corner) => (
                    <div
                      key={corner.key}
                      style={{ left: `${corner.pos.x}%`, top: `${corner.pos.y}%` }}
                      onMouseDown={(e) => handleMouseDown(e, corner.key)}
                      className="absolute w-5 h-5 -ml-2.5 -mt-2.5 bg-[#FFFFFF] border-2 border-[#0D6EFD] rounded-full shadow-md cursor-grab active:cursor-grabbing pointer-events-auto hover:scale-125 transition-transform"
                    />
                  ))}

                  {/* 4 Edge Midpoint Handles */}
                  {[
                    { key: 'DRAG_EDGE_TOP' as const, pos: { x: (activeQuad.tl.x + activeQuad.tr.x) / 2, y: (activeQuad.tl.y + activeQuad.tr.y) / 2 } },
                    { key: 'DRAG_EDGE_RIGHT' as const, pos: { x: (activeQuad.tr.x + activeQuad.br.x) / 2, y: (activeQuad.tr.y + activeQuad.br.y) / 2 } },
                    { key: 'DRAG_EDGE_BOTTOM' as const, pos: { x: (activeQuad.bl.x + activeQuad.br.x) / 2, y: (activeQuad.bl.y + activeQuad.br.y) / 2 } },
                    { key: 'DRAG_EDGE_LEFT' as const, pos: { x: (activeQuad.tl.x + activeQuad.bl.x) / 2, y: (activeQuad.tl.y + activeQuad.bl.y) / 2 } },
                  ].map((edge) => (
                    <div
                      key={edge.key}
                      style={{ left: `${edge.pos.x}%`, top: `${edge.pos.y}%` }}
                      onMouseDown={(e) => handleMouseDown(e, edge.key)}
                      className="absolute w-4 h-4 -ml-2 -mt-2 bg-[#0D6EFD] border-2 border-white rounded-md shadow-md cursor-pointer pointer-events-auto hover:scale-125 transition-transform"
                    />
                  ))}
                </div>
              )}
            </div>
            )}
          </div>

          {/* Scrollable PDF Page Thumbnails Panel */}
          {isPdfDocument && (
            <div className="bg-[#FFFFFF] border-t border-[#CBD5E1] p-2.5 space-y-1.5 shrink-0 shadow-2xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#081B3A] flex items-center gap-1.5">
                  <Files className="w-3.5 h-3.5 text-[#0D6EFD]" /> All PDF Pages ({pdfPageCount})
                  {isRenderingPdfPages && (
                    <span className="text-[10px] text-[#EA580C] font-mono animate-pulse">
                      (Loading {pdfPagesList.length}/{pdfPageCount}...)
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSelectAllPdfPages}
                    className="text-[10px] font-bold text-[#0D6EFD] hover:underline cursor-pointer"
                  >
                    Select All ({pdfPageCount})
                  </button>
                  <span className="text-[10px] text-[#CBD5E1]">|</span>
                  <span className="text-[10px] font-mono text-[#198754] font-bold">
                    {selectedPdfPages.length} of {pdfPageCount} Selected
                  </span>
                </div>
              </div>

              {/* Thumbnails Row */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 max-h-24">
                {Array.from({ length: pdfPageCount }, (_, i) => i + 1).map((pNum) => {
                  const isCur = currentPdfPage === pNum;
                  const isChecked = selectedPdfPages.includes(pNum);
                  const pageObj = pdfPagesList.find((p) => p.pageNum === pNum);

                  return (
                    <div
                      key={pNum}
                      onClick={() => handleSelectPdfPage(pNum)}
                      className={`relative rounded-xl border p-1 shrink-0 flex flex-col items-center gap-1 cursor-pointer transition-all ${
                        isCur
                          ? 'bg-[#E7F1FF] border-[#0D6EFD] ring-2 ring-[#0D6EFD]/30 shadow-xs'
                          : isChecked
                          ? 'bg-[#F0FDF4] border-[#86EFAC]'
                          : 'bg-[#F8FAFC] border-[#E2E8F0] hover:border-[#CBD5E1]'
                      }`}
                      style={{ width: '64px' }}
                    >
                      <div className="w-13 h-14 bg-white rounded-lg border border-[#E2E8F0] overflow-hidden flex items-center justify-center relative">
                        {pageObj?.dataUrl ? (
                          <img src={pageObj.dataUrl} alt={`Pg ${pNum}`} className="w-full h-full object-contain pointer-events-none" />
                        ) : (
                          <FileText className="w-5 h-5 text-[#9CA3AF]" />
                        )}
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleTogglePageSelection(pNum);
                          }}
                          className="absolute top-1 left-1 w-3.5 h-3.5 rounded cursor-pointer accent-[#0D6EFD]"
                        />
                      </div>
                      <span className={`text-[10px] font-mono font-bold ${isCur ? 'text-[#0D6EFD]' : 'text-[#495057]'}`}>
                        Pg {pNum}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Canvas Bottom Strip (Zoom & Document Selector) */}
          <div className="h-14 bg-[#FFFFFF] border-t border-[#E2E8F0] px-3 flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setZoomScale(z => Math.max(0.4, z - 0.15))}
                className="p-1 rounded-lg bg-[#F1F5F9] text-[#081B3A] cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-xs font-bold text-[#081B3A]">{Math.round(zoomScale * 100)}%</span>
              <button
                onClick={() => setZoomScale(z => Math.min(2.5, z + 0.15))}
                className="p-1 rounded-lg bg-[#F1F5F9] text-[#081B3A] cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto">
              {activeMediaList.map((m, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedMediaIndex(idx);
                    setSelectedDocMsg(m);
                    if (m.mediaUrl) {
                      const isPdf = m.mediaType === 'PDF' || m.mediaUrl.toLowerCase().endsWith('.pdf');
                      loadSourceFile(m.mediaUrl, isPdf);
                    }
                  }}
                  className={`px-2 py-1 rounded-lg border text-[10px] font-bold cursor-pointer transition-all ${
                    selectedMediaIndex === idx ? 'bg-[#0D6EFD] text-white border-[#0D6EFD]' : 'bg-[#F8FAFC] text-[#495057] border-[#E2E8F0]'
                  }`}
                >
                  Doc {idx + 1}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL: LIVE OUTPUT PREVIEWS & TRAY (4 cols) ─────────────── */}
        <div className="col-span-12 md:col-span-4 bg-[#F8FAFC] p-3.5 flex flex-col justify-between overflow-y-auto space-y-3">
          <div className="space-y-3">
            <div className="border-b border-[#E2E8F0] pb-2 flex items-center justify-between">
              <span className="text-xs font-bold text-[#081B3A] uppercase tracking-wide flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-[#0D6EFD]" /> Live Output Preview
              </span>
              <span className="text-[10px] text-[#6B7280] font-mono">
                {printMode === 'A4_FULL_PAGE' ? 'A4 Sheet' : '300 DPI CR80'}
              </span>
            </div>

            {printMode === 'A4_FULL_PAGE' ? (
              /* A4 Full Page Preview */
              <div className="bg-[#FFFFFF] p-3 rounded-2xl border border-[#CBD5E1] shadow-xs space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-[#6F42C1]">
                  <span>📄 A4 Document Output</span>
                  <div className="flex items-center gap-1 bg-[#F1F5F9] p-0.5 rounded-lg text-[10px]">
                    <button
                      onClick={() => setA4Orientation('PORTRAIT')}
                      className={`px-2 py-0.5 rounded ${a4Orientation === 'PORTRAIT' ? 'bg-[#6F42C1] text-white' : 'text-[#6B7280]'}`}
                    >
                      Portrait
                    </button>
                    <button
                      onClick={() => setA4Orientation('LANDSCAPE')}
                      className={`px-2 py-0.5 rounded ${a4Orientation === 'LANDSCAPE' ? 'bg-[#6F42C1] text-white' : 'text-[#6B7280]'}`}
                    >
                      Landscape
                    </button>
                  </div>
                </div>
                <div className="bg-[#F8FAFC] rounded-xl p-3 flex flex-col items-center justify-center border border-[#E2E8F0] min-h-[220px] text-center space-y-2 overflow-hidden">
                  {isOfficeDocument && officeDocInfo ? (
                    <>
                      <FileText className="w-10 h-10 text-[#0D6EFD]" />
                      <p className="text-xs font-bold text-[#081B3A] break-all">{officeDocInfo.name}</p>
                      <span className="text-[10px] text-[#6B7280] font-mono">{officeDocInfo.type}</span>
                      <a
                        href={officeDocInfo.url}
                        target="_blank"
                        rel="noreferrer"
                        download={officeDocInfo.name}
                        className="px-3 py-1.5 rounded-lg bg-[#0D6EFD] hover:bg-[#0b5ed7] text-white text-[11px] font-bold flex items-center gap-1 mt-1 shadow-2xs cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" /> Open / Download File
                      </a>
                    </>
                  ) : (
                    <canvas ref={a4PreviewCanvasRef} className="max-h-full max-w-full object-contain rounded-lg" />
                  )}
                </div>
              </div>
            ) : (
              /* PVC Card Front & Back Previews */
              <>
                {/* 1. Front Card Output */}
                <div className="bg-[#FFFFFF] p-3 rounded-2xl border border-[#CBD5E1] shadow-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#081B3A] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#198754]" /> Front Card Output
                    </span>
                    <button
                      onClick={handleAddFrontClick}
                      className="px-2 py-0.5 rounded-lg bg-[#E8F5E9] hover:bg-[#DCFCE7] text-[#198754] font-bold text-[10px] border border-[#86EFAC] cursor-pointer"
                    >
                      {pvcFrontCrop.isSaved ? '✓ Front Added' : '+ Add as Front'}
                    </button>
                  </div>
                  <div className="w-full aspect-[85.6/54] bg-[#FFFFFF] rounded-xl overflow-hidden shadow-2xs border border-[#E2E8F0] flex items-center justify-center">
                    <canvas ref={frontPreviewCanvasRef} className="w-full h-full object-fill block rounded-xl" />
                  </div>
                </div>

                {/* 2. Back Card Output */}
                <div className="bg-[#FFFFFF] p-3 rounded-2xl border border-[#CBD5E1] shadow-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#081B3A] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#0D6EFD]" /> Back Card Output
                    </span>
                    <button
                      onClick={handleAddBackClick}
                      className="px-2 py-0.5 rounded-lg bg-[#E7F1FF] hover:bg-[#DBEAFE] text-[#0D6EFD] font-bold text-[10px] border border-[#B6D4FE] cursor-pointer"
                    >
                      {pvcBackCrop.isSaved ? '✓ Back Added' : '+ Add as Back'}
                    </button>
                  </div>
                  <div className="w-full aspect-[85.6/54] bg-[#FFFFFF] rounded-xl overflow-hidden shadow-2xs border border-[#E2E8F0] flex items-center justify-center">
                    <canvas ref={backPreviewCanvasRef} className="w-full h-full object-fill block rounded-xl" />
                  </div>
                </div>

                {/* 3. Final PVC Print Sheet */}
                <div className="bg-[#FFFFFF] p-3 rounded-2xl border border-[#CBD5E1] shadow-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#081B3A] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#6F42C1]" /> Side-by-Side PVC Layout Sheet
                    </span>
                  </div>
                  <div className="w-full aspect-[21/7.5] bg-[#FFFFFF] rounded-xl overflow-hidden shadow-2xs border border-[#E2E8F0] flex items-center justify-center">
                    <canvas ref={pvcSheetPreviewCanvasRef} className="w-full h-full object-fill block rounded-xl" />
                  </div>
                </div>
              </>
            )}

            {/* Image Cleanup Filters */}
            <div className="p-2.5 bg-[#FFFFFF] rounded-2xl border border-[#CBD5E1] shadow-xs space-y-1.5">
              <span className="text-[10px] font-bold text-[#6B7280] uppercase">Image Filter:</span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'VIBRANT', label: '✨ Vibrant Color' },
                  { id: 'CLEAN_BW', label: '📄 Clean B&W' },
                  { id: 'DOC_WHITE', label: '🔍 Doc White' },
                  { id: 'ORIGINAL', label: '📷 Original' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilterMode(f.id as any)}
                    className={`py-1.5 px-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                      filterMode === f.id
                        ? 'bg-[#0D6EFD] text-[#FFFFFF] border-[#0D6EFD]'
                        : 'bg-[#F8FAFC] text-[#495057] border-[#E2E8F0] hover:bg-[#F1F5F9]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── BOTTOM ACTION BAR (Save, Print, Print Later, Mark Processed) ─────── */}
      <div className="h-14 bg-[#FFFFFF] border-t border-[#E2E8F0] px-4 flex items-center justify-between shrink-0 text-xs shadow-xs">
        <div className="flex items-center gap-3">
          <span className="text-[#6B7280] font-mono text-xs">
            Active Ticket: <strong className="text-[#0D6EFD] font-bold">{activeJob?.tokenNumber}</strong> ({activeJob?.customerName})
          </span>
        </div>

        {/* 4 Core Actions matching User Workflow */}
        <div className="flex items-center gap-2">
          {/* 1. Save */}
          <button
            onClick={handleSaveWorkspaceState}
            className="px-4 py-2 rounded-xl bg-[#E8F5E9] hover:bg-[#DCFCE7] text-[#198754] border border-[#86EFAC] font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> 1. Save Changes
          </button>

          {/* 2. Print Later / Hold */}
          <button
            onClick={handleReleaseWork}
            className="px-3.5 py-2 rounded-xl bg-[#F3E8FF] hover:bg-[#EDE9FE] text-[#6F42C1] border border-[#DDD6FE] font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5" /> 2. Print Later / Hold
          </button>

          {/* 3. Mark Processed */}
          <button
            onClick={handleMarkPrintReady}
            className="px-3.5 py-2 rounded-xl bg-[#E9ECEF] hover:bg-[#DEE2E6] text-[#495057] border border-[#CED4DA] font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" /> 3. Mark Processed
          </button>

          {/* 4. Print -> Opens Stage 3 Print Confirmation */}
          <button
            onClick={handleOpenPrintConfirmation}
            className="px-5 py-2 rounded-xl bg-[#FD7E14] hover:bg-[#E86D07] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-[0.98] cursor-pointer"
          >
            <Printer className="w-4 h-4" /> 4. Print Document (₹{customPrice})
          </button>
        </div>
      </div>

      {/* ── STAGE 3: PRINT CONFIRMATION MODAL ────────────────────────────────── */}
      {showPrintConfirmModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#FFFFFF] border border-[#CBD5E1] p-6 rounded-2xl max-w-md w-full mx-4 shadow-2xl space-y-4 font-sans select-none">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2 text-[#081B3A] font-bold text-base">
                <Printer className="w-5 h-5 text-[#0D6EFD]" />
                <span>Stage 3: Print Confirmation</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full font-mono text-xs font-bold bg-[#E7F1FF] text-[#0D6EFD] border border-[#B6D4FE]">
                {activeJob?.tokenNumber || 'T-181'}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              {/* Printer Selection */}
              <div>
                <label className="font-bold text-[#081B3A] block mb-1">Select Printer Target:</label>
                <select
                  value={selectedPrinter}
                  onChange={(e) => setSelectedPrinter(e.target.value)}
                  className="w-full p-2.5 border border-[#CBD5E1] rounded-xl text-xs bg-[#FFFFFF] text-[#081B3A] focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]"
                >
                  <option>Canon iR-ADV C3520 (Main Network Laser)</option>
                  <option>Epson L8050 PVC Card Tray (Direct PVC Print)</option>
                  <option>HP LaserJet Pro M404n (Monochrome Quick Print)</option>
                </select>
              </div>

              {/* Print Paper & Size */}
              <div>
                <label className="font-bold text-[#081B3A] block mb-1">Print Size & Paper:</label>
                <select
                  value={selectedPaperSize}
                  onChange={(e) => setSelectedPaperSize(e.target.value)}
                  className="w-full p-2.5 border border-[#CBD5E1] rounded-xl text-xs bg-[#FFFFFF] text-[#081B3A] focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]"
                >
                  <option value="PVC_CR80">🪪 PVC Plastic Card (CR80 85.6 × 54mm)</option>
                  <option value="A4_PLAIN">📄 A4 Plain Paper (75 GSM)</option>
                  <option value="A4_GLOSSY">📄 A4 Glossy Photo Sheet (210 GSM)</option>
                  <option value="PHOTO_4X6">📷 4×6 Photo Paper (Passport 8-up)</option>
                </select>
              </div>

              {/* Copies & Color Mode */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#081B3A] block mb-1">Copies:</label>
                  <div className="flex items-center justify-between bg-[#F8FAFC] border border-[#CBD5E1] p-1 rounded-xl">
                    <button
                      onClick={() => setPrintCopies(c => Math.max(1, c - 1))}
                      className="w-8 h-8 rounded-lg bg-[#FFFFFF] border border-[#CED4DA] text-[#081B3A] font-bold text-sm flex items-center justify-center cursor-pointer"
                    >
                      -
                    </button>
                    <span className="font-mono text-sm font-bold text-[#081B3A]">{printCopies}</span>
                    <button
                      onClick={() => setPrintCopies(c => c + 1)}
                      className="w-8 h-8 rounded-lg bg-[#FFFFFF] border border-[#CED4DA] text-[#081B3A] font-bold text-sm flex items-center justify-center cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-[#081B3A] block mb-1">Color Mode:</label>
                  <div className="flex bg-[#F1F5F9] p-0.5 rounded-xl border border-[#E2E8F0] text-[10px]">
                    <button
                      onClick={() => setPrintColorMode('COLOR')}
                      className={`flex-1 py-1.5 rounded-lg font-bold cursor-pointer ${printColorMode === 'COLOR' ? 'bg-[#0D6EFD] text-white shadow-2xs' : 'text-[#6B7280]'}`}
                    >
                      🎨 Color
                    </button>
                    <button
                      onClick={() => setPrintColorMode('BW')}
                      className={`flex-1 py-1.5 rounded-lg font-bold cursor-pointer ${printColorMode === 'BW' ? 'bg-[#081B3A] text-white shadow-2xs' : 'text-[#6B7280]'}`}
                    >
                      ⚫ B&W
                    </button>
                  </div>
                </div>
              </div>

              {/* PDF Print Page Scope */}
              {isPdfDocument && pdfPageCount > 1 && (
                <div className="p-2 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-1">
                  <label className="font-bold text-[#081B3A] block text-[11px]">PDF Print Scope:</label>
                  <div className="grid grid-cols-3 gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setPdfPrintOption('ALL')}
                      className={`py-1.5 px-1 rounded-lg font-bold border transition-all text-center cursor-pointer ${
                        pdfPrintOption === 'ALL'
                          ? 'bg-[#0D6EFD] text-white border-[#0D6EFD] shadow-2xs'
                          : 'bg-[#FFFFFF] text-[#495057] border-[#E2E8F0] hover:bg-[#F1F5F9]'
                      }`}
                    >
                      All ({pdfPageCount} Pgs)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPdfPrintOption('CURRENT')}
                      className={`py-1.5 px-1 rounded-lg font-bold border transition-all text-center cursor-pointer ${
                        pdfPrintOption === 'CURRENT'
                          ? 'bg-[#0D6EFD] text-white border-[#0D6EFD] shadow-2xs'
                          : 'bg-[#FFFFFF] text-[#495057] border-[#E2E8F0] hover:bg-[#F1F5F9]'
                      }`}
                    >
                      Page {currentPdfPage} Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setPdfPrintOption('SELECTED')}
                      className={`py-1.5 px-1 rounded-lg font-bold border transition-all text-center cursor-pointer ${
                        pdfPrintOption === 'SELECTED'
                          ? 'bg-[#0D6EFD] text-white border-[#0D6EFD] shadow-2xs'
                          : 'bg-[#FFFFFF] text-[#495057] border-[#E2E8F0] hover:bg-[#F1F5F9]'
                      }`}
                    >
                      Selected ({selectedPdfPages.length} Pgs)
                    </button>
                  </div>
                </div>
              )}

              {/* Price Summary */}
              <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex items-center justify-between text-xs">
                <span className="text-[#6B7280]">
                  Total Charge ({isPdfDocument ? (pdfPrintOption === 'CURRENT' ? '1 Page' : pdfPrintOption === 'SELECTED' ? `${selectedPdfPages.length} Pages` : `${pdfPageCount} Pages`) : '1 Card'} × {printCopies} {printCopies > 1 ? 'copies' : 'copy'}):
                </span>
                <span className="font-mono font-bold text-sm text-[#0F5132]">
                  ₹{customPrice * (isPdfDocument ? (pdfPrintOption === 'CURRENT' ? 1 : pdfPrintOption === 'SELECTED' ? selectedPdfPages.length : pdfPageCount) : 1) * printCopies}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={handleExecutePrintWorkflow}
                className="w-full py-3 rounded-xl bg-[#198754] hover:bg-[#157347] text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" /> 🖨️ Confirm & Print Now
              </button>
              <button
                onClick={() => setShowPrintConfirmModal(false)}
                className="w-full py-2.5 rounded-xl bg-[#E9ECEF] hover:bg-[#DEE2E6] text-[#495057] font-semibold text-xs border border-[#CED4DA] flex items-center justify-center gap-1 cursor-pointer"
              >
                ← Back to Editor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STAGE 4: COMPLETED MODAL ────────────────────────────────────────── */}
      {showCompletedModal && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#FFFFFF] border border-[#CBD5E1] p-6 rounded-2xl max-w-md w-full mx-4 shadow-2xl space-y-4 font-sans select-none text-center">
            <div className="w-12 h-12 rounded-full bg-[#E8F5E9] text-[#198754] border border-[#86EFAC] flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#081B3A]">
                Stage 4: Completed Successfully!
              </h3>
              <p className="text-xs text-[#6B7280]">
                Ticket <strong className="text-[#0D6EFD] font-mono">{activeJob?.tokenNumber}</strong> for <strong>{activeJob?.customerName}</strong> has been printed.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  handle1ClickPrint();
                }}
                className="w-full py-2.5 rounded-xl bg-[#E7F1FF] hover:bg-[#DBEAFE] text-[#0D6EFD] border border-[#B6D4FE] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" /> 🔄 Reprint Document
              </button>

              <button
                onClick={() => {
                  window.location.href = '/print-hub/queue';
                }}
                className="w-full py-3 rounded-xl bg-[#0D6EFD] hover:bg-[#0b5ed7] text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                📋 Return to Ticket Queue
              </button>
            </div>
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
      {showChatModal && (
        <WhatsAppChatModal
          isOpen={showChatModal}
          onClose={() => setShowChatModal(false)}
          customerName={activeJob?.customerName || 'Customer'}
          customerPhone={activeJob?.phone || ''}
          tokenNumber={activeJob?.tokenNumber}
          branchId={activeJob?.branchId}
          orderId={activeJob?.id}
          totalAmount={customPrice || 10}
        />
      )}

      {/* ── WHATSAPP GATEWAY PAIRING & TEST INGEST MODAL ───────────────────────── */}
      <WhatsAppGatewayModal
        open={showGatewayModal}
        onClose={() => setShowGatewayModal(false)}
        branchId={selectedBranchId || branches?.[0]?.id || 'f5abaacc-d2b6-4591-91fb-314b2188e18c'}
        onOrderCreated={() => {
          refetch();
          refetchOrders();
        }}
      />
    </div>
  );
}
