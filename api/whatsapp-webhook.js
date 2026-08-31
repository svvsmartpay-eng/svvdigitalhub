import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://kxacmxxktuvildjjvnjs.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4YWNteHhrdHV2aWxkamp2bmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNzc5NjgsImV4cCI6MjEwMzc1Mzk2OH0.bz5ObWxHckEg-9FanAP8sOz6VNPa7gKgKvEkzV0Rl74';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function formatWhatsAppPhone(raw) {
  if (!raw) return '';
  const digits = raw.replace(/[^0-9]/g, '');
  if (digits.startsWith('91') && digits.length === 12) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return raw.startsWith('+') ? raw : `+${raw}`;
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 1. Meta Webhook Verification (GET)
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && (token === 'SVV_WHATSAPP_TOKEN' || token === 'svv_whatsapp_webhook_2026' || !token)) {
      return res.status(200).send(challenge || 'OK');
    }
    return res.status(200).json({ status: 'active', endpoint: 'SVV Cloud WhatsApp Webhook' });
  }

  // 2. Incoming WhatsApp Message / Webhook Ingestion (POST)
  if (req.method === 'POST') {
    try {
      const body = req.body || {};
      let phone = '';
      let senderName = '';
      let messageBody = '';
      let mediaUrl = null;
      let mediaType = 'IMAGE';
      let fileName = 'Customer_Document.jpg';
      let branchId = 'f5abaacc-d2b6-4591-91fb-314b2188e18c';

      // Parse Meta Cloud API format
      if (body.object === 'whatsapp_business_account' || body.entry) {
        const entry = body.entry?.[0];
        const change = entry?.changes?.[0]?.value;
        const msg = change?.messages?.[0];
        const contact = change?.contacts?.[0];

        if (!msg) {
          return res.status(200).json({ success: true, note: 'Event acknowledged (no message payload)' });
        }

        phone = formatWhatsAppPhone(msg.from);
        senderName = contact?.profile?.name || `Customer (${phone})`;

        if (msg.type === 'text') {
          messageBody = msg.text?.body || '';
        } else if (msg.type === 'image') {
          mediaType = 'IMAGE';
          fileName = `Photo_${Date.now()}.jpg`;
          mediaUrl = msg.image?.url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80';
          messageBody = msg.image?.caption || `Please print photo: ${fileName}`;
        } else if (msg.type === 'document') {
          mediaType = 'PDF';
          fileName = msg.document?.filename || `Document_${Date.now()}.pdf`;
          mediaUrl = msg.document?.url || 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80';
          messageBody = msg.document?.caption || `Please print document: ${fileName}`;
        }
      } else {
        // Parse Direct / Gateway Payload
        phone = formatWhatsAppPhone(body.phone || body.from || '+91 77807 32293');
        senderName = body.senderName || body.name || `Customer (${phone})`;
        messageBody = body.messageBody || body.message || 'Please print document';
        mediaUrl = body.mediaUrl || body.documentUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80';
        mediaType = body.mediaType || (mediaUrl.includes('.pdf') ? 'PDF' : 'IMAGE');
        fileName = body.fileName || (mediaType === 'PDF' ? 'Customer_Document.pdf' : 'Customer_Photo.jpg');
        branchId = body.branchId || branchId;
      }

      const now = new Date();
      const rawDigits10 = phone.replace(/[^0-9]/g, '').slice(-10);

      // Check existing active token in Supabase for this customer
      const { data: existingOrders } = await supabase
        .from('print_orders')
        .select('*')
        .eq('branchId', branchId)
        .in('status', ['PENDING', 'PRINTING', 'READY_FOR_DELIVERY'])
        .order('createdAt', { ascending: false });

      const matchingOrder = (existingOrders || []).find((o) => {
        const oDigits = (o.customerPhone || '').replace(/[^0-9]/g, '').slice(-10);
        return oDigits === rawDigits10;
      });

      let tokenNumber = '';
      let orderId = '';

      if (matchingOrder) {
        tokenNumber = matchingOrder.tokenNumber;
        orderId = matchingOrder.id;

        // Update existing token
        await supabase
          .from('print_orders')
          .update({
            documentName: `${matchingOrder.documentName} + ${fileName}`,
            pageCount: (matchingOrder.pageCount || 1) + 1,
            totalAmount: (matchingOrder.totalAmount || 50) + 50,
            updatedAt: now.toISOString(),
          })
          .eq('id', orderId);
      } else {
        // Generate new sequential token
        const countToday = (existingOrders || []).length;
        tokenNumber = `T-${100 + (countToday % 900) + 1}`;
        orderId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `ord-${Date.now()}`;
        const orderNo = `PRN-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${tokenNumber.replace('T-', '')}`;

        await supabase.from('print_orders').insert([{
          id: orderId,
          orderNo,
          tokenNumber,
          organizationId: 'svv-org-001',
          branchId,
          customerName,
          customerPhone: phone,
          source: 'WHATSAPP',
          documentUrl: mediaUrl,
          documentName: fileName,
          pageCount: 1,
          colorMode: 'COLOR',
          copies: 1,
          totalAmount: 50,
          status: 'PENDING',
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        }]);
      }

      // Save incoming message in Supabase
      const msgId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `msg-${Date.now()}`;
      await supabase.from('whatsapp_messages').insert([{
        id: msgId,
        organizationId: 'svv-org-001',
        branchId,
        phone,
        senderName,
        messageBody,
        mediaUrl,
        mediaType,
        isIncoming: true,
        orderId,
        createdAt: now.toISOString(),
      }]);

      // Format Indian Standard Time (Asia/Kolkata)
      const receivedTime = now.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      const replyText = `Your document received successfully.\nToken No: ${tokenNumber}\nReceived Time: ${receivedTime}`;

      // Save outgoing auto-reply in Supabase
      await supabase.from('whatsapp_messages').insert([{
        id: `reply-${Date.now()}`,
        organizationId: 'svv-org-001',
        branchId,
        phone,
        senderName: 'SVV Print Desk',
        messageBody: replyText,
        isIncoming: false,
        orderId,
        createdAt: new Date(Date.now() + 1000).toISOString(),
      }]);

      return res.status(200).json({
        success: true,
        tokenNumber,
        orderId,
        customerPhone: phone,
        autoReply: replyText,
      });
    } catch (err) {
      console.error('Vercel Webhook Error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
