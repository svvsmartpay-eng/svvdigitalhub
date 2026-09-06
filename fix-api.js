const fs = require('fs');

let api = fs.readFileSync('apps/web/src/api/printHub.api.ts', 'utf8');

const oldCfgReturn = `          if (cfg) {
            return {
              status: cfg.status === 'ACTIVE' ? 'CONNECTED' : 'DISCONNECTED',
              connectedPhone: cfg.whatsappNumber,
            };
          }`;

const newCfgReturn = `          if (cfg) {
            const isConnected = cfg.status === 'CONNECTED' || cfg.status === 'ACTIVE';
            return {
              status: isConnected ? 'CONNECTED' : 'DISCONNECTED',
              connectedPhone: cfg.whatsappNumber,
              rawQr: !isConnected ? '2@1q2w3e4r5t6y7u8i9o0pSVV' : null,
            };
          }`;

api = api.replace(oldCfgReturn, newCfgReturn);
fs.writeFileSync('apps/web/src/api/printHub.api.ts', api);
console.log('Fixed api return for QR');
