const fs = require('fs');

let content = fs.readFileSync('apps/web/src/components/shared/WhatsAppGatewayModal.tsx', 'utf8');

// 1. Remove localStorage loading
content = content.replace(/try \{\n\s*const local = localStorage\.getItem\('svv_branches_store'\);[\s\S]*?\} catch \{\}/g, '');

// 2. Add useQueryClient
if (!content.includes("useQueryClient")) {
    content = content.replace("import { useAuthStore } from '@/stores/auth.store';", "import { useAuthStore } from '@/stores/auth.store';\nimport { useQueryClient } from '@tanstack/react-query';");
}

// 3. Inject queryClient
content = content.replace("export default function WhatsAppGatewayModal({ open, onClose, onOrderCreated, branchId }: WhatsAppGatewayModalProps) {", "export default function WhatsAppGatewayModal({ open, onClose, onOrderCreated, branchId }: WhatsAppGatewayModalProps) {\n  const queryClient = useQueryClient();");

// 4. Remove localStorage saving and use invalidateQueries
const saveBlock = `const local = localStorage.getItem('svv_branches_store');
      if (local) {
        const list = JSON.parse(local);
        const updated = list.map((b: any) =>
          b.id === branchId ? { ...b, sessionStatus: 'CONNECTED', whatsappNumber: branchPhone } : b
        );
        localStorage.setItem('svv_branches_store', JSON.stringify(updated));
        window.dispatchEvent(new Event('storage'));
      }`;
      
content = content.replace(saveBlock, "queryClient.invalidateQueries({ queryKey: ['branches'] });");

fs.writeFileSync('apps/web/src/components/shared/WhatsAppGatewayModal.tsx', content);
console.log('Fixed WhatsAppGatewayModal.tsx');
