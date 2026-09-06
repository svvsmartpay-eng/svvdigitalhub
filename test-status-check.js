const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://kxacmxxktuvildjjvnjs.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4YWNteHhrdHV2aWxkamp2bmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNzc5NjgsImV4cCI6MjEwMzc1Mzk2OH0.bz5ObWxHckEg-9FanAP8sOz6VNPa7gKgKvEkzV0Rl74');

async function run() {
  const branchId = 'branch-123';

  // Check branch_whatsapp_configs
  const { data: cfg } = await supabase.from('branch_whatsapp_configs').select('*').eq('branchId', branchId);
  console.log('WA Config for Test branch:', cfg);

  // Check whatsapp_sessions
  const { data: sess } = await supabase.from('whatsapp_sessions').select('*').eq('branchId', branchId);
  console.log('WA Sessions for Test branch:', sess);
}
run();
