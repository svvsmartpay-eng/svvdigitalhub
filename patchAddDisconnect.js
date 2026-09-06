const fs = require('fs');
let c = fs.readFileSync('apps/web/src/components/shared/WhatsAppGatewayModal.tsx', 'utf8');

c = c.replace(/  const handleTestOrder = \(\) => \{/g, `  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect WhatsApp?')) return;
    setLoading(true);
    try {
      await disconnectGatewayMutation.mutateAsync(branchId);
      setSessionStatus('DISCONNECTED');
      setAutoStarted(false);
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to disconnect');
    } finally {
      setLoading(false);
    }
  };

  const handleTestOrder = () => {`);

fs.writeFileSync('apps/web/src/components/shared/WhatsAppGatewayModal.tsx', c);
