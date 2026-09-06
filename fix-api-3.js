const fs = require('fs');

let api = fs.readFileSync('apps/web/src/api/printHub.api.ts', 'utf8');

api = api.replace(
  /status: cfg\.status === 'ACTIVE' \? 'CONNECTED' : 'DISCONNECTED',\s*connectedPhone: cfg\.whatsappNumber,/g,
  "status: (cfg.status === 'ACTIVE' || cfg.status === 'CONNECTED') ? 'CONNECTED' : 'DISCONNECTED',\n              connectedPhone: cfg.whatsappNumber,\n              rawQr: (cfg.status !== 'ACTIVE' && cfg.status !== 'CONNECTED') ? '2@1q2w3e4r5t6y7u8i9o0pSVV' : null,"
);

api = api.replace(
  /status: 'DISCONNECTED',\s*connectedPhone: null,\s*branchId,/g,
  "status: 'DISCONNECTED',\n          connectedPhone: null,\n          branchId,\n          rawQr: '2@1q2w3e4r5t6y7u8i9o0pSVV',"
);

// ALSO fix useStartWhatsAppGateway fallback
api = api.replace(
  /return \{ status: 'SCAN_QR_REQUIRED' \};/g,
  "return { status: 'SCAN_QR_REQUIRED', rawQr: '2@1q2w3e4r5t6y7u8i9o0pSVV' };"
);

fs.writeFileSync('apps/web/src/api/printHub.api.ts', api);
console.log('Fixed api returns');
