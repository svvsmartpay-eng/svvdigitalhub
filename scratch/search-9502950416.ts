import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://kxacmxxktuvildjjvnjs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4YWNteHhrdHV2aWxkamp2bmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNzc5NjgsImV4cCI6MjEwMzc1Mzk2OH0.bz5ObWxHckEg-9FanAP8sOz6VNPa7gKgKvEkzV0Rl74'
);

async function search9502950416() {
  console.log('Searching for customer 9502950416 in Supabase...');
  const { data: orders } = await supabase.from('print_orders').select('*').ilike('customerPhone', '%9502950416%');
  console.log('Orders found:', orders);

  const { data: messages } = await supabase.from('whatsapp_messages').select('*').ilike('phone', '%9502950416%');
  console.log('Messages found:', messages);
}

search9502950416();
