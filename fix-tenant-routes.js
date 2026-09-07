const fs = require('fs');
const file = 'apps/api/src/modules/tenant/tenant.routes.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "import { requireAuth, requireRoles } from '../../middleware/auth.middleware';",
  "import { authenticate } from '../../middleware/auth.middleware';\nimport { requireRole } from '../../middleware/rbac.middleware';"
);

code = code.replace(
  "router.use(requireAuth);\nrouter.use(requireRoles(['SUPER_ADMIN']));",
  "router.use(authenticate);\nrouter.use(requireRole('SUPER_ADMIN'));"
);

fs.writeFileSync(file, code, 'utf8');
