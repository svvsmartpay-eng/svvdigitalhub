const fs = require('fs');

let ph = fs.readFileSync('apps/web/src/api/printHub.api.ts', 'utf8');
ph = ph.replace(/export function useTokensBoard\(branchId\?: string\) \{/g, `export function useTokensBoard(branchId?: string) {\n  const selectedBranches = useFilterStore(s => s.selectedBranches);`);
fs.writeFileSync('apps/web/src/api/printHub.api.ts', ph);

let modal = fs.readFileSync('apps/web/src/components/shared/WhatsAppGatewayModal.tsx', 'utf8');
if (!modal.includes("const queryClient = useQueryClient();")) {
    modal = modal.replace("export default function WhatsAppGatewayModal({", "export default function WhatsAppGatewayModal({\n  open,\n  onClose,\n  onOrderCreated,\n  branchId,\n}: WhatsAppGatewayModalProps) {\n  const queryClient = useQueryClient();\n/* ");
    // Actually simpler: just find the first `const [sessionStatus` and put it before it.
    modal = fs.readFileSync('apps/web/src/components/shared/WhatsAppGatewayModal.tsx', 'utf8');
    modal = modal.replace(/const \[sessionStatus/g, "const queryClient = useQueryClient();\n  const [sessionStatus");
}
fs.writeFileSync('apps/web/src/components/shared/WhatsAppGatewayModal.tsx', modal);

console.log('Fixed last TS errors');
