const fs = require('fs');
const file = 'apps/web/src/components/shared/CropStudioModal.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/preset === 'A4'/g, "preset === 'A4_PORT'");

fs.writeFileSync(file, code, 'utf8');
