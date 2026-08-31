import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  'https://kxacmxxktuvildjjvnjs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4YWNteHhrdHV2aWxkamp2bmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNzc5NjgsImV4cCI6MjEwMzc1Mzk2OH0.bz5ObWxHckEg-9FanAP8sOz6VNPa7gKgKvEkzV0Rl74'
);

async function seedBothConfigs() {
  const now = new Date().toISOString();

  await supabase.from('branch_whatsapp_configs').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  const configs = [
    {
      id: crypto.randomUUID(),
      organizationId: 'svv-org-001',
      branchId: 'f5abaacc-d2b6-4591-91fb-314b2188e18c',
      whatsappNumber: '+91 77386 63866',
      displayName: 'SVV Main Hub Print Desk',
      welcomeMessage: 'Welcome to SVV Main Hub Print Desk! Send your PDF or image documents here for instant printing.',
      autoPrint: false,
      notifyOnReady: true,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: crypto.randomUUID(),
      organizationId: 'svv-org-001',
      branchId: 'f79b66ea-8739-4998-ab5c-6f3096540640',
      whatsappNumber: '+91 99515 27090',
      displayName: 'SVV Branch 2 Print Desk',
      welcomeMessage: 'Welcome to SVV Branch 2 Print Desk! Send your PDF or image documents here for instant printing.',
      autoPrint: false,
      notifyOnReady: true,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    }
  ];

  for (const c of configs) {
    const { data, error } = await supabase.from('branch_whatsapp_configs').insert([c]).select();
    if (error) console.error('Error inserting branch config:', c.displayName, error);
    else console.log('✅ Seeded branch WhatsApp config in Supabase:', c.displayName);
  }
}

seedBothConfigs();
