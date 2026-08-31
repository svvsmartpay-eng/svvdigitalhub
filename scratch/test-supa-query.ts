import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://kxacmxxktuvildjjvnjs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4YWNteHhrdHV2aWxkamp2bmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNzc5NjgsImV4cCI6MjEwMzc1Mzk2OH0.bz5ObWxHckEg-9FanAP8sOz6VNPa7gKgKvEkzV0Rl74'
);

async function testQuery() {
  console.log('Testing joined query in Supabase...');
  const { data, error } = await supabase
    .from('print_orders')
    .select('*, branch:branches(name), assignedStaff:users(name)')
    .order('createdAt', { ascending: false });

  if (error) {
    console.error('❌ Query failed with error:', error);
  } else {
    console.log('✅ Query succeeded! Rows returned:', data?.length);
  }

  console.log('\nTesting plain select * from print_orders...');
  const { data: plainData, error: plainError } = await supabase
    .from('print_orders')
    .select('*')
    .order('createdAt', { ascending: false });

  if (plainError) {
    console.error('❌ Plain query failed:', plainError);
  } else {
    console.log('✅ Plain query succeeded! Rows returned:', plainData?.length);
    console.log('Latest row:', plainData?.[0]);
  }
}

testQuery();
