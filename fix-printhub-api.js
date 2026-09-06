const fs = require('fs');
let content = fs.readFileSync('apps/web/src/api/printHub.api.ts', 'utf8');

const regex = /\/\/ 2\. Fallback to localStorage[\s\S]*?\} catch \(e\) \{\}/g;
content = content.replace(regex, '');

fs.writeFileSync('apps/web/src/api/printHub.api.ts', content);
console.log('Fixed printHub.api.ts');
