const fs = require('fs');

const fixFile = (path) => {
  let c = fs.readFileSync(path, 'utf8');
  c = c.replace(/import WhatsAppGatewayModal from '@\/components\/shared\/WhatsAppGatewayModal';\n/, '');
  fs.writeFileSync(path, c);
}

fixFile('apps/web/src/pages/settings/SettingsPage.tsx');
console.log('Done');
