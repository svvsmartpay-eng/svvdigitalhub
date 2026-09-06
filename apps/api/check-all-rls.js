const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const policies = await prisma.$queryRaw`
    SELECT *
    FROM pg_policies
    WHERE tablename = 'branches' OR tablename = 'profiles';
  `;
  console.log(policies);
}
main().catch(console.error).finally(() => prisma.$disconnect());
