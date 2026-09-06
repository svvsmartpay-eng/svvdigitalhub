const fs = require('fs');

let content = fs.readFileSync('apps/web/src/api/tasks.api.ts', 'utf8');

if (!content.includes("useFilterStore")) {
    content = content.replace("import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';", "import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';\nimport { useFilterStore } from '@/stores/filter.store';\nimport { supabase } from '@/lib/supabase';");
}

content = content.replace(/export function useTasks\(params\?: any\) \{\s*return useQuery\(\{\s*queryKey: \['tasks', params\],\s*queryFn: async \(\) => \{\s*const r = await apiClient\.get\('\/tasks', \{ params \}\);\s*return r\.data;\s*\},\s*\}\);\s*\}/, 
`export function useTasks(params?: any) {
  const selectedBranches = useFilterStore(s => s.selectedBranches);
  return useQuery({
    queryKey: ['tasks', params, selectedBranches],
    queryFn: async () => {
      try {
        const r = await apiClient.get('/tasks', { params });
        if (r.data?.data && r.data.data.length > 0) return r.data.data;
      } catch (err) {}
      
      // Fallback
      let query = supabase.from('tasks').select('*, branch:branches(name), assignedTo:users!TaskAssignedTo(name)').order('createdAt', { ascending: false });
      if (selectedBranches.length > 0) query = query.in('branchId', selectedBranches);
      const { data, error } = await query;
      if (!error && data) return data;
      return [];
    },
  });
}`);

content = content.replace(/export function useTaskStats\(branchId\?: string\) \{\s*return useQuery\(\{\s*queryKey: \['task-stats', branchId\],\s*queryFn: async \(\) => \{\s*const r = await apiClient\.get\('\/tasks\/stats', \{ params: \{ branchId \} \}\);\s*return r\.data\.data;\s*\},\s*\}\);\s*\}/,
`export function useTaskStats(branchId?: string) {
  const selectedBranches = useFilterStore(s => s.selectedBranches);
  return useQuery({
    queryKey: ['task-stats', branchId, selectedBranches],
    queryFn: async () => {
      try {
        const r = await apiClient.get('/tasks/stats', { params: { branchId } });
        if (r.data?.data) return r.data.data;
      } catch (err) {}
      
      let query = supabase.from('tasks').select('status, priority');
      if (selectedBranches.length > 0) query = query.in('branchId', selectedBranches);
      const { data } = await query;
      const list = data || [];
      return {
        total: list.length,
        pending: list.filter((t: any) => t.status !== 'COMPLETED' && t.status !== 'CLOSED').length,
        completed: list.filter((t: any) => t.status === 'COMPLETED').length,
      };
    },
  });
}`);

fs.writeFileSync('apps/web/src/api/tasks.api.ts', content);
console.log('Fixed tasks.api.ts');
