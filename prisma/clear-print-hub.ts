import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('--- Cleaning Print Hub & WhatsApp Tokens / Orders ---');
  
  try {
    const deletedOrders = await prisma.printOrder.deleteMany({});
    console.log(`Deleted ${deletedOrders.count} existing print orders.`);
  } catch (e: any) {
    console.log('PrintOrder table clean:', e.message);
  }

  try {
    const deletedMsgs = await prisma.whatsAppMessage.deleteMany({});
    console.log(`Deleted ${deletedMsgs.count} existing WhatsApp messages.`);
  } catch (e: any) {
    console.log('WhatsAppMessage table clean:', e.message);
  }

  console.log('--- Database is completely fresh and ready for live new tokens! ---');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
