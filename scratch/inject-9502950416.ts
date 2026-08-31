import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://kxacmxxktuvildjjvnjs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4YWNteHhrdHV2aWxkamp2bmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNzc5NjgsImV4cCI6MjEwMzc1Mzk2OH0.bz5ObWxHckEg-9FanAP8sOz6VNPa7gKgKvEkzV0Rl74'
);

async function inject9502950416() {
  console.log('Injecting customer 9502950416 into Supabase...');
  const now = new Date().toISOString();
  const orderId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `ord-9502950416-${Date.now()}`;
  const msgId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `msg-9502950416-${Date.now()}`;
  const branchId = 'f5abaacc-d2b6-4591-91fb-314b2188e18c';
  const phone = '+91 95029 50416';
  const customerName = 'Vishnu (9502950416)';
  const tokenNumber = 'T-117';
  const orderNo = `PRN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-117`;
  const documentUrl = 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80';
  const docName = 'Customer_Document_9502950416.pdf';

  // 1. Insert into print_orders
  const { data: ord, error: ordErr } = await supabase.from('print_orders').insert([{
    id: orderId,
    orderNo,
    tokenNumber,
    organizationId: 'svv-org-001',
    branchId,
    customerName,
    customerPhone: phone,
    source: 'WHATSAPP',
    documentUrl,
    documentName: docName,
    pageCount: 2,
    colorMode: 'COLOR',
    copies: 1,
    totalAmount: 50,
    status: 'PENDING',
    createdAt: now,
    updatedAt: now,
  }]).select();

  if (ordErr) console.error('Error creating order:', ordErr);
  else console.log('✅ Created Token T-117 in Supabase:', ord);

  // 2. Insert incoming message
  const { data: msg, error: msgErr } = await supabase.from('whatsapp_messages').insert([{
    id: msgId,
    organizationId: 'svv-org-001',
    branchId,
    phone,
    senderName: customerName,
    messageBody: `Please print document: ${docName}`,
    mediaUrl: documentUrl,
    mediaType: 'PDF',
    isIncoming: true,
    orderId,
    createdAt: now,
  }]).select();

  if (msgErr) console.error('Error inserting incoming message:', msgErr);
  else console.log('✅ Ingested WhatsApp Message for 9502950416:', msg);

  // 3. Insert customer confirmation auto-reply
  const receivedTime = new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
  const replyText = `Your document received successfully.\nToken No: ${tokenNumber}\nReceived Time: ${receivedTime}`;

  const { data: rep, error: repErr } = await supabase.from('whatsapp_messages').insert([{
    id: `reply-9502950416-${Date.now()}`,
    organizationId: 'svv-org-001',
    branchId,
    phone,
    senderName: 'SVV Print Desk',
    messageBody: replyText,
    isIncoming: false,
    orderId,
    createdAt: new Date(Date.now() + 1000).toISOString(),
  }]).select();

  if (repErr) console.error('Error inserting auto-reply:', repErr);
  else console.log('✅ Saved Customer Auto-Reply Confirmation:', rep);
}

inject9502950416().catch(console.error);
