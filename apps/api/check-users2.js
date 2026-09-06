const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cols = await prisma.$queryRaw`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'users';
  `;
  console.log(cols);
}
main().catch(console.error).finally(() => prisma.$disconnect());
