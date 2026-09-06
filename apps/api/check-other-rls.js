const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const policies = await prisma.$queryRaw`
    SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE tablename IN ('branch_whatsapp_configs', 'system_plugin_settings');
  `;
  console.log(policies);
  
  const rlsStatus = await prisma.$queryRaw`
    SELECT relname, relrowsecurity
    FROM pg_class
    WHERE relname IN ('branch_whatsapp_configs', 'system_plugin_settings');
  `;
  console.log(rlsStatus);
}
main().catch(console.error).finally(() => prisma.$disconnect());
