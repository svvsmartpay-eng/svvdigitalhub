const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRaw`DROP POLICY IF EXISTS "whasup" ON branch_whatsapp_configs;`;
  } catch(e) { console.error(e); }

  await prisma.$executeRaw`
    CREATE POLICY "Enable ALL for authenticated" 
    ON branch_whatsapp_configs
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
  `;
  
  console.log("Fixed RLS for branch_whatsapp_configs.");
}
main().catch(console.error).finally(() => prisma.$disconnect());
