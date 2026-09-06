const fs = require('fs');
const file = 'apps/web/src/api/reports.api.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/enabled: false,.*?\n/g, '');
code = code.replace(/enabled: false\n/g, '');

fs.writeFileSync(file, code, 'utf8');
