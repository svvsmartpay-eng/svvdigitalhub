const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const rls = await prisma.$queryRaw`
    SELECT relrowsecurity
    FROM pg_class
    WHERE relname = 'branches';
  `;
  console.log(rls);
}
main().catch(console.error).finally(() => prisma.$disconnect());
