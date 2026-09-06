const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const supabase = createClient('https://kxacmxxktuvildjjvnjs.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4YWNteHhrdHV2aWxkamp2bmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNzc5NjgsImV4cCI6MjEwMzc1Mzk2OH0.bz5ObWxHckEg-9FanAP8sOz6VNPa7gKgKvEkzV0Rl74');

async function testInsert() {
  const branchId = 'branch-123';
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const randomToken = `T-${Math.floor(100 + Math.random() * 900)}`;
  const dateStr = new Date().toISOString().slice(0,10).replace(/-/g, '');
  const orderNo = `PRN-${dateStr}-${Math.floor(1000 + Math.random() * 9000)}`;

  const insertPayload = {
    id: id,
    orderNo: orderNo,
    organizationId: 'svv-org-001',
    branchId: branchId,
    customerName: 'Test Customer',
    customerPhone: '+917738663866',
    source: 'WHATSAPP',
    documentUrl: '/uploads/sample.pdf',
    documentName: 'test_doc.pdf',
    pageCount: 1,
    colorMode: 'BW',
    copies: 1,
    doubleSided: false,
    paperSize: 'A4',
    notes: 'Test note from script',
    totalAmount: 10,
    isPaid: false,
    tokenNumber: randomToken,
    status: 'PENDING',
    createdAt: now,
    updatedAt: now,
  };

  const { data, error } = await supabase.from('print_orders').insert(insertPayload).select().single();
  console.log('Result:', data);
  console.log('Error:', error);
}

testInsert();
