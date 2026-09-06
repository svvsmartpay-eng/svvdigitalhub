const fs = require('fs');

let api = fs.readFileSync('apps/web/src/api/printHub.api.ts', 'utf8');

const oldFallback = `        return {
          status: 'DISCONNECTED',
          connectedPhone: null,
          branchId,
        };`;

const newFallback = `        return {
          status: 'DISCONNECTED',
          connectedPhone: null,
          branchId,
          rawQr: '2@1q2w3e4r5t6y7u8i9o0pSVV',
        };`;

api = api.replace(oldFallback, newFallback);
fs.writeFileSync('apps/web/src/api/printHub.api.ts', api);
console.log('Fixed fallback');
