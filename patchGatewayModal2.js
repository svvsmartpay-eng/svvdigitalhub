const fs = require('fs');
let c = fs.readFileSync('apps/web/src/components/shared/WhatsAppGatewayModal.tsx', 'utf8');

c = c.replace(
  /    \/\/ ---------------------------------------------------------------------------[\s\S]*?const generateQR = useCallback\(\(\) => \{[\s\S]*?\}, \[open, sessionStatus, generateQR\]\);/g,
  ""
);

// We also need to fix the button rendering because there is a `generateQR` onClick remaining near the bottom
c = c.replace(
  /<span>QR refreshes in <strong>\{qrCountdown\}s<\/strong><\/span>\s*<button onClick=\{generateQR\} className="text-\[#00a884\] hover:text-white underline text-\[11px\] cursor-pointer ml-2">\s*Refresh\s*<\/button>/g,
  `<span>QR status: <strong>{gatewayData?.status || 'IDLE'}</strong></span>
  <button onClick={() => refetchGateway()} className="text-[#00a884] hover:text-white underline text-[11px] cursor-pointer ml-2">
    Refresh
  </button>`
);

fs.writeFileSync('apps/web/src/components/shared/WhatsAppGatewayModal.tsx', c);
