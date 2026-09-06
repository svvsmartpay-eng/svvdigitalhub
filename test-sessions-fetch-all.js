const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://kxacmxxktuvildjjvnjs.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4YWNteHhrdHV2aWxkamp2bmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNzc5NjgsImV4cCI6MjEwMzc1Mzk2OH0.bz5ObWxHckEg-9FanAP8sOz6VNPa7gKgKvEkzV0Rl74');

async function run() {
  const { data, error } = await supabase.from('whatsapp_sessions').select('*');
  console.log('All Sessions directly:', data);
  
  const { data: b } = await supabase.from('branches').select(`
    id,
    name,
    sessions:whatsapp_sessions(status)
  `);
  console.log('Branches joined:', JSON.stringify(b, null, 2));
}
run();
