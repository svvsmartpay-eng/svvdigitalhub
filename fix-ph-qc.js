const fs = require('fs');

let content = fs.readFileSync('apps/web/src/api/printHub.api.ts', 'utf8');
content = content.replace(/qc\.invalidateQueries\(\{ queryKey: \['print-orders', params, selectedBranches\] \}\);/g, "qc.invalidateQueries({ queryKey: ['print-orders'] });");
content = content.replace(/qc\.invalidateQueries\(\{ queryKey: \['print-orders', selectedBranches\] \}\);/g, "qc.invalidateQueries({ queryKey: ['print-orders'] });");
content = content.replace(/qc\.invalidateQueries\(\{ queryKey: \['whatsapp-inbox', selectedBranches\] \}\);/g, "qc.invalidateQueries({ queryKey: ['whatsapp-inbox'] });");
content = content.replace(/qc\.invalidateQueries\(\{ queryKey: \['print-tokens', selectedBranches\] \}\);/g, "qc.invalidateQueries({ queryKey: ['print-tokens'] });");
fs.writeFileSync('apps/web/src/api/printHub.api.ts', content);

let modal = fs.readFileSync('apps/web/src/components/shared/WhatsAppGatewayModal.tsx', 'utf8');
if (!modal.includes("const queryClient = useQueryClient();")) {
    modal = modal.replace("export default function WhatsAppGatewayModal({ open, onClose, onOrderCreated, branchId }: WhatsAppGatewayModalProps) {", "export default function WhatsAppGatewayModal({ open, onClose, onOrderCreated, branchId }: WhatsAppGatewayModalProps) {\n  const queryClient = useQueryClient();");
}
fs.writeFileSync('apps/web/src/components/shared/WhatsAppGatewayModal.tsx', modal);

console.log('Fixed qc invalidateQueries');
