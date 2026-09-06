const fs = require('fs');

// Fix assets.api.ts
let assets = fs.readFileSync('apps/web/src/api/assets.api.ts', 'utf8');
assets = assets.replace(/export function useAssetStats\(branchId\?: string\) \{\s*return useQuery\(\{/g, `export function useAssetStats(branchId?: string) {\n  const selectedBranches = useFilterStore(s => s.selectedBranches);\n  return useQuery({`);
fs.writeFileSync('apps/web/src/api/assets.api.ts', assets);

// Fix printHub.api.ts
let ph = fs.readFileSync('apps/web/src/api/printHub.api.ts', 'utf8');
// Error 18, 61: queryKey: ['whatsapp-inbox', selectedBranches] -> useWhatsAppInbox has it? No, maybe I missed injecting useFilterStore into useWhatsAppInbox?
// Let's re-inject const selectedBranches into usePrintOrders, useWhatsAppInbox, useTokens if missing.
ph = ph.replace(/export function useWhatsAppInbox\(\) \{\s*return useQuery\(\{/g, `export function useWhatsAppInbox() {\n  const selectedBranches = useFilterStore(s => s.selectedBranches);\n  return useQuery({`);
ph = ph.replace(/export function useTokens\(\) \{\s*return useQuery\(\{/g, `export function useTokens() {\n  const selectedBranches = useFilterStore(s => s.selectedBranches);\n  return useQuery({`);
fs.writeFileSync('apps/web/src/api/printHub.api.ts', ph);

// Fix WhatsAppGatewayModal.tsx
let modal = fs.readFileSync('apps/web/src/components/shared/WhatsAppGatewayModal.tsx', 'utf8');
if (!modal.includes("const queryClient = useQueryClient();")) {
    modal = modal.replace("export default function WhatsAppGatewayModal({ open, onClose, onOrderCreated, branchId }: WhatsAppGatewayModalProps) {", "export default function WhatsAppGatewayModal({ open, onClose, onOrderCreated, branchId }: WhatsAppGatewayModalProps) {\n  const queryClient = useQueryClient();");
}
fs.writeFileSync('apps/web/src/components/shared/WhatsAppGatewayModal.tsx', modal);

// Fix BranchListPage.tsx loading spinner text error
let bl = fs.readFileSync('apps/web/src/pages/branches/BranchListPage.tsx', 'utf8');
bl = bl.replace(/<LoadingSpinner size="lg" text="Loading branch topology\.\.\." \/>/g, '<LoadingSpinner size="lg" />');
fs.writeFileSync('apps/web/src/pages/branches/BranchListPage.tsx', bl);

console.log('Fixed TS errors.');
