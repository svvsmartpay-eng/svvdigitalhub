import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://kxacmxxktuvildjjvnjs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4YWNteHhrdHV2aWxkamp2bmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNzc5NjgsImV4cCI6MjEwMzc1Mzk2OH0.bz5ObWxHckEg-9FanAP8sOz6VNPa7gKgKvEkzV0Rl74'
);

async function searchCustomer() {
  console.log('Searching for 7780732293 in Supabase...');

  const { data: msgs } = await supabase
    .from('whatsapp_messages')
    .select('*')
    .ilike('phone', '%7780732293%');
  console.log('Messages for 7780732293:', msgs);

  const { data: orders } = await supabase
    .from('print_orders')
    .select('*')
    .ilike('customerPhone', '%7780732293%');
  console.log('Orders for 7780732293:', orders);
}

searchCustomer();
