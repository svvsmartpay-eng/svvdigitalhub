const fs = require('fs');
let content = fs.readFileSync('prisma/schema.prisma', 'utf8');

const sessionModel = `
model WhatsAppSession {
  id           String   @id @default(uuid())
  branchId     String   @unique
  phoneNumber  String
  sessionId    String   @unique
  status       String   @default("DISCONNECTED") // CONNECTED, DISCONNECTED
  connectedAt  DateTime?
  lastSeen     DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  branch       Branch   @relation(fields: [branchId], references: [id], onDelete: Cascade)

  @@map("whatsapp_sessions")
}
`;

if (!content.includes('model WhatsAppSession')) {
  // Insert before model BranchWhatsAppConfig or just at the end
  content += '\n' + sessionModel;
  // Also add `whatsappSession WhatsAppSession?` to `model Branch`
  content = content.replace(/workOrders     WorkOrder\[\]/g, "workOrders     WorkOrder[]\n  whatsappSession WhatsAppSession?");
  fs.writeFileSync('prisma/schema.prisma', content);
  console.log('Updated schema.prisma');
}
