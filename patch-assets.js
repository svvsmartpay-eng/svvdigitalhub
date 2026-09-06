const fs = require('fs');

let content = fs.readFileSync('apps/web/src/api/assets.api.ts', 'utf8');

if (!content.includes("useFilterStore")) {
    content = content.replace("import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';", "import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';\nimport { useFilterStore } from '@/stores/filter.store';");
}

// Patch useAssets
content = content.replace(/export function useAssets\(params\?: any\) \{\s*return useQuery\(\{/g, `export function useAssets(params?: any) {
  const selectedBranches = useFilterStore(s => s.selectedBranches);
  return useQuery({`);

content = content.replace(/queryKey: \['assets', params\]/g, "queryKey: ['assets', params, selectedBranches]");

content = content.replace(/const \{ data: supaAssets, error \} = await supabase\s*\.from\('assets'\)\s*\.select\('\*, branch:branches\(name\), category:categories\(name\)'\)\s*\.order\('createdAt', \{ ascending: false \}\);/g, `let query = supabase.from('assets').select('*, branch:branches(name), category:categories(name)').order('createdAt', { ascending: false });
        if (selectedBranches.length > 0) query = query.in('branchId', selectedBranches);
        const { data: supaAssets, error } = await query;`);

// Patch useAssetStats
content = content.replace(/export function useAssetStats\(\) \{\s*return useQuery\(\{/g, `export function useAssetStats() {
  const selectedBranches = useFilterStore(s => s.selectedBranches);
  return useQuery({`);

content = content.replace(/queryKey: \['asset-stats'\]/g, "queryKey: ['asset-stats', selectedBranches]");

content = content.replace(/const \{ data: supaAssets \} = await supabase\.from\('assets'\)\.select\('status, criticality'\);/g, `let query = supabase.from('assets').select('status, criticality');
        if (selectedBranches.length > 0) query = query.in('branchId', selectedBranches);
        const { data: supaAssets } = await query;`);

fs.writeFileSync('apps/web/src/api/assets.api.ts', content);
console.log('Fixed assets.api.ts');
