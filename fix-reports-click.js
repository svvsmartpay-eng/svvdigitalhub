const fs = require('fs');
const file = 'apps/web/src/pages/reports/ReportsPage.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  'onClick={() => setActiveReport(report.key)}',
  'onClick={() => { console.log("Opening report:", report.key); setActiveReport(report.key); }}'
);

fs.writeFileSync(file, code, 'utf8');
