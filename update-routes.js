const fs = require('fs');
const file = 'apps/api/src/routes/index.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "import authRoutes from '../modules/auth/auth.routes';",
  "import authRoutes from '../modules/auth/auth.routes';\nimport tenantRoutes from '../modules/tenant/tenant.routes';"
);

code = code.replace(
  "router.use('/auth', authRoutes);",
  "router.use('/auth', authRoutes);\nrouter.use('/tenants', tenantRoutes);"
);

fs.writeFileSync(file, code, 'utf8');
