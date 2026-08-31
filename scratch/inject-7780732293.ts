import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  'https://kxacmxxktuvildjjvnjs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4YWNteHhrdHV2aWxkamp2bmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNzc5NjgsImV4cCI6MjEwMzc1Mzk2OH0.bz5ObWxHckEg-9FanAP8sOz6VNPa7gKgKvEkzV0Rl74'
);

async function injectCustomer7780732293() {
  console.log('Injecting customer 7780732293 WhatsApp message and Token into Supabase...');

  const customerPhone = '+91 77807 32293';
  const customerName = 'Customer (7780732293)';
  const fileName = 'Aadhaar_Document.jpg';
  const mediaUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80';
  const now = new Date().toISOString();
  const branchId = 'f5abaacc-d2b6-4591-91fb-314b2188e18c';

  // 1. Get next token number
  const { data: latestOrders } = await supabase
    .from('print_orders')
    .select('tokenNumber')
    .order('createdAt', { ascending: false })
    .limit(20);

  let nextTokenNum = 115;
  if (latestOrders && latestOrders.length > 0) {
    const nums = latestOrders
      .map(o => parseInt(o.tokenNumber?.replace(/[^0-9]/g, '') || '100', 10))
      .filter(n => !isNaN(n));
    if (nums.length > 0) {
      nextTokenNum = Math.max(...nums) + 1;
    }
  }

  const tokenNumber = `T-${nextTokenNum}`;
  const orderId = crypto.randomUUID();
  const orderNo = `PRN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(nextTokenNum).padStart(3, '0')}`;

  // 2. Create Order in Supabase
  const { data: order, error: orderErr } = await supabase
    .from('print_orders')
    .insert([{
      id: orderId,
      orderNo,
      tokenNumber,
      organizationId: 'svv-org-001',
      branchId,
      customerName,
      customerPhone,
      source: 'WHATSAPP',
      documentUrl: mediaUrl,
      documentName: fileName,
      pageCount: 1,
      colorMode: 'COLOR',
      copies: 1,
      totalAmount: 50,
      status: 'PENDING',
      createdAt: now,
      updatedAt: now,
    }])
    .select()
    .single();

  if (orderErr) {
    console.error('Error creating order in Supabase:', orderErr);
  } else {
    console.log('✅ Created Token for 7780732293:', tokenNumber, order.id);
  }

  // 3. Create Incoming WhatsApp Message
  const msgId = crypto.randomUUID();
  const { data: msg, error: msgErr } = await supabase
    .from('whatsapp_messages')
    .insert([{
      id: msgId,
      organizationId: 'svv-org-001',
      branchId,
      phone: customerPhone,
      senderName: customerName,
      messageBody: `Please print photo: ${fileName}`,
      mediaUrl,
      mediaType: 'IMAGE',
      isIncoming: true,
      orderId,
      createdAt: now,
    }])
    .select()
    .single();

  if (msgErr) {
    console.error('Error creating incoming message in Supabase:', msgErr);
  } else {
    console.log('✅ Created incoming WhatsApp message in Supabase:', msg.id);
  }

  // 4. Create Outgoing Auto-Reply Confirmation
  const replyId = crypto.randomUUID();
  const receivedTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const autoReplyText = `Your document received successfully.\nToken No: ${tokenNumber}\nReceived Time: ${receivedTime}`;

  const { data: reply, error: replyErr } = await supabase
    .from('whatsapp_messages')
    .insert([{
      id: replyId,
      organizationId: 'svv-org-001',
      branchId,
      phone: customerPhone,
      senderName: 'SVV Print Desk',
      messageBody: autoReplyText,
      isIncoming: false,
      orderId,
      createdAt: new Date(Date.now() + 1000).toISOString(),
    }])
    .select()
    .single();

  if (replyErr) {
    console.error('Error creating auto-reply message in Supabase:', replyErr);
  } else {
    console.log('✅ Created customer auto-reply confirmation in Supabase:', autoReplyText.replace(/\n/g, ' '));
  }
}

injectCustomer7780732293();
