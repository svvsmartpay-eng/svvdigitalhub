const fs = require('fs');
const code = fs.readFileSync('apps/web/src/pages/print-hub/PrintQueuePage.tsx', 'utf8');
const lines = code.split('\n');
lines.forEach((l, i) => {
  if (l.includes('') || l.includes('ðŸ') || l.includes('A,?o?')) {
    console.log(i+1, l.trim());
  }
});
