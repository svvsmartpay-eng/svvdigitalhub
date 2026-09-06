const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.$queryRaw`
    SELECT id, email, role FROM users LIMIT 5;
  `;
  console.log(users);
}
main().catch(console.error).finally(() => prisma.$disconnect());
