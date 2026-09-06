const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://kxacmxxktuvildjjvnjs.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4YWNteHhrdHV2aWxkamp2bmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNzc5NjgsImV4cCI6MjEwMzc1Mzk2OH0.bz5ObWxHckEg-9FanAP8sOz6VNPa7gKgKvEkzV0Rl74');

async function run() {
  const payload = {
    id: 'f5abaacc-d2b6-4591-91fb-314b2188e18c', // the first branch ID in the screenshot 1788522427889.png is "SVV Communication - Branch 1", maybe we can fetch it first
  };
  const { data: b } = await supabase.from('branches').select('*').limit(1);
  if (b && b.length > 0) {
    const branch = b[0];
    console.log('Original branch:', branch);
    const updatePayload = {
      ...branch,
      phone: '+91 99999 99999'
    };
    const { data, error } = await supabase.from('branches').upsert(updatePayload, { onConflict: 'id' });
    console.log('Update Error:', error);
  } else {
    console.log('No branches found');
  }
}
run();
