import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  'https://kxacmxxktuvildjjvnjs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4YWNteHhrdHV2aWxkamp2bmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNzc5NjgsImV4cCI6MjEwMzc1Mzk2OH0.bz5ObWxHckEg-9FanAP8sOz6VNPa7gKgKvEkzV0Rl74'
);

async function seedMessages() {
  const now = new Date().toISOString();
  const phone = '+91 93923 06031';
  const customerName = 'Chandra Mohan Reddy';

  // Delete previous messages for this phone to avoid any duplicates
  await supabase.from('whatsapp_messages').delete().eq('phone', phone);

  // Get T-108 order ID
  const { data: ord } = await supabase.from('print_orders').select('id').eq('tokenNumber', 'T-108').single();
  const orderId = ord?.id || crypto.randomUUID();

  const files = [
    {
      name: 'Aadhaar Front.jpg',
      url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
      type: 'IMAGE',
      caption: 'Please print photo: Aadhaar Front.jpg',
    },
    {
      name: 'Aadhaar Back.jpg',
      url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&auto=format&fit=crop&q=80',
      type: 'IMAGE',
      caption: 'Please print photo: Aadhaar Back.jpg',
    },
    {
      name: 'PAN Card.pdf',
      url: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600&auto=format&fit=crop&q=80',
      type: 'PDF',
      caption: 'Please print document: PAN Card.pdf',
    },
    {
      name: 'Resume.docx',
      url: '/uploads/NASINA (1).docx',
      type: 'DOC',
      caption: 'Please print document: Resume.docx',
    },
  ];

  for (const f of files) {
    const { error: msgErr } = await supabase.from('whatsapp_messages').insert([{
      id: crypto.randomUUID(),
      organizationId: 'svv-org-001',
      branchId: 'f5abaacc-d2b6-4591-91fb-314b2188e18c',
      phone,
      senderName: customerName,
      messageBody: f.caption,
      mediaUrl: f.url,
      mediaType: f.type,
      isIncoming: true,
      orderId: orderId,
      createdAt: now,
    }]);
    if (msgErr) console.error('Error inserting message:', f.name, msgErr);
    else console.log('✅ Inserted media file message:', f.name);
  }

  console.log('✅ All 4 files inserted successfully for Chandra Mohan Reddy!');
}

seedMessages();
