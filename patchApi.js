const fs = require('fs');
let c = fs.readFileSync('apps/web/src/api/printHub.api.ts', 'utf8');

c = c.replace(
  /        try \{\r?\n          const res = await apiClient.post\(`\/print-hub\/whatsapp\/gateway\/\$\{branchId\}\/start`\);\r?\n          if \(res.data\?\.data\) return res.data.data;\r?\n        \} catch \{\}/,
  `        try {
          const res = await apiClient.post(\`/print-hub/whatsapp/gateway/\${branchId}/start\`);
          if (res.data?.data) return res.data.data;
        } catch {
          try {
            const res = await fetch(\`http://localhost:4000/api/print-hub/whatsapp/gateway/\${branchId}/start\`, { method: 'POST', headers: { 'Authorization': \`Bearer \${localStorage.getItem('auth-storage') ? JSON.parse(localStorage.getItem('auth-storage')).state.accessToken : ''}\` } });
            const json = await res.json();
            if (json?.data) return json.data;
          } catch {}
        }`
);

c = c.replace(
  /        try \{\r?\n          const res = await apiClient.get\(`\/print-hub\/whatsapp\/gateway\/\$\{branchId\}\/status`\);\r?\n          if \(res.data\?\.data\) return res.data.data;\r?\n        \} catch \{\}/,
  `        try {
          const res = await apiClient.get(\`/print-hub/whatsapp/gateway/\${branchId}/status\`);
          if (res.data?.data) return res.data.data;
        } catch {
          try {
            const res = await fetch(\`http://localhost:4000/api/print-hub/whatsapp/gateway/\${branchId}/status\`, { headers: { 'Authorization': \`Bearer \${localStorage.getItem('auth-storage') ? JSON.parse(localStorage.getItem('auth-storage')).state.accessToken : ''}\` } });
            const json = await res.json();
            if (json?.data) return json.data;
          } catch {}
        }`
);

fs.writeFileSync('apps/web/src/api/printHub.api.ts', c);
