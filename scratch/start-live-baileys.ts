import { startBranchWhatsAppSession, getSessionStatus } from '../apps/api/src/modules/print-hub/whatsappGateway.service';
import qrcodeTerminal from 'qrcode-terminal';

async function startLiveBaileys() {
  const branchId = 'f5abaacc-d2b6-4591-91fb-314b2188e18c';
  const orgId = 'svv-org-001';

  console.log('---------------------------------------------------------');
  console.log('🔄 Initializing Live WhatsApp Baileys Engine for Branch 1...');
  console.log('---------------------------------------------------------');

  await startBranchWhatsAppSession(orgId, branchId);

  // Wait 4 seconds for QR generation
  await new Promise(r => setTimeout(r, 4000));

  const status = getSessionStatus(branchId);
  console.log('\nStatus:', status.status);

  if (status.status === 'SCAN_QR_REQUIRED') {
    console.log('\n📱 LIVE QR CODE GENERATED SUCCESSFULLY!');
    console.log('👉 Open WhatsApp on your phone -> Settings (or 3 dots) -> Linked Devices -> Link a Device');
    console.log('👉 Point camera at the QR code below:\n');
  } else if (status.status === 'CONNECTED') {
    console.log('\n✅ ALREADY CONNECTED LIVE AS:', status.connectedPhone);
  }
}

startLiveBaileys().catch(console.error);
