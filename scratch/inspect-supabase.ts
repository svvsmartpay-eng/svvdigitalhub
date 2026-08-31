import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://kxacmxxktuvildjjvnjs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4YWNteHhrdHV2aWxkamp2bmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNzc5NjgsImV4cCI6MjEwMzc1Mzk2OH0.bz5ObWxHckEg-9FanAP8sOz6VNPa7gKgKvEkzV0Rl74'
);

async function inspectSupabase() {
  console.log('--- Inspecting Supabase Tables ---');
  const tables = [
    'users',
    'roles',
    'branches',
    'vendors',
    'technicians',
    'assets',
    'issues',
    'work_orders',
    'print_orders',
    'whatsapp_messages',
    'branch_whatsapp_configs',
  ];

  for (const table of tables) {
    try {
      const { data, count, error } = await supabase.from(table).select('*', { count: 'exact' });
      if (error) {
        console.log(`❌ Table ${table}: Error - ${error.message}`);
      } else {
        console.log(`✅ Table ${table}: ${data.length} rows (sample: ${JSON.stringify(data[0] ? Object.keys(data[0]) : 'empty')})`);
      }
    } catch (e: any) {
      console.log(`❌ Table ${table}: Exception - ${e.message}`);
    }
  }
}

inspectSupabase();
