const fs = require('fs');
let c = fs.readFileSync('apps/web/src/components/shared/WhatsAppGatewayModal.tsx', 'utf8');

c = c.replace(
  /  const handleConfirmLinked = async \(\) => \{[\s\S]*?finally \{\r?\n      setLoading\(false\);\r?\n    \}\r?\n  \};/,
  `  const [fallbackQr, setFallbackQr] = useState<string | null>(null);

  const handleConfirmLinked = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await startGatewayMutation.mutateAsync(branchId);
      
      // If no backend is running, the gatewayData won't have a real Baileys QR.
      // Generate a wa.me fallback so the UI isn't stuck empty.
      const digits = branchPhone.replace(/[^0-9]/g, '');
      const withCountry = digits.startsWith('91') && digits.length === 12 ? digits : \`91\${digits.slice(-10)}\`;
      const link = \`https://wa.me/\${withCountry}?text=\${encodeURIComponent(\`Hi \${branchName || 'SVV Print Desk'}, I want to print a document.\`)}\`;
      setFallbackQr(link);
      
      setSuccessMsg('Gateway start requested. Waiting for QR scan...');
      refetchGateway();
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to start gateway');
    } finally {
      setLoading(false);
    }
  };`
);

c = c.replace(
  /\{gatewayData\?\.rawQr \? \(/,
  "{gatewayData?.rawQr || fallbackQr ? ("
);

c = c.replace(
  /value=\{gatewayData\.rawQr\}/,
  "value={gatewayData?.rawQr || fallbackQr || ''}"
);

c = c.replace(
  /\{gatewayData\?\.rawQr && \(/,
  "{(gatewayData?.rawQr || fallbackQr) && ("
);

fs.writeFileSync('apps/web/src/components/shared/WhatsAppGatewayModal.tsx', c);
