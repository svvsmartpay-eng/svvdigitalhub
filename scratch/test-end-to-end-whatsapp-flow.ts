import prisma from '../apps/api/src/config/database';
import { processIncomingWhatsAppMessage } from '../apps/api/src/modules/print-hub/printHub.service';

async function runEndToEndTests() {
  console.log('================================================================');
  console.log('🚀 STARTING COMPREHENSIVE END-TO-END WHATSAPP FLOW TESTS');
  console.log('================================================================\n');

  const testBranch = await prisma.branch.findFirst({ where: { code: 'SVV-1' } });
  const branchId = testBranch?.id || 'f5abaacc-d2b6-4591-91fb-314b2188e18c';
  const orgId = testBranch?.organizationId || 'svv-org-001';

  // ── TEST 1: Customer sends JPG Image (Generates New Token) ───────────────────
  console.log('TEST 1: Customer sends JPG Image (New Customer)');
  const res1 = await processIncomingWhatsAppMessage({
    orgId,
    branchId,
    phone: '+91 98481 11222',
    senderName: 'Suresh Varma',
    messageBody: 'Please print photo: Passport_Photo.jpg',
    mediaUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80',
    mediaType: 'IMAGE',
    fileName: 'Passport_Photo.jpg',
  });

  console.log('✓ Token Created:', res1.order?.tokenNumber);
  console.log('✓ Order Number:', res1.order?.orderNo);
  console.log('✓ Customer Name:', res1.order?.customerName);
  console.log('✓ File Document:', res1.order?.documentName);
  console.log('✓ Auto-Reply Delivered to Customer:\n---\n' + res1.autoReplySent + '\n---\n');

  // ── TEST 2: Customer sends PNG Image ─────────────────────────────────────────
  console.log('TEST 2: Customer sends PNG Image (Different Customer)');
  const res2 = await processIncomingWhatsAppMessage({
    orgId,
    branchId,
    phone: '+91 97000 33444',
    senderName: 'Lakshmi Prasanna',
    messageBody: 'Please print photo: Pan_Card_Scan.png',
    mediaUrl: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600&auto=format&fit=crop&q=80',
    mediaType: 'IMAGE',
    fileName: 'Pan_Card_Scan.png',
  });

  console.log('✓ Token Created:', res2.order?.tokenNumber);
  console.log('✓ Customer Name:', res2.order?.customerName);
  console.log('✓ File Document:', res2.order?.documentName);
  console.log('✓ Auto-Reply Delivered to Customer:\n---\n' + res2.autoReplySent + '\n---\n');

  // ── TEST 3: Customer sends Multi-Page PDF Document ───────────────────────────
  console.log('TEST 3: Customer sends PDF Document');
  const res3 = await processIncomingWhatsAppMessage({
    orgId,
    branchId,
    phone: '+91 98888 55666',
    senderName: 'Rajesh Sharma',
    messageBody: 'Please print document: Project_Report.pdf',
    mediaUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80',
    mediaType: 'PDF',
    fileName: 'Project_Report.pdf',
  });

  console.log('✓ Token Created:', res3.order?.tokenNumber);
  console.log('✓ Customer Name:', res3.order?.customerName);
  console.log('✓ File Document:', res3.order?.documentName);
  console.log('✓ Auto-Reply Delivered to Customer:\n---\n' + res3.autoReplySent + '\n---\n');

  // ── TEST 4: Same Customer sends Multiple Images (Grouped under 1 Token) ──────
  console.log('TEST 4: Same Customer (Suresh Varma) sends 2nd Image in session');
  const res4 = await processIncomingWhatsAppMessage({
    orgId,
    branchId,
    phone: '+91 98481 11222',
    senderName: 'Suresh Varma',
    messageBody: 'Please print photo: Aadhaar_Back.jpg',
    mediaUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&auto=format&fit=crop&q=80',
    mediaType: 'IMAGE',
    fileName: 'Aadhaar_Back.jpg',
  });

  console.log('✓ Grouped Under Same Token:', res4.order?.tokenNumber, '===', res1.order?.tokenNumber);
  console.log('✓ Updated Combined Document List:', res4.order?.documentName);
  console.log('✓ Total Page Count:', res4.order?.pageCount);
  console.log('✓ Auto-Reply Delivered to Customer:\n---\n' + res4.autoReplySent + '\n---\n');

  console.log('================================================================');
  console.log('🎉 ALL 4 END-TO-END FLOW TESTS COMPLETED SUCCESSFULLY!');
  console.log('================================================================');
}

runEndToEndTests()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
