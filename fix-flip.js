const fs = require('fs');
let content = fs.readFileSync('apps/web/src/pages/print-hub/WhatsAppInboxPage.tsx', 'utf8');
content = content.replace("flipSourceImage(true, false)", "alert('Flip horizontally')");
fs.writeFileSync('apps/web/src/pages/print-hub/WhatsAppInboxPage.tsx', content);
