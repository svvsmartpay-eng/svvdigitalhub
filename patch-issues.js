const fs = require('fs');

let content = fs.readFileSync('apps/web/src/api/issues.api.ts', 'utf8');

if (!content.includes("useFilterStore")) {
    content = content.replace("import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';", "import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';\nimport { useFilterStore } from '@/stores/filter.store';");
}

// Patch useIssues
content = content.replace(/export function useIssues\(params\?: any\) \{\s*return useQuery\(\{/g, `export function useIssues(params?: any) {
  const selectedBranches = useFilterStore(s => s.selectedBranches);
  return useQuery({`);

content = content.replace(/queryKey: \['issues', params\]/g, "queryKey: ['issues', params, selectedBranches]");

content = content.replace(/const \{ data: supaIssues, error \} = await supabase\s*\.from\('issues'\)\s*\.select\('\*, branch:branches\(name, code\), asset:assets\(name, assetId\)'\)\s*\.order\('createdAt', \{ ascending: false \}\);/g, `let query = supabase.from('issues').select('*, branch:branches(name, code), asset:assets(name, assetId)').order('createdAt', { ascending: false });
        if (selectedBranches.length > 0) query = query.in('branchId', selectedBranches);
        const { data: supaIssues, error } = await query;`);

// Patch useIssueStats
content = content.replace(/export function useIssueStats\(branchId\?: string\) \{\s*return useQuery\(\{/g, `export function useIssueStats(branchId?: string) {
  const selectedBranches = useFilterStore(s => s.selectedBranches);
  return useQuery({`);

content = content.replace(/queryKey: \['issue-stats', branchId\]/g, "queryKey: ['issue-stats', branchId, selectedBranches]");

content = content.replace(/const \{ data: supaIssues \} = await supabase\.from\('issues'\)\.select\('status, priority'\);/g, `let query = supabase.from('issues').select('status, priority');
        if (selectedBranches.length > 0) query = query.in('branchId', selectedBranches);
        const { data: supaIssues } = await query;`);

fs.writeFileSync('apps/web/src/api/issues.api.ts', content);
console.log('Fixed issues.api.ts');
