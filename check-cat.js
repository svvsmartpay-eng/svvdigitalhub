const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const categories = await prisma.devIssueCategory.findMany();
  console.log('Count:', categories.length);
  if (categories.length > 0) console.log('First:', categories[0]);
}
check().finally(() => prisma.$disconnect());
