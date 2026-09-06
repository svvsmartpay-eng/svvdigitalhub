const fs = require('fs');

let content = fs.readFileSync('apps/web/src/api/printHub.api.ts', 'utf8');

// Inject useFilterStore
if (!content.includes("useFilterStore")) {
    content = content.replace("import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';", "import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';\nimport { useFilterStore } from '@/stores/filter.store';");
}

// Update usePrintOrders
content = content.replace(/export function usePrintOrders\(params\?: any\) \{\s*return useQuery\(\{/g, `export function usePrintOrders(params?: any) {
  const selectedBranches = useFilterStore(s => s.selectedBranches);
  return useQuery({`);
  
content = content.replace(/const \{ data: supaOrders, error \} = await supabase\s*\.from\('print_orders'\)\s*\.select\('\*, branch:branches\(name\), assignedStaff:users\(name\)'\)/g, `let query = supabase.from('print_orders').select('*, branch:branches(name), assignedStaff:users(name)');
          if (selectedBranches.length > 0) {
            query = query.in('branchId', selectedBranches);
          }
          const { data: supaOrders, error } = await query`);

// Update useWhatsAppInbox
content = content.replace(/export function useWhatsAppInbox\(\) \{\s*return useQuery\(\{/g, `export function useWhatsAppInbox() {
  const selectedBranches = useFilterStore(s => s.selectedBranches);
  return useQuery({`);

content = content.replace(/const \{ data: supaMsgs, error \} = await supabase\s*\.from\('whatsapp_messages'\)\s*\.select\('\*, branch:branches\(name\)'\)/g, `let query = supabase.from('whatsapp_messages').select('*, branch:branches(name)');
          if (selectedBranches.length > 0) {
            query = query.in('branchId', selectedBranches);
          }
          const { data: supaMsgs, error } = await query`);

// Update useTokens
content = content.replace(/export function useTokens\(\) \{\s*return useQuery\(\{/g, `export function useTokens() {
  const selectedBranches = useFilterStore(s => s.selectedBranches);
  return useQuery({`);

content = content.replace(/const \{ data: supaOrders \} = await supabase\s*\.from\('print_orders'\)\s*\.select\('\*'\)\s*\.order\('createdAt', \{ ascending: false \}\);/g, `let query = supabase.from('print_orders').select('*').order('createdAt', { ascending: false });
          if (selectedBranches.length > 0) {
            query = query.in('branchId', selectedBranches);
          }
          const { data: supaOrders } = await query;`);
          
// Query Key Invalidation - Update query keys to include selectedBranches
content = content.replace(/queryKey: \['print-orders', params\]/g, "queryKey: ['print-orders', params, selectedBranches]");
content = content.replace(/queryKey: \['whatsapp-inbox'\]/g, "queryKey: ['whatsapp-inbox', selectedBranches]");
content = content.replace(/queryKey: \['print-tokens'\]/g, "queryKey: ['print-tokens', selectedBranches]");

fs.writeFileSync('apps/web/src/api/printHub.api.ts', content);
console.log('Fixed printHub.api.ts branch filtering');
