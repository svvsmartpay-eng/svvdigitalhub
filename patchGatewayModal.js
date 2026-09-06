const fs = require('fs');
let c = fs.readFileSync('apps/web/src/components/shared/WhatsAppGatewayModal.tsx', 'utf8');

// 1. Add imports
c = c.replace(
  /import \{ useQueryClient \} from '@tanstack\/react-query';/,
  "import { useQueryClient } from '@tanstack/react-query';\nimport { useWhatsAppGatewayStatus, useStartWhatsAppGateway, useDisconnectWhatsAppGateway } from '@/api/printHub.api';"
);

// 2. Add hooks
c = c.replace(
  /const qc = useQueryClient\(\);/,
  "const qc = useQueryClient();\n  const { data: gatewayData, refetch: refetchGateway } = useWhatsAppGatewayStatus(branchId, open);\n  const startGatewayMutation = useStartWhatsAppGateway();\n  const disconnectGatewayMutation = useDisconnectWhatsAppGateway();"
);

// 3. Remove fake loadSession logic
c = c.replace(
  /    \/\/ ---------------------------------------------------------------------------[\s\S]*?loadSession\(\);\r?\n    \}, \[open, branchId\]\);/m,
  `    useEffect(() => {
      if (!open) return;
      try {
        const local = localStorage.getItem('svv_branches_store');
        if (local) {
          const list = JSON.parse(local);
          const match = list.find((b: any) => b.id === branchId) || list[0];
          if (match) {
            setBranchName(match.name || '');
            setBranchCode(match.code || '');
            setBranchPhone(match.whatsappNumber || match.phone || '');
          }
        }
      } catch {}
    }, [open, branchId]);

    // Poll status frequently when open
    useEffect(() => {
      if (!open) return;
      const interval = setInterval(() => refetchGateway(), 3000);
      return () => clearInterval(interval);
    }, [open, refetchGateway]);

    // Set session status based on real gateway data
    useEffect(() => {
      if (!gatewayData) return;
      if (gatewayData.status === 'CONNECTED') {
        setSessionStatus('CONNECTED');
        setConnectedNumber(branchPhone);
      } else {
        setSessionStatus('DISCONNECTED');
      }
    }, [gatewayData, branchPhone]);`
);

// 4. Remove generateQR and qrTimerRef
c = c.replace(
  /    \/\/ ---------------------------------------------------------------------------[\s\S]*?generateQR\(\);\r?\n          return 20;\r?\n        \}\r?\n        return prev - 1;\r?\n      \}\);\r?\n    \}, 1000\);\r?\n  \}, \[open, sessionStatus, generateQR\]\);/m,
  ""
);

// Remove the standalone states that are no longer needed
c = c.replace(/const \[rawQr, setRawQr\] = useState<string>\(''\);/, "");
c = c.replace(/const \[qrCountdown, setQrCountdown\] = useState<number>\(20\);/, "");
c = c.replace(/const qrTimerRef = useRef<any>\(null\);/, "");


// 5. Update the "handleConfirmLinked" to trigger start session instead of fake confirm
c = c.replace(
  /  const handleConfirmLinked = async \(\) => \{[\s\S]*?setSessionStatus\('CONNECTED'\);\r?\n      setLoading\(false\);\r?\n    \}, 1200\);\r?\n  \};/,
  `  const handleConfirmLinked = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await startGatewayMutation.mutateAsync(branchId);
      setSuccessMsg('Gateway start requested. Waiting for QR scan...');
      refetchGateway();
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to start gateway');
    } finally {
      setLoading(false);
    }
  };`
);

// 6. Update handleDisconnect to use real disconnect
c = c.replace(
  /  const handleDisconnect = async \(\) => \{[\s\S]*?setSessionStatus\('DISCONNECTED'\);\r?\n      setLoading\(false\);\r?\n    \}, 800\);\r?\n  \};/,
  `  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect WhatsApp?')) return;
    setLoading(true);
    try {
      await disconnectGatewayMutation.mutateAsync(branchId);
      setSessionStatus('DISCONNECTED');
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to disconnect');
    } finally {
      setLoading(false);
    }
  };`
);


// 7. Update rendering of QR code
c = c.replace(
  /                      \{rawQr \? \(/,
  "                      {gatewayData?.rawQr ? ("
);
c = c.replace(
  /                          value=\{rawQr\}/,
  "                          value={gatewayData.rawQr}"
);
c = c.replace(
  /                      \} : \(/,
  "                      } : ("
);
c = c.replace(
  /                            Set branch phone number to generate QR/,
  "                            {gatewayData?.status === 'SCAN_QR_REQUIRED' ? 'Loading QR...' : 'Click Confirm Linked to generate QR'}"
);
c = c.replace(
  /                      \{rawQr && \(/,
  "                      {gatewayData?.rawQr && ("
);

// Update QR refresh text
c = c.replace(
  /                        <span>QR refreshes in <strong>\{qrCountdown\}s<\/strong><\/span>\r?\n                        <button onClick=\{generateQR\} className="text-\[#00a884\] hover:text-white underline text-\[11px\] cursor-pointer ml-2">\r?\n                          Refresh\r?\n                        <\/button>/,
  `                        <span>QR status: <strong>{gatewayData?.status || 'IDLE'}</strong></span>
                        <button onClick={() => refetchGateway()} className="text-[#00a884] hover:text-white underline text-[11px] cursor-pointer ml-2">
                          Refresh
                        </button>`
);

c = c.replace(
  /<span>Confirm Linked \?" \{branchPhone\}<\/span>/,
  "<span>{gatewayData?.status === 'SCAN_QR_REQUIRED' ? 'Waiting for Scan...' : 'Start Session & Get QR'}</span>"
);

fs.writeFileSync('apps/web/src/components/shared/WhatsAppGatewayModal.tsx', c);
