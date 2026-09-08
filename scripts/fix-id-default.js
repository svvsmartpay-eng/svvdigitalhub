const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tables = ['DevTeam', 'DevIssueCategory', 'DevIssue', 'DevIssueAttachment', 'DevIssueTimeline'];
  try {
    await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
    console.log('Extension pgcrypto ensured');
  } catch (e) {
    console.warn('pgcrypto notice:', e.message);
  }
  for (const t of tables) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "${t}" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();`);
      console.log(`Set default gen_random_uuid() for ${t}`);
    } catch (e) {
      console.error(`Error setting default on ${t}:`, e.message);
    }
  }
}

main().finally(() => prisma.$disconnect());
