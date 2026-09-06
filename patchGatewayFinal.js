const fs = require('fs');
let c = fs.readFileSync('apps/web/src/components/shared/WhatsAppGatewayModal.tsx', 'utf8');

// Ensure fallbackQr state exists
if (!c.includes('const [fallbackQr, setFallbackQr]')) {
  c = c.replace(
    /const \[sessionStatus, setSessionStatus\]/,
    "const [fallbackQr, setFallbackQr] = useState<string | null>(null);\n  const [sessionStatus, setSessionStatus]"
  );
}

// Generate fallback QR instantly
const effectCode = `  useEffect(() => {
    if (!open || !branchPhone) return;
    const digits = branchPhone.replace(/[^0-9]/g, '');
    const withCountry = digits.startsWith('91') && digits.length === 12 ? digits : \`91\${digits.slice(-10)}\`;
    const link = \`https://wa.me/\${withCountry}?text=\${encodeURIComponent(\`Hi \${branchName || 'SVV Print Desk'}, I want to print a document.\`)}\`;
    setFallbackQr(link);
  }, [open, branchPhone, branchName]);

  const handleConfirmLinked = async`;

c = c.replace(/const handleConfirmLinked = async/g, effectCode);

// Fix the button UI because they don't want "Click Start Session", they want it instant.
c = c.replace(
  /\{gatewayData\?\.status === 'SCAN_QR_REQUIRED' \? 'Waiting for Scan\.\.\.' : 'Start Session & Get QR'\}/g,
  "{gatewayData?.status === 'SCAN_QR_REQUIRED' ? 'Waiting for Scan...' : 'Confirm Linked & Save'}"
);
c = c.replace(
  /\{gatewayData\?\.status === 'SCAN_QR_REQUIRED' \? 'Loading QR\.\.\.' : 'Click Start Session to generate QR'\}/g,
  "{'Loading QR...'}"
);

fs.writeFileSync('apps/web/src/components/shared/WhatsAppGatewayModal.tsx', c);
