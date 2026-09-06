const fs = require('fs');
let content = fs.readFileSync('apps/web/src/pages/print-hub/WhatsAppInboxPage.tsx', 'utf8');

content = content.replace(
  /const cleanRelUrl = url\.startsWith\('http'\)\n\s*\? url\.replace\(\/\^http:\\\/\\\/\[\^\/\]\+\/,\s*''\)\n\s*: \(url\.startsWith\('\/'\) \? url : `\/\$\{url\}`\);\n\s*const directBackendUrl = url\.startsWith\('http'\) \? url : `http:\/\/localhost:4000\$\{cleanRelUrl\}`;/,
  `const isDataUrl = url.startsWith('data:');\n      const cleanRelUrl = url.startsWith('http')\n        ? url.replace(/^http:\\/\\/[^/]+/, '')\n        : (url.startsWith('/') ? url : \`/\${url}\`);\n      const directBackendUrl = url.startsWith('http') || isDataUrl ? url : \`http://localhost:4000\${cleanRelUrl}\`;`
);

content = content.replace(
  /const tryLoadImg = \(src: string, isRetry = false\) => \{\n\s*const img = new Image\(\);\n\s*img\.crossOrigin = 'anonymous';/,
  `const tryLoadImg = (src: string, isRetry = false) => {\n          const img = new Image();\n          if (!src.startsWith('data:')) img.crossOrigin = 'anonymous';`
);

fs.writeFileSync('apps/web/src/pages/print-hub/WhatsAppInboxPage.tsx', content);
console.log("CORS fixed.");
