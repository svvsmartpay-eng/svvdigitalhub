const fs = require('fs');

let content = fs.readFileSync('apps/web/src/api/dashboard.api.ts', 'utf8');

if (!content.includes("useFilterStore")) {
    content = content.replace("import { useQuery } from '@tanstack/react-query';", "import { useQuery } from '@tanstack/react-query';\nimport { useFilterStore } from '@/stores/filter.store';");
}

content = content.replace(/export function useDashboard\(params\?: any\) \{\s*return useQuery\(\{/g, `export function useDashboard(params?: any) {
  const selectedBranches = useFilterStore(s => s.selectedBranches);
  return useQuery({`);

content = content.replace(/queryKey: \['dashboard', params\]/g, "queryKey: ['dashboard', params, selectedBranches]");

content = content.replace(/const branchFilter = params\?\.branchId;/g, "const branchFilter = params?.branchId;\n      const sb = selectedBranches;");

content = content.replace(/supabase\.from\('assets'\)\.select\('\*', \{ count: 'exact', head: true \}\)\.in\('status', \['OPERATIONAL', 'BREAKDOWN', 'MAINTENANCE', 'DECOMMISSIONED'\]\),/g, `
(sb.length > 0 ? supabase.from('assets').select('*', { count: 'exact', head: true }).in('status', ['OPERATIONAL', 'BREAKDOWN', 'MAINTENANCE', 'DECOMMISSIONED']).in('branchId', sb) : supabase.from('assets').select('*', { count: 'exact', head: true }).in('status', ['OPERATIONAL', 'BREAKDOWN', 'MAINTENANCE', 'DECOMMISSIONED'])),
`);

content = content.replace(/supabase\.from\('assets'\)\.select\('\*', \{ count: 'exact', head: true \}\)\.eq\('status', 'OPERATIONAL'\),/g, `(sb.length > 0 ? supabase.from('assets').select('*', { count: 'exact', head: true }).eq('status', 'OPERATIONAL').in('branchId', sb) : supabase.from('assets').select('*', { count: 'exact', head: true }).eq('status', 'OPERATIONAL')),`);

content = content.replace(/supabase\.from\('assets'\)\.select\('\*', \{ count: 'exact', head: true \}\)\.eq\('status', 'BREAKDOWN'\),/g, `(sb.length > 0 ? supabase.from('assets').select('*', { count: 'exact', head: true }).eq('status', 'BREAKDOWN').in('branchId', sb) : supabase.from('assets').select('*', { count: 'exact', head: true }).eq('status', 'BREAKDOWN')),`);

content = content.replace(/supabase\.from\('issues'\)\.select\('\*', \{ count: 'exact', head: true \}\)\.eq\('status', 'OPEN'\),/g, `(sb.length > 0 ? supabase.from('issues').select('*', { count: 'exact', head: true }).eq('status', 'OPEN').in('branchId', sb) : supabase.from('issues').select('*', { count: 'exact', head: true }).eq('status', 'OPEN')),`);

content = content.replace(/supabase\.from\('issues'\)\.select\('\*', \{ count: 'exact', head: true \}\)\.eq\('priority', 'CRITICAL'\)\.neq\('status', 'RESOLVED'\),/g, `(sb.length > 0 ? supabase.from('issues').select('*', { count: 'exact', head: true }).eq('priority', 'CRITICAL').neq('status', 'RESOLVED').in('branchId', sb) : supabase.from('issues').select('*', { count: 'exact', head: true }).eq('priority', 'CRITICAL').neq('status', 'RESOLVED')),`);

content = content.replace(/supabase\.from\('service_visits'\)\.select\('\*', \{ count: 'exact', head: true \}\)\.eq\('status', 'IN_PROGRESS'\),/g, `(sb.length > 0 ? supabase.from('service_visits').select('*', { count: 'exact', head: true }).eq('status', 'IN_PROGRESS').in('branchId', sb) : supabase.from('service_visits').select('*', { count: 'exact', head: true }).eq('status', 'IN_PROGRESS')),`);


fs.writeFileSync('apps/web/src/api/dashboard.api.ts', content);
console.log('Fixed dashboard.api.ts');
