import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedPrintHub() {
  try {
    const org = await prisma.organization.findFirst();
    if (!org) {
      console.log('No organization found.');
      return;
    }

    const branches = await prisma.branch.findMany({
      where: { organizationId: org.id },
    });

    if (branches.length === 0) {
      console.log('No branches found.');
      return;
    }

    const b1 = branches[0];
    const b2 = branches[1] || branches[0];

    // Enable plugin by default
    await prisma.systemPluginSetting.upsert({
      where: {
        organizationId_pluginKey: {
          organizationId: org.id,
          pluginKey: 'print_whatsapp_hub',
        },
      },
      create: {
        organizationId: org.id,
        pluginKey: 'print_whatsapp_hub',
        isEnabled: true,
      },
      update: {
        isEnabled: true,
      },
    });

    // Check existing print orders
    const count = await prisma.printOrder.count({ where: { organizationId: org.id } });
    if (count === 0) {
      console.log('Seeding demo Print Orders and WhatsApp messages...');
      
      const orders = [
        {
          orderNo: 'PRN-20260828-001',
          tokenNumber: 'T-101',
          organizationId: org.id,
          branchId: b1.id,
          customerName: 'Nagaraju Varma',
          customerPhone: '+91 98480 12345',
          source: 'WHATSAPP' as const,
          documentUrl: '/uploads/aadhaar.pdf',
          documentName: 'Aadhaar_Card_Front_Back.pdf',
          pageCount: 2,
          colorMode: 'COLOR' as const,
          copies: 2,
          totalAmount: 40,
          isPaid: true,
          paymentMode: 'UPI',
          status: 'READY_FOR_DELIVERY' as const,
          completedAt: new Date(),
        },
        {
          orderNo: 'PRN-20260828-002',
          tokenNumber: 'T-102',
          organizationId: org.id,
          branchId: b1.id,
          customerName: 'Sita Devi',
          customerPhone: '+91 99890 54321',
          source: 'WHATSAPP' as const,
          documentUrl: '/uploads/ration_card.pdf',
          documentName: 'Ration_Card_Telugu.pdf',
          pageCount: 1,
          colorMode: 'BW' as const,
          copies: 3,
          totalAmount: 6,
          isPaid: true,
          paymentMode: 'CASH',
          status: 'PRINTING' as const,
        },
        {
          orderNo: 'PRN-20260828-003',
          tokenNumber: 'T-103',
          organizationId: org.id,
          branchId: b2.id,
          customerName: 'Kalyan Rao',
          customerPhone: '+91 94400 98765',
          source: 'SELF_SERVICE_KIOSK' as const,
          documentUrl: '/uploads/resume.pdf',
          documentName: 'Resume_SoftwareEngineer.pdf',
          pageCount: 3,
          colorMode: 'BW' as const,
          copies: 2,
          totalAmount: 12,
          isPaid: true,
          paymentMode: 'UPI',
          status: 'PENDING' as const,
        },
        {
          orderNo: 'PRN-20260828-004',
          tokenNumber: 'T-104',
          organizationId: org.id,
          branchId: b1.id,
          customerName: 'Anil Kumar',
          customerPhone: '+91 91234 56780',
          source: 'MANUAL_COUNTER' as const,
          documentUrl: '/uploads/bank_passbook.pdf',
          documentName: 'SBI_Passbook_Statement.pdf',
          pageCount: 4,
          colorMode: 'COLOR' as const,
          copies: 1,
          totalAmount: 40,
          isPaid: true,
          paymentMode: 'CASH',
          status: 'DELIVERED' as const,
          completedAt: new Date(),
          deliveredAt: new Date(),
        },
      ];

      for (const ord of orders) {
        await prisma.printOrder.create({ data: ord });
      }

      // WhatsApp sample messages
      await prisma.whatsAppMessage.createMany({
        data: [
          {
            organizationId: org.id,
            branchId: b1.id,
            phone: '+91 98480 12345',
            senderName: 'Nagaraju Varma',
            messageBody: 'Hello SVV Print Desk, please take 2 color printouts of my Aadhaar card copy.',
            mediaUrl: '/uploads/aadhaar.pdf',
            mediaType: 'PDF',
            isIncoming: true,
            isBotHandled: true,
          },
          {
            organizationId: org.id,
            branchId: b1.id,
            phone: '+91 99890 54321',
            senderName: 'Sita Devi',
            messageBody: 'Sir, 3 B&W xerox copies of this document please. I am outside the branch.',
            mediaUrl: '/uploads/ration_card.pdf',
            mediaType: 'PDF',
            isIncoming: true,
            isBotHandled: true,
          },
        ],
      });

      // Digital Ads
      await prisma.branchAdvertisement.createMany({
        data: [
          {
            organizationId: org.id,
            branchId: b1.id,
            title: 'Special Xerox & Color Lamination Combo',
            description: 'Get A4 color prints + 250 Micron heat lamination at just Rs.25 per page.',
            mediaUrl: '/uploads/banner1.png',
            displayDurationSec: 10,
            placement: 'KIOSK_DISPLAY',
            isActive: true,
          },
          {
            organizationId: org.id,
            branchId: null,
            title: 'High Speed Passport Size Photos in 2 Mins',
            description: '8 Glossy photo passport prints with background replacement.',
            mediaUrl: '/uploads/banner2.png',
            displayDurationSec: 8,
            placement: 'TOKEN_SCREEN',
            isActive: true,
          },
        ],
      });

      console.log('Seeded demo print orders, messages, and ads.');
    }

    console.log('Print Hub seeding complete.');
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

seedPrintHub();
