const fs = require('fs');
const file = 'apps/web/src/pages/reports/ReportsPage.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /className="w-full text-xs font-bold text-\[\#0D6EFD\] border-\[\#B6D4FE\] hover:bg-\[\#EFF6FF\]"/g,
  'className="w-full text-xs font-bold text-[#0D6EFD] border-[#B6D4FE] hover:bg-[#EFF6FF] cursor-pointer"'
);

fs.writeFileSync(file, code, 'utf8');
