const fs = require('fs');
let api = fs.readFileSync('apps/web/src/api/printHub.api.ts', 'utf8');

const WA_SERVER = 'http://localhost:3001';

// Fix useStartWhatsAppGateway
api = api.replace(
  `const res = await apiClient.post(\`/print-hub/whatsapp/gateway/\${branchId}/start\`);
          if (res.data?.data) return res.data.data;`,
  `const res = await fetch(\`${WA_SERVER}/api/wa/\${branchId}/start\`, { method: 'POST' });
          if (res.ok) return await res.json();`
);

// Fix useWhatsAppGatewayStatus
api = api.replace(
  `const res = await apiClient.get(\`/print-hub/whatsapp/gateway/\${branchId}/status\`);
          if (res.data?.data) return res.data.data;`,
  `const res = await fetch(\`${WA_SERVER}/api/wa/\${branchId}/qr\`);
          if (res.ok) {
            const d = await res.json();
            return {
              status: d.status === 'CONNECTED' ? 'CONNECTED' : 'DISCONNECTED',
              connectedPhone: null,
              rawQr: d.rawQr || null,
            };
          }`
);

// Fix disconnect
api = api.replace(
  `await apiClient.post(\`/print-hub/whatsapp/gateway/\${branchId}/disconnect\`);`,
  `await fetch(\`${WA_SERVER}/api/wa/\${branchId}/disconnect\`, { method: 'POST' });`
);

fs.writeFileSync('apps/web/src/api/printHub.api.ts', api);
console.log('Fixed printHub.api.ts to use real WA server');
