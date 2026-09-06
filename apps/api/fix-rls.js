const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Drop the old single INSERT policy if it exists (but we can also just leave it or recreate it as ALL)
  try {
    await prisma.$executeRaw`DROP POLICY IF EXISTS "branches" ON branches;`;
  } catch(e) { console.error(e); }

  // Create an ALL policy for authenticated users
  await prisma.$executeRaw`
    CREATE POLICY "Enable ALL operations for authenticated users" 
    ON branches
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
  `;
  
  console.log("Policy updated successfully.");
}
main().catch(console.error).finally(() => prisma.$disconnect());
