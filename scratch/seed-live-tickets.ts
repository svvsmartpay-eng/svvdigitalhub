import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedLiveTickets() {
  try {
    const org = await prisma.organization.findFirst();
    const branch = await prisma.branch.findFirst();
    const adminUser = await prisma.user.findFirst({ where: { email: 'admin@svvcommunication.in' } });
    const staffUser = await prisma.user.findFirst({ where: { email: 'staff1@svvcommunication.in' } });

    if (!org || !branch) {
      console.log('No org or branch found.');
      return;
    }

    const liveTickets = [
      {
        orderNo: 'ORD-2026-107',
        tokenNumber: 'T-107',
        organizationId: org.id,
        branchId: branch.id,
        customerName: 'Venu Gopal',
        customerPhone: '+91 99515 27090',
        source: 'WHATSAPP' as const,
        documentUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
        documentName: 'NASINA (1).docx, Aadhaar_Front.jpg',
        pageCount: 4,
        colorMode: 'COLOR' as const,
        copies: 1,
        status: 'DELIVERED' as const,
        totalAmount: 100,
        assignedStaffId: adminUser?.id,
      },
      {
        orderNo: 'ORD-2026-106',
        tokenNumber: 'T-106',
        organizationId: org.id,
        branchId: branch.id,
        customerName: 'ranisri8485',
        customerPhone: '+91 91777 78485',
        source: 'WHATSAPP' as const,
        documentUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80',
        documentName: 'Certificate_Doc.pdf',
        pageCount: 2,
        colorMode: 'BW' as const,
        copies: 1,
        status: 'PENDING' as const,
        totalAmount: 20,
      },
      {
        orderNo: 'ORD-2026-104',
        tokenNumber: 'T-104',
        organizationId: org.id,
        branchId: branch.id,
        customerName: 'R Sreekanth Reddy',
        customerPhone: '+91 90505 68485',
        source: 'WHATSAPP' as const,
        documentUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80',
        documentName: 'Pan_Card.jpg',
        pageCount: 2,
        colorMode: 'COLOR' as const,
        copies: 1,
        status: 'DELIVERED' as const,
        totalAmount: 50,
        assignedStaffId: adminUser?.id,
      },
      {
        orderNo: 'ORD-2026-103',
        tokenNumber: 'T-103',
        organizationId: org.id,
        branchId: branch.id,
        customerName: 'Vishnu',
        customerPhone: '+91 95029 58416',
        source: 'WHATSAPP' as const,
        documentUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
        documentName: 'Report_A4.pdf, Photo_ID.jpg',
        pageCount: 4,
        colorMode: 'BW' as const,
        copies: 2,
        status: 'DELIVERED' as const,
        totalAmount: 40,
        assignedStaffId: staffUser?.id || adminUser?.id,
      },
      {
        orderNo: 'ORD-2026-101',
        tokenNumber: 'T-101',
        organizationId: org.id,
        branchId: branch.id,
        customerName: 'Chandra Mohan Reddy',
        customerPhone: '+91 93923 06031',
        source: 'WHATSAPP' as const,
        documentUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80',
        documentName: 'Marksheet.pdf',
        pageCount: 1,
        colorMode: 'BW' as const,
        copies: 1,
        status: 'DELIVERED' as const,
        totalAmount: 10,
        assignedStaffId: adminUser?.id,
      }
    ];

    for (const t of liveTickets) {
      await prisma.printOrder.upsert({
        where: { orderNo: t.orderNo },
        create: t,
        update: t,
      });
      console.log(`Upserted ticket: ${t.tokenNumber} - ${t.customerName}`);
    }

    console.log('✅ Live tickets seeded successfully into Supabase database.');
  } catch (err) {
    console.error('Error seeding live tickets:', err);
  } finally {
    await prisma.$disconnect();
  }
}

seedLiveTickets();
