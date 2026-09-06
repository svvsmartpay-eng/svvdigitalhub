const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function main() {
  const { data, error } = await supabase.from('branches').upsert({
    id: 'test-rls-uuid-1234',
    organizationId: 'svv-org-001',
    name: 'RLS Test',
    code: 'RLS',
    isActive: false,
    updatedAt: new Date().toISOString()
  });
  console.log("Upsert error?", error);
}
main().catch(console.error);
