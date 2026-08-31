import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://kxacmxxktuvildjjvnjs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4YWNteHhrdHV2aWxkamp2bmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNzc5NjgsImV4cCI6MjEwMzc1Mzk2OH0.bz5ObWxHckEg-9FanAP8sOz6VNPa7gKgKvEkzV0Rl74'
);

async function checkAllData() {
  console.log('================ SUPABASE CLOUD DATA AUDIT ================');
  
  const tables = [
    'organizations',
    'branches',
    'users',
    'categories',
    'assets',
    'issues',
    'work_orders',
    'print_orders',
    'whatsapp_messages',
    'branch_whatsapp_configs',
  ];

  for (const table of tables) {
    const { data, error, count } = await supabase.from(table).select('*', { count: 'exact' });
    if (error) {
      console.log(`❌ Table [${table}]:`, error.message);
    } else {
      console.log(`✅ Table [${table}]: ${data?.length} records`);
    }
  }

  console.log('\n--- LIVE PRINT ORDERS IN SUPABASE ---');
  const { data: printOrders } = await supabase.from('print_orders').select('*').order('createdAt', { ascending: false });
  console.table(printOrders?.map(p => ({
    token: p.tokenNumber,
    customer: p.customerName,
    phone: p.customerPhone,
    docs: p.documentName,
    status: p.status,
    amount: p.totalAmount,
  })));

  console.log('\n--- LIVE WHATSAPP MESSAGES IN SUPABASE ---');
  const { data: msgs } = await supabase.from('whatsapp_messages').select('*').order('createdAt', { ascending: false });
  console.table(msgs?.map(m => ({
    sender: m.senderName,
    phone: m.phone,
    media: m.mediaUrl ? m.mediaUrl.split('/').pop() : 'none',
    body: m.messageBody?.slice(0, 40),
  })));
  
  console.log('================ DATA PUSH AUDIT COMPLETE ================');
}

checkAllData();
