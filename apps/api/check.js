const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.count();
  const assets = await prisma.asset.count();
  console.log(`DB check: ${users} users, ${assets} assets`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
