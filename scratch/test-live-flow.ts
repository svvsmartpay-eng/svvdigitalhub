import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://kxacmxxktuvildjjvnjs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4YWNteHhrdHV2aWxkamp2bmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNzc5NjgsImV4cCI6MjEwMzc1Mzk2OH0.bz5ObWxHckEg-9FanAP8sOz6VNPa7gKgKvEkzV0Rl74'
);

async function testLiveFlow() {
  console.log('Testing live Supabase sync for Vercel production...');
  const now = new Date().toISOString();
  const orderId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `live-${Date.now()}`;
  const msgId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `msg-${Date.now()}`;
  const branchId = 'f5abaacc-d2b6-4591-91fb-314b2188e18c';
  const customerPhone = '+91 77807 32293';
  const customerName = 'Customer (7780732293)';
  const tokenNumber = 'T-116';
  const orderNo = `PRN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-116`;

  // 1. Insert live print order
  const { data: orderData, error: orderErr } = await supabase.from('print_orders').insert([{
    id: orderId,
    orderNo,
    tokenNumber,
    organizationId: 'svv-org-001',
    branchId,
    customerName,
    customerPhone,
    source: 'WHATSAPP',
    documentUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    documentName: 'Aadhaar_Document_Live.jpg',
    pageCount: 1,
    colorMode: 'COLOR',
    copies: 1,
    totalAmount: 50,
    status: 'PENDING',
    createdAt: now,
    updatedAt: now,
  }]).select();

  if (orderErr) console.error('Order insert error:', orderErr);
  else console.log('✅ Live Order Created in Supabase:', orderData);

  // 2. Insert incoming WhatsApp message
  const { data: msgData, error: msgErr } = await supabase.from('whatsapp_messages').insert([{
    id: msgId,
    organizationId: 'svv-org-001',
    branchId,
    phone: customerPhone,
    senderName: customerName,
    messageBody: 'Please print document: Aadhaar_Document_Live.jpg',
    mediaUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    mediaType: 'IMAGE',
    isIncoming: true,
    orderId,
    createdAt: now,
  }]).select();

  if (msgErr) console.error('Message insert error:', msgErr);
  else console.log('✅ Live WhatsApp Message Ingested:', msgData);

  // 3. Insert customer confirmation auto-reply
  const receivedTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const replyText = `Your document received successfully.\nToken No: ${tokenNumber}\nReceived Time: ${receivedTime}`;

  const { data: replyData, error: replyErr } = await supabase.from('whatsapp_messages').insert([{
    id: `reply-${Date.now()}`,
    organizationId: 'svv-org-001',
    branchId,
    phone: customerPhone,
    senderName: 'SVV Print Desk',
    messageBody: replyText,
    isIncoming: false,
    orderId,
    createdAt: new Date(Date.now() + 1000).toISOString(),
  }]).select();

  if (replyErr) console.error('Reply insert error:', replyErr);
  else console.log('✅ Live Customer Confirmation Delivered:', replyData);

  console.log('\n🚀 Flow complete! Visit https://svvdigitalhub-svv.vercel.app/print-hub/queue to see Token', tokenNumber);
}

testLiveFlow().catch(console.error);
