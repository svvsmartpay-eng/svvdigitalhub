const fs = require('fs');

const fixFile = (path, match) => {
  let c = fs.readFileSync(path, 'utf8');
  c = c.replace(/import WhatsAppGatewayModal from '@\/components\/shared\/WhatsAppGatewayModal';\n/, '');
  c = c.replace(match, '');
  fs.writeFileSync(path, c);
}

fixFile('apps/web/src/pages/print-hub/PrintQueuePage.tsx', /\{\/\* ── WHATSAPP GATEWAY PAIRING & TEST INGEST MODAL ─────────────────────────── \*\/\}\n\s+<WhatsAppGatewayModal[\s\S]*?\/>/);
fixFile('apps/web/src/pages/print-hub/WhatsAppDiagnosticsPage.tsx', /<WhatsAppGatewayModal[\s\S]*?\/>/);
fixFile('apps/web/src/pages/settings/SettingsPage.tsx', /<WhatsAppGatewayModal[\s\S]*?\/>/);

console.log('Fixed others');
