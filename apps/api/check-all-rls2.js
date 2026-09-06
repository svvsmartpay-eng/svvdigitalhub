const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const policies = await prisma.$queryRaw`
    SELECT policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE tablename = 'branches';
  `;
  console.log(policies);
}
main().catch(console.error).finally(() => prisma.$disconnect());
