/**
 * Shared Ticket Data Enrichment and Normalization Utility
 * Deduplicates ticket parsing across PrintQueuePage, WhatsAppInboxPage, etc.
 */

export interface EnrichedDocument {
  id: string;
  name: string;
  type: 'IMAGE' | 'PDF' | 'DOC';
  url: string;
  sizeText?: string;
  pageCount?: number;
  createdAt?: string;
  tokenNumber?: string;
  customerPhone?: string;
  notes?: string;
}

export interface EnrichedTicket {
  id: string;
  orderNo?: string;
  tokenNumber: string;
  ticket_code?: string;
  customerName: string;
  customerPhone: string;
  displayPhone: string;
  customerIntent: 'PRINT_ONLY' | 'ONLINE_SERVICE_ONLY' | 'BOTH';
  branchId?: string;
  branchName: string;
  branchCode: string;
  status: string;
  ticketStatus: string;
  timeFormatted: string;
  waitingMinutes: number;
  waitingFormatted: string;
  assignedStaffName: string;
  assignedStaffRole: string;
  isLockedByMe: boolean;
  isLockedByOther: boolean;
  docItems: EnrichedDocument[];
  totalFiles: number;
  totalPages: number;
  imageCount: number;
  pdfCount: number;
  docCount: number;
  rawOrder: any;
}

export function formatDisplayPhone(raw?: string): string {
  if (!raw) return '';
  const digits = raw.replace(/[^0-9]/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return '+91 ' + digits.slice(2, 7) + ' ' + digits.slice(7);
  }
  if (digits.length === 10) {
    return '+91 ' + digits.slice(0, 5) + ' ' + digits.slice(5);
  }
  if (digits.length >= 14) {
    return '+91 (WA #' + digits.slice(-4) + ')';
  }
  return raw.startsWith('+') ? raw : '+' + raw;
}

export function resolveCustomerName(
  senderName?: string,
  orderName?: string,
  phone?: string
): string {
  const isGeneric = (n?: string) =>
    !n ||
    n.includes('Print Desk') ||
    n.includes('SVV Communication') ||
    n === 'Walk-in Customer' ||
    n === 'Test Walk-in Customer';
  if (!isGeneric(senderName)) return senderName!.trim();
  if (!isGeneric(orderName)) return orderName!.trim();
  if (phone) return formatDisplayPhone(phone);
  return 'Walk-in Customer';
}

export function enrichTicket(
  ord: any,
  msgsList: any[] = [],
  currentUserId?: string,
  pdfPageCountsMap: Record<string, number> = {}
): EnrichedTicket {
  const docItems: EnrichedDocument[] = [];
  const seenUrls = new Set<string>();

  // 1. Primary documentUrl
  if (ord.documentUrl) {
    const isPdf =
      ord.documentUrl.toLowerCase().includes('.pdf') ||
      (ord.documentName && ord.documentName.toLowerCase().endsWith('.pdf'));
    const isImg =
      !isPdf &&
      (ord.documentUrl.match(/\.(jpg|jpeg|png|webp|gif|bmp|svg)/i) ||
        (ord.documentName && ord.documentName.match(/\.(jpg|jpeg|png|webp|gif|bmp|svg)/i)));
    const type: 'IMAGE' | 'PDF' | 'DOC' = isPdf ? 'PDF' : isImg ? 'IMAGE' : 'DOC';
    const realPageCount = isPdf ? (pdfPageCountsMap[ord.documentUrl] || ord.pageCount || 1) : 1;

    docItems.push({
      id: 'doc-' + ord.id + '-primary',
      name: ord.documentName || (isPdf ? 'Document.pdf' : 'Photo.jpg'),
      type,
      url: ord.documentUrl,
      sizeText: isPdf ? '1.8 MB' : '2.4 MB',
      pageCount: realPageCount,
      createdAt: ord.createdAt,
      tokenNumber: ord.tokenNumber,
      customerPhone: ord.customerPhone,
      notes: ord.notes,
    });
    seenUrls.add(ord.documentUrl);
  }

  // 2. Multi-document input_documents JSON array
  if (Array.isArray(ord.input_documents)) {
    ord.input_documents.forEach((doc: any, docIdx: number) => {
      const docUrl = doc.url || doc.documentUrl;
      if (docUrl && !seenUrls.has(docUrl)) {
        seenUrls.add(docUrl);
        const docName = doc.name || doc.fileName || doc.documentName || ('Document-' + (docIdx + 1));
        const isPdf =
          doc.type === 'PDF' ||
          docUrl.toLowerCase().includes('.pdf') ||
          docName.toLowerCase().endsWith('.pdf');
        const isImg =
          !isPdf &&
          (doc.type === 'IMAGE' ||
            docUrl.match(/\.(jpg|jpeg|png|webp|gif|bmp|svg)/i) ||
            docName.match(/\.(jpg|jpeg|png|webp|gif|bmp|svg)/i));
        const type: 'IMAGE' | 'PDF' | 'DOC' = isPdf ? 'PDF' : isImg ? 'IMAGE' : 'DOC';
        const realPageCount = isPdf ? (pdfPageCountsMap[docUrl] || 1) : 1;

        docItems.push({
          id: doc.id || ('doc-' + ord.id + '-input-' + docIdx),
          name: docName,
          type,
          url: docUrl,
          sizeText: isPdf ? '1.8 MB' : '2.4 MB',
          pageCount: realPageCount,
          createdAt: doc.receivedAt || ord.createdAt,
          tokenNumber: ord.tokenNumber,
          customerPhone: ord.customerPhone,
          notes: doc.notes,
        });
      }
    });
  }

  // 3. Additional media from messages linked to this order
  const linkedMsgs = msgsList.filter((m: any) => m.orderId && m.orderId === ord.id && m.mediaUrl);
  linkedMsgs.forEach((m: any, idx: number) => {
    if (!seenUrls.has(m.mediaUrl)) {
      seenUrls.add(m.mediaUrl);
      const isPdf = m.mediaUrl.toLowerCase().includes('.pdf') || m.mediaType === 'PDF';
      const isImg = !isPdf && (m.mediaUrl.match(/\.(jpg|jpeg|png|webp|gif|bmp|svg)/i) || m.mediaType === 'IMAGE');
      const type: 'IMAGE' | 'PDF' | 'DOC' = isPdf ? 'PDF' : isImg ? 'IMAGE' : 'DOC';

      docItems.push({
        id: 'doc-' + ord.id + '-msg-' + (m.id || idx),
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
  const assignedStaffName =
    ord.assignedStaff?.name ||
    ord.assignedStaffName ||
    (ord.assignedStaffId ? (currentUserId === ord.assignedStaffId ? 'You' : 'Staff User 1') : 'Unassigned');
  const assignedStaffRole = ord.assignedStaff?.role || (ord.assignedStaffId ? 'Staff Desk' : 'Unassigned');

  // Waiting time calculation
  const receivedTime = ord.received_at || ord.createdAt;
  const receivedMs = new Date(receivedTime).getTime();
  const waitingMinutes = Math.max(0, Math.floor((Date.now() - receivedMs) / 60000));
  let waitingFormatted = '';
  if (waitingMinutes >= 60) {
    const hrs = Math.floor(waitingMinutes / 60);
    const mins = waitingMinutes % 60;
    waitingFormatted = hrs + 'h ' + mins + 'm';
  } else {
    waitingFormatted = waitingMinutes + 'm';
  }

  const timeFormatted = new Date(receivedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const isLockedByOther = Boolean(
    ord.assignedStaffId && currentUserId && ord.assignedStaffId !== currentUserId && ord.status === 'PRINTING'
  );
  const isLockedByMe = Boolean(
    ord.assignedStaffId === currentUserId || (!ord.assignedStaffId && ord.status === 'PRINTING')
  );

  // Derive Customer Intent
  let customerIntent: 'PRINT_ONLY' | 'ONLINE_SERVICE_ONLY' | 'BOTH' = ord.customer_intent || 'PRINT_ONLY';
  if (!ord.customer_intent) {
    const lowerNotes = (ord.notes || '').toLowerCase();
    if (lowerNotes.includes('pan') || lowerNotes.includes('aadhaar') || lowerNotes.includes('online')) {
      customerIntent = totalFiles > 0 ? 'BOTH' : 'ONLINE_SERVICE_ONLY';
    } else {
      customerIntent = 'PRINT_ONLY';
    }
  }

  return {
    id: ord.id,
    orderNo: ord.orderNo,
    tokenNumber: ord.tokenNumber || ('T-' + ord.id?.slice(-3)),
    ticket_code: ord.ticket_code || ord.tokenNumber,
    customerName: resolveCustomerName(undefined, ord.customerName, ord.customerPhone),
    customerPhone: ord.customerPhone || '',
    displayPhone: formatDisplayPhone(ord.customerPhone),
    customerIntent,
    branchId: ord.branchId,
    branchName,
    branchCode,
    status: ord.status,
    ticketStatus: ord.ticket_status || 'RECEIVED',
    timeFormatted,
    waitingMinutes,
    waitingFormatted,
    assignedStaffName,
    assignedStaffRole,
    isLockedByMe,
    isLockedByOther,
    docItems,
    totalFiles,
    totalPages,
    imageCount,
    pdfCount,
    docCount,
    rawOrder: ord,
  };
}
