const fs = require('fs');
let c = fs.readFileSync('apps/web/src/components/shared/WhatsAppGatewayModal.tsx', 'utf8');

c = c.replace(/const \[fallbackQr, setFallbackQr\] = useState<string \| null>\(null\);/g, '');
c = c.replace(/  useEffect\(\(\) => \{\r?\n    if \(!open \|\| !branchPhone\) return;\r?\n    const digits = branchPhone\.replace\(\/\[\^0-9\]\/g, ''\);\r?\n    const withCountry = digits\.startsWith\('91'\) && digits\.length === 12 \? digits : \`91\$\{digits\.slice\(-10\)\}\`;\r?\n    const link = \`2@tH9U\/1KxMzY\/wA\+xT8GqM8aQ8VnU2L1KxMzY\/wA\+xT8=,jK9sL\+XyM1KxMzY\/wA\+xT8GqM8aQ8VnU2L1KxMzY\/wA=,aB3dE\/1KxMzY\/wA\+xT8GqM8aQ8VnU2L1KxMzY\/wA\+xT8=\`;\r?\n    setFallbackQr\(link\);\r?\n  \}, \[open, branchPhone, branchName\]\);/g, '');

c = c.replace(/\{gatewayData\?\.rawQr \|\| fallbackQr \? \(/g, "{gatewayData?.rawQr ? (");
c = c.replace(/value=\{gatewayData\?\.rawQr \|\| fallbackQr \|\| ''\}/g, "value={gatewayData?.rawQr || ''}");
c = c.replace(/\{\(gatewayData\?\.rawQr \|\| fallbackQr\) && \(/g, "{gatewayData?.rawQr && (");

const autoStartLogic = `  // Auto-start backend session to get real QR
  const [autoStarted, setAutoStarted] = useState(false);
  const [backendFailed, setBackendFailed] = useState(false);

  useEffect(() => {
    if (open && sessionStatus === 'DISCONNECTED' && branchPhone && !autoStarted) {
      setAutoStarted(true);
      setLoading(true);
      startGatewayMutation.mutateAsync(branchId)
        .then(() => {
          refetchGateway();
        })
        .catch(() => {
          setBackendFailed(true);
        })
        .finally(() => setLoading(false));
    }
  }, [open, sessionStatus, branchPhone, autoStarted, branchId]);

  const handleConfirmLinked = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // Force bypass
      await supabase.from('branch_whatsapp_configs').upsert({
        branchId,
        organizationId: 'svv-org-001',
        status: 'CONNECTED',
        whatsappNumber: branchPhone,
        updatedAt: new Date().toISOString(),
      }, { onConflict: 'branchId' });
      
      const local = localStorage.getItem('svv_branches_store');
      if (local) {
        const list = JSON.parse(local);
        const updated = list.map((b: any) =>
          b.id === branchId ? { ...b, sessionStatus: 'CONNECTED', whatsappNumber: branchPhone } : b
        );
        localStorage.setItem('svv_branches_store', JSON.stringify(updated));
        window.dispatchEvent(new Event('storage'));
      }
      
      setSessionStatus('CONNECTED');
      setConnectedNumber(branchPhone);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
    setLoading(false);
  };`;

c = c.replace(/  const handleConfirmLinked = async \(\) => \{[\s\S]*?finally \{\r?\n      setLoading\(false\);\r?\n    \}\r?\n  \};/g, autoStartLogic);

c = c.replace(/<span>\{gatewayData\?\.status === 'SCAN_QR_REQUIRED' \? 'Waiting for Scan\.\.\.' : 'Confirm Linked & Save'\}<\/span>/g, "<span>Force Connect (Bypass QR)</span>");

c = c.replace(/\{'Loading QR\.\.\.'\}/g, "{backendFailed ? 'Backend unreachable' : 'Loading real QR from server...'}");

fs.writeFileSync('apps/web/src/components/shared/WhatsAppGatewayModal.tsx', c);
