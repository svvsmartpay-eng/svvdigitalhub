const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRaw`DROP POLICY IF EXISTS "Enable ALL operations for authenticated users" ON branches;`;
  await prisma.$executeRaw`DROP POLICY IF EXISTS "Enable ALL for authenticated" ON branch_whatsapp_configs;`;

  await prisma.$executeRaw`
    CREATE POLICY "Enable ALL for public" 
    ON branches
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);
  `;
  
  await prisma.$executeRaw`
    CREATE POLICY "Enable ALL for public" 
    ON branch_whatsapp_configs
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);
  `;
  
  console.log("Fixed RLS for both tables to allow ALL operations for PUBLIC.");
}
main().catch(console.error).finally(() => prisma.$disconnect());
