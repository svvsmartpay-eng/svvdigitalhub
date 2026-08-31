import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://kxacmxxktuvildjjvnjs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4YWNteHhrdHV2aWxkamp2bmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNzc5NjgsImV4cCI6MjEwMzc1Mzk2OH0.bz5ObWxHckEg-9FanAP8sOz6VNPa7gKgKvEkzV0Rl74'
);

async function check() {
  const { data: orders, error: oErr } = await supabase.from('print_orders').select('*');
  console.log('Print Orders from Supabase:', orders?.length, 'error:', oErr);
  if (orders && orders.length > 0) {
    console.log('First order:', orders[0].tokenNumber, orders[0].customerName, orders[0].customerPhone);
  }

  const { data: users, error: uErr } = await supabase.from('users').select('id, name, email');
  console.log('Users from Supabase:', users?.length, 'error:', uErr);
}

check();
