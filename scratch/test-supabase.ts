import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  'https://kxacmxxktuvildjjvnjs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4YWNteHhrdHV2aWxkamp2bmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNzc5NjgsImV4cCI6MjEwMzc1Mzk2OH0.bz5ObWxHckEg-9FanAP8sOz6VNPa7gKgKvEkzV0Rl74'
);

async function testInsert() {
  const tokenNumber = `T-${Math.floor(100 + Math.random() * 900)}`;
  const orderNo = `ORD-${Date.now()}`;
  const now = new Date().toISOString();
  const insertPayload = {
    id: crypto.randomUUID(),
    orderNo,
    tokenNumber,
    organizationId: 'svv-org-001',
    branchId: 'f5abaacc-d2b6-4591-91fb-314b2188e18c',
    customerName: 'Test Walk-in Customer',
    customerPhone: '+91 98888 77777',
    source: 'MANUAL_COUNTER',
    documentUrl: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600&auto=format&fit=crop&q=80',
    documentName: 'Test_Doc.pdf',
    pageCount: 1,
    colorMode: 'COLOR',
    copies: 1,
    totalAmount: 100,
    status: 'PENDING',
    createdAt: now,
    updatedAt: now,
  };

  const { data, error } = await supabase.from('print_orders').insert([insertPayload]).select();
  if (error) {
    console.error('Insert Error:', error);
  } else {
    console.log('✅ Successfully Inserted into Supabase:', data);
  }
}

testInsert();
