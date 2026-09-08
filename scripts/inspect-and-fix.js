const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspectAndFix() {
  const cols = await prisma.$queryRawUnsafe(`
    SELECT table_name, column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name IN ('DevTeam', 'DevIssueCategory', 'DevIssue', 'DevIssueAttachment', 'DevIssueTimeline')
    AND is_nullable = 'NO'
    ORDER BY table_name, column_name;
  `);
  console.log("Non-nullable columns:");
  console.table(cols);

  // Apply default now() to createdAt and updatedAt if not present
  const tables = ['DevTeam', 'DevIssueCategory', 'DevIssue', 'DevIssueAttachment', 'DevIssueTimeline'];
  for (const t of tables) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "${t}" ALTER COLUMN "createdAt" SET DEFAULT now();`);
      console.log(`Set default now() for ${t}.createdAt`);
    } catch (e) {
      console.log(`Notice ${t}.createdAt:`, e.message);
    }
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "${t}" ALTER COLUMN "updatedAt" SET DEFAULT now();`);
      console.log(`Set default now() for ${t}.updatedAt`);
    } catch (e) {
      console.log(`Notice ${t}.updatedAt:`, e.message);
    }
  }

  // Also make sure DevIssue has default for status, priority, tags
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "DevIssue" ALTER COLUMN "status" SET DEFAULT 'OPEN';`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "DevIssue" ALTER COLUMN "priority" SET DEFAULT 'MEDIUM';`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "DevIssue" ALTER COLUMN "tags" SET DEFAULT '[]';`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "DevTeam" ALTER COLUMN "publicToken" SET DEFAULT encode(gen_random_bytes(16), 'hex');`);
    console.log("Set defaults for DevIssue status, priority, tags, and DevTeam publicToken");
  } catch (e) {
    console.log("Notice DevIssue defaults:", e.message);
  }
}

inspectAndFix().finally(() => prisma.$disconnect());
