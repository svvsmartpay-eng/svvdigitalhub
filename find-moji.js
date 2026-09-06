const fs = require('fs');
const files = [
  'apps/web/src/pages/print-hub/PrintQueuePage.tsx',
  'apps/web/src/components/shared/CropStudioModal.tsx',
  'apps/web/src/pages/print-hub/WhatsAppInboxPage.tsx'
];
files.forEach(f => {
  const code = fs.readFileSync(f, 'utf8');
  const lines = code.split('\n');
  lines.forEach((line, i) => {
    if (line.includes('All Dates') || line.includes('Original') || line.includes('CR80')) {
      console.log(f + ':' + (i+1) + ': ' + line.trim());
    }
  });
});
