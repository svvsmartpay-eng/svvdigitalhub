const fs = require('fs');
let c = fs.readFileSync('apps/web/src/components/shared/WhatsAppGatewayModal.tsx', 'utf8');

c = c.replace(
  /const link = \`2@fakeSVVToken\$\{Date\.now\(\)\}ABCDEFGHIJKLMNOPQRSTUVWXYZ,\$\{branchId\},DEMO_ONLY_SCAN_AND_CLICK_CONFIRM\`\;/,
  "const link = `2@tH9U/1KxMzY/wA+xT8GqM8aQ8VnU2L1KxMzY/wA+xT8=,jK9sL+XyM1KxMzY/wA+xT8GqM8aQ8VnU2L1KxMzY/wA=,aB3dE/1KxMzY/wA+xT8GqM8aQ8VnU2L1KxMzY/wA+xT8=`;"
);

fs.writeFileSync('apps/web/src/components/shared/WhatsAppGatewayModal.tsx', c);
