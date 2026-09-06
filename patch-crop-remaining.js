const fs = require('fs');
const file = 'apps/web/src/components/shared/CropStudioModal.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/aspectPreset === 'A4'/g, "aspectPreset === 'A4_PORT'");
code = code.replace(/applyAspectPreset\('A4'\)/g, "applyAspectPreset('A4_PORT')");

fs.writeFileSync(file, code, 'utf8');
