const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://kxacmxxktuvildjjvnjs.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4YWNteHhrdHV2aWxkamp2bmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNzc5NjgsImV4cCI6MjEwMzc1Mzk2OH0.bz5ObWxHckEg-9FanAP8sOz6VNPa7gKgKvEkzV0Rl74');

async function run() {
  const { data } = await supabase.from('print_orders').select('id, tokenNumber, customerName, customerPhone, documentName, documentUrl').eq('tokenNumber', 'T-542').single();
  console.log('Customer Phone:', data.customerPhone);
  console.log('Customer Name:', data.customerName);
  console.log('Doc URL length:', data.documentUrl?.length, 'Doc Name:', data.documentName);
}
run();
