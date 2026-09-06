const fs = require('fs');
const file = 'apps/web/src/api/tenant.api.ts';
let code = fs.readFileSync(file, 'utf8');

const newQueryFn = `    queryFn: async () => {
      try {
        const res = await apiClient.get('/tenants');
        if (typeof res.data === 'string' || !res.data?.success) {
          throw new Error('API returned non-JSON or unsuccessful response (likely Vercel catch-all)');
        }
        return res.data.data || [];
      } catch (err) {
        // Fallback for Vercel disconnected demo
        return [
          {
            id: 'svv-org-001',
            name: 'SVV Digital Hub',
            customDomain: null,
            themeColor: '#0D6EFD',
            isPrintHubEnabled: true,
            isTasksEnabled: true,
            isAssetsEnabled: true,
            isBillingEnabled: false,
            isReportsEnabled: true,
            isActive: true,
            subscription: null,
          }
        ];
      }
    }`;

code = code.replace(/queryFn: async \(\) => \{[\s\S]*?\}\n    \}/, newQueryFn);

fs.writeFileSync(file, code, 'utf8');
