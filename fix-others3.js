const fs = require('fs');

const fixFile = (path) => {
  let c = fs.readFileSync(path, 'utf8');
  c = c.replace(/import WhatsAppGatewayModal from '@\/components\/shared\/WhatsAppGatewayModal';\n/, '');
  c = c.replace(/\{\/\*.*?WHATSAPP GATEWAY.*?\*\/\}\n\s+<WhatsAppGatewayModal[\s\S]*?\/>/, '');
  c = c.replace(/<WhatsAppGatewayModal[\s\S]*?\/>/, '');
  fs.writeFileSync(path, c);
}

fixFile('apps/web/src/pages/print-hub/PrintQueuePage.tsx');
fixFile('apps/web/src/pages/settings/SettingsPage.tsx');
console.log('Done');
