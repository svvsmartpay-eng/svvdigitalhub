const fs = require('fs');
let c = fs.readFileSync('apps/web/src/pages/print-hub/WhatsAppDiagnosticsPage.tsx', 'utf8');
c = c.replace(/\{\/\* WhatsApp Modal for reconnect \*\/\}\n\s+\{selectedBranchId && \(\n\s+\n\s+\)\}/, '');
fs.writeFileSync('apps/web/src/pages/print-hub/WhatsAppDiagnosticsPage.tsx', c);
