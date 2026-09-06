const fs = require('fs');
const file = 'apps/web/src/App.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "import LoginPage from './pages/auth/LoginPage';",
  "import LoginPage from './pages/auth/LoginPage';\nimport SuperAdminDashboard from './pages/super-admin/SuperAdminDashboard';"
);

code = code.replace(
  "{ path: 'dashboard', element: <DashboardPage /> },",
  "{ path: 'dashboard', element: <DashboardPage /> },\n        { path: 'super-admin', element: <SuperAdminDashboard /> },"
);

fs.writeFileSync(file, code, 'utf8');
