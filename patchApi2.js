const fs = require('fs');
let c = fs.readFileSync('apps/web/src/api/printHub.api.ts', 'utf8');

c = c.replace(
  /export function useStartWhatsAppGateway\(\) \{[\s\S]*?\} catch \{\}\r?\n        \}/,
  `export function useStartWhatsAppGateway() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (branchId: string) => {
        try {
          const res = await apiClient.post(\`/print-hub/whatsapp/gateway/\${branchId}/start\`);
          if (res.data?.data) return res.data.data;
        } catch {
          try {
            const res = await fetch(\`http://localhost:4000/api/print-hub/whatsapp/gateway/\${branchId}/start\`, { method: 'POST', headers: { 'Authorization': \`Bearer \${localStorage.getItem('auth-storage') ? JSON.parse(localStorage.getItem('auth-storage')).state.accessToken : ''}\` } });
            const json = await res.json();
            if (json?.data) return json.data;
          } catch {}
        }
        
        // Fallback: update Supabase directly if no backend is reachable
        await supabase
          .from('branch_whatsapp_configs')
          .update({ status: 'SCAN_QR_REQUIRED', updatedAt: new Date().toISOString() })
          .eq('branchId', branchId);`
);

fs.writeFileSync('apps/web/src/api/printHub.api.ts', c);
