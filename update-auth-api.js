const fs = require('fs');
const file = 'apps/web/src/api/auth.api.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /organizationId:\s*'svv-org-001',/g,
  `organizationId: 'svv-org-001',
          organization: {
            id: 'svv-org-001',
            name: 'SVV Digital Hub',
            customDomain: null,
            themeColor: '#0D6EFD',
            isPrintHubEnabled: true,
            isTasksEnabled: true,
            isAssetsEnabled: true,
            isBillingEnabled: false,
            isReportsEnabled: true,
          },`
);

fs.writeFileSync(file, code, 'utf8');
