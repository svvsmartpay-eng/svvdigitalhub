const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const serviceCategories = ['AEPS', 'DMT', 'UPI', 'BBPS', 'Recharge', 'PAN', 'Aadhaar', 'Insurance', 'Wallet', 'Fund Transfer', 'Account Opening'];
  const portalCategories = ['Login', 'Registration', 'Password', 'User Management', 'Branch Management', 'Merchant Management'];
  const reportCategories = ['Wallet Report', 'Recharge Report', 'Transaction Report', 'Settlement Report', 'Commission Report', 'MIS Report'];
  const otherCategories = ['Feature Request', 'Enhancement', 'Bug Fix', 'Configuration Change', 'Other'];

  const createCategories = async (group, names) => {
    for (const name of names) {
      const exists = await prisma.devIssueCategory.findFirst({ where: { name, group } });
      if (!exists) {
        await prisma.devIssueCategory.create({ data: { name, group } });
        console.log(`Created: ${group} -> ${name}`);
      }
    }
  };

  await createCategories('SERVICE ISSUES', serviceCategories);
  await createCategories('PORTAL ISSUES', portalCategories);
  await createCategories('REPORTS', reportCategories);
  await createCategories('OTHERS', otherCategories);
  
  console.log('Finished seeding default categories!');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
