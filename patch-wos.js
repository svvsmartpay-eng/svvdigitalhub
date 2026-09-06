const fs = require('fs');

let content = fs.readFileSync('apps/web/src/api/workOrders.api.ts', 'utf8');

if (!content.includes("useFilterStore")) {
    content = content.replace("import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';", "import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';\nimport { useFilterStore } from '@/stores/filter.store';");
}

content = content.replace(/export function useWorkOrders\(params\?: any\) \{\s*return useQuery\(\{/g, `export function useWorkOrders(params?: any) {
  const selectedBranches = useFilterStore(s => s.selectedBranches);
  return useQuery({`);

content = content.replace(/queryKey: \['work-orders', params\]/g, "queryKey: ['work-orders', params, selectedBranches]");

content = content.replace(/const \{ data: supaWOs, error \} = await supabase\s*\.from\('work_orders'\)\s*\.select\('\*, branch:branches\(name, code\), asset:assets\(name, assetId\)'\)\s*\.order\('createdAt', \{ ascending: false \}\);/g, `let query = supabase.from('work_orders').select('*, branch:branches(name, code), asset:assets(name, assetId)').order('createdAt', { ascending: false });
        if (selectedBranches.length > 0) query = query.in('branchId', selectedBranches);
        const { data: supaWOs, error } = await query;`);

fs.writeFileSync('apps/web/src/api/workOrders.api.ts', content);
console.log('Fixed workOrders.api.ts');
