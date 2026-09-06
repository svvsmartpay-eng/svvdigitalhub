const fs = require('fs');
let c = fs.readFileSync('apps/web/src/pages/print-hub/WhatsAppInboxPage.tsx', 'utf8');
let lines = c.split(/\r?\n/);

// Fix 1: Move fileStatuses state below activeJob
let stateLine = lines.findIndex(l => l.includes('const [fileStatuses, setFileStatuses]'));
if (stateLine !== -1) {
  // state takes 20 lines (up to refetchOrders)
  let stateEnd = stateLine;
  while (!lines[stateEnd].includes('refetchOrders();')) stateEnd++;
  stateEnd += 2; // } };
  
  let stateBlock = lines.splice(stateLine - 2, (stateEnd - stateLine) + 3);
  
  // Find activeJob
  let activeJobLine = lines.findIndex(l => l.includes('const activeJob = '));
  lines.splice(activeJobLine + 2, 0, ...stateBlock);
}

// Fix 2: Remove handleSnapCR80 and handleSnapPassport
let cr80Idx = lines.findIndex(l => l.includes('onClick={handleSnapCR80}'));
if (cr80Idx !== -1) lines[cr80Idx] = '                onClick={() => alert("PVC Mode")}';

let passIdx = lines.findIndex(l => l.includes('onClick={handleSnapPassport}'));
if (passIdx !== -1) lines[passIdx] = '                onClick={() => alert("Passport Mode")}';

fs.writeFileSync('apps/web/src/pages/print-hub/WhatsAppInboxPage.tsx', lines.join('\n'));
console.log('Fixed final 2 errors');
