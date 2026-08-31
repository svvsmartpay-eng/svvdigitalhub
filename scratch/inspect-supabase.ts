import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://kxacmxxktuvildjjvnjs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4YWNteHhrdHV2aWxkamp2bmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNzc5NjgsImV4cCI6MjEwMzc1Mzk2OH0.bz5ObWxHckEg-9FanAP8sOz6VNPa7gKgKvEkzV0Rl74'
);

async function inspect() {
  const { data: orders } = await supabase.from('print_orders').select('*').order('createdAt', { ascending: false });
  console.log('--- SUPABASE PRINT ORDERS ---');
  console.table(orders?.map(o => ({
    id: o.id,
    token: o.tokenNumber,
    name: o.customerName,
    phone: o.customerPhone,
    doc: o.documentName,
    url: o.documentUrl,
    status: o.status,
    createdAt: o.createdAt,
  })));

  const { data: msgs } = await supabase.from('whatsapp_messages').select('*').order('createdAt', { ascending: false });
  console.log('--- SUPABASE WHATSAPP MESSAGES ---');
  console.table(msgs?.map(m => ({
    id: m.id,
    phone: m.phone,
    sender: m.senderName,
    msg: m.messageBody,
    media: m.mediaUrl,
    type: m.mediaType,
    incoming: m.isIncoming,
    createdAt: m.createdAt,
  })));
}

inspect();
