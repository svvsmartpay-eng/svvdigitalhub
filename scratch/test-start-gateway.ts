import { startBranchWhatsAppSession, getSessionStatus } from '../apps/api/src/modules/print-hub/whatsappGateway.service';

async function testStartSession() {
  const branchId = 'f5abaacc-d2b6-4591-91fb-314b2188e18c';
  const orgId = 'svv-org-001';

  console.log('Starting WhatsApp Gateway Session for branch:', branchId);
  const result = await startBranchWhatsAppSession(orgId, branchId);
  console.log('Initial result:', { status: result.status, hasQR: Boolean(result.qrCodeDataUrl) });

  // Wait 4 seconds for Baileys QR code generation
  await new Promise(r => setTimeout(r, 4000));

  const statusAfter = getSessionStatus(branchId);
  console.log('Status after 4s:', {
    status: statusAfter.status,
    hasQR: Boolean(statusAfter.qrCodeDataUrl),
    connectedPhone: statusAfter.connectedPhone,
  });

  process.exit(0);
}

testStartSession().catch(console.error);
