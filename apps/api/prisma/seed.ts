import { PrismaClient, RoleType, AssetStatus, Criticality, OwnershipType, IssuePriority, IssueStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting SVV AMS seed...');

  // ─────────────────────────────────────────────────────────
  // ORGANIZATION
  // ─────────────────────────────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { id: 'svv-org-001' },
    update: {},
    create: {
      id: 'svv-org-001',
      name: 'SVV Communication',
      shortName: 'SVV',
      email: 'admin@svvcommunication.in',
      phone: '+91 9876543210',
      address: '123, Main Road',
      city: 'Kozhikode',
      state: 'Kerala',
      pincode: '673001',
      country: 'India',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
    },
  });
  console.log('✅ Organization created');

  // ─────────────────────────────────────────────────────────
  // BRANCHES
  // ─────────────────────────────────────────────────────────
  const branch1 = await prisma.branch.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'SVV-1' } },
    update: {},
    create: {
      organizationId: org.id,
      code: 'SVV-1',
      name: 'SVV Communication – Branch 1',
      address: '123, Main Road',
      city: 'Kozhikode',
      state: 'Kerala',
      pincode: '673001',
      phone: '+91 9876543211',
      email: 'branch1@svvcommunication.in',
      isActive: true,
    },
  });

  const branch2 = await prisma.branch.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'SVV-2' } },
    update: {},
    create: {
      organizationId: org.id,
      code: 'SVV-2',
      name: 'SVV Communication – Branch 2',
      address: '456, Cross Road',
      city: 'Kozhikode',
      state: 'Kerala',
      pincode: '673002',
      phone: '+91 9876543212',
      email: 'branch2@svvcommunication.in',
      isActive: true,
    },
  });
  console.log('✅ Branches created: SVV-1, SVV-2');

  // ─────────────────────────────────────────────────────────
  // ROLES
  // ─────────────────────────────────────────────────────────
  const roleTypes: { type: RoleType; name: string }[] = [
    { type: 'SUPER_ADMIN', name: 'Super Admin' },
    { type: 'ADMIN', name: 'Admin' },
    { type: 'BRANCH_MANAGER', name: 'Branch Manager' },
    { type: 'STAFF', name: 'Staff' },
    { type: 'TECHNICIAN', name: 'Technician' },
    { type: 'VENDOR_USER', name: 'Vendor User' },
    { type: 'AUDITOR', name: 'Auditor' },
  ];

  const roles: Record<RoleType, any> = {} as any;
  for (const r of roleTypes) {
    roles[r.type] = await prisma.role.upsert({
      where: { organizationId_type: { organizationId: org.id, type: r.type } },
      update: {},
      create: { organizationId: org.id, name: r.name, type: r.type, isSystem: true },
    });
  }
  console.log('✅ Roles created');

  // ─────────────────────────────────────────────────────────
  // USERS
  // ─────────────────────────────────────────────────────────
  const pw = await bcrypt.hash('SVV@Admin2026', 12);
  const pwUser = await bcrypt.hash('SVV@User2026', 12);

  const users = [
    { name: 'SVV Owner', email: 'owner@svvcommunication.in', role: 'SUPER_ADMIN' as RoleType, branches: [branch1.id, branch2.id] },
    { name: 'SVV Admin', email: 'admin@svvcommunication.in', role: 'ADMIN' as RoleType, branches: [branch1.id, branch2.id] },
    { name: 'Branch 1 Manager', email: 'manager1@svvcommunication.in', role: 'BRANCH_MANAGER' as RoleType, branches: [branch1.id] },
    { name: 'Branch 2 Manager', email: 'manager2@svvcommunication.in', role: 'BRANCH_MANAGER' as RoleType, branches: [branch2.id] },
    { name: 'Staff User 1', email: 'staff1@svvcommunication.in', role: 'STAFF' as RoleType, branches: [branch1.id] },
    { name: 'Field Technician', email: 'tech1@svvcommunication.in', role: 'TECHNICIAN' as RoleType, branches: [branch1.id, branch2.id] },
    { name: 'Vendor Rep', email: 'vendor1@svvcommunication.in', role: 'VENDOR_USER' as RoleType, branches: [branch1.id, branch2.id] },
  ];

  const createdUsers: Record<string, any> = {};
  for (const u of users) {
    const hash = ['SUPER_ADMIN', 'ADMIN'].includes(u.role) ? pw : pwUser;
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (!existing) {
      const user = await prisma.user.create({
        data: {
          organizationId: org.id, name: u.name, email: u.email, passwordHash: hash,
          designation: u.role.toLowerCase().replace(/_/g, ' '),
          userRoles: { create: { roleId: roles[u.role].id } },
          userBranches: { create: u.branches.map((bid, i) => ({ branchId: bid, isPrimary: i === 0 })) },
        },
      });
      createdUsers[u.email] = user;
    } else {
      createdUsers[u.email] = existing;
    }
  }
  const adminUser = createdUsers['admin@svvcommunication.in'];
  const staffUser = createdUsers['staff1@svvcommunication.in'];
  const techUser = createdUsers['tech1@svvcommunication.in'];
  const mgr2 = createdUsers['manager2@svvcommunication.in'];
  console.log('✅ Users created (7 users)');

  // ─────────────────────────────────────────────────────────
  // ASSET CATEGORIES
  // ─────────────────────────────────────────────────────────
  const catData = [
    { code: 'XRC', name: 'Xerox / Copier', trackingMode: 'INDIVIDUAL', defaultCriticality: 'HIGH' },
    { code: 'PRN', name: 'Printer', trackingMode: 'INDIVIDUAL', defaultCriticality: 'MEDIUM' },
    { code: 'CPU', name: 'Computer / IT', trackingMode: 'INDIVIDUAL', defaultCriticality: 'HIGH' },
    { code: 'ATM', name: 'ATM / Banking Equipment', trackingMode: 'INDIVIDUAL', defaultCriticality: 'CRITICAL' },
    { code: 'NET', name: 'Network', trackingMode: 'INDIVIDUAL', defaultCriticality: 'HIGH' },
    { code: 'ELC', name: 'Electrical', trackingMode: 'INDIVIDUAL', defaultCriticality: 'MEDIUM' },
    { code: 'LGT', name: 'Lighting', trackingMode: 'INDIVIDUAL', defaultCriticality: 'LOW' },
    { code: 'CLT', name: 'Ceiling / False Lights', trackingMode: 'INDIVIDUAL', defaultCriticality: 'LOW' },
    { code: 'FAN', name: 'Fan', trackingMode: 'INDIVIDUAL', defaultCriticality: 'LOW' },
    { code: 'TUB', name: 'Tube Light', trackingMode: 'INDIVIDUAL', defaultCriticality: 'LOW' },
    { code: 'BLB', name: 'Bulb', trackingMode: 'QUANTITY', defaultCriticality: 'LOW' },
    { code: 'INV', name: 'Inverter / UPS', trackingMode: 'INDIVIDUAL', defaultCriticality: 'HIGH' },
    { code: 'BAT', name: 'Battery', trackingMode: 'INDIVIDUAL', defaultCriticality: 'MEDIUM' },
    { code: 'SEC', name: 'Security / CCTV', trackingMode: 'INDIVIDUAL', defaultCriticality: 'HIGH' },
    { code: 'FRN', name: 'Furniture', trackingMode: 'QUANTITY', defaultCriticality: 'LOW' },
    { code: 'BND', name: 'Binding Machine', trackingMode: 'INDIVIDUAL', defaultCriticality: 'LOW' },
    { code: 'LAM', name: 'Lamination Machine', trackingMode: 'INDIVIDUAL', defaultCriticality: 'LOW' },
    { code: 'CNT', name: 'Counting Machine', trackingMode: 'INDIVIDUAL', defaultCriticality: 'MEDIUM' },
    { code: 'RSM', name: 'Rubber Stamp Machine', trackingMode: 'INDIVIDUAL', defaultCriticality: 'LOW' },
    { code: 'OTH', name: 'Other', trackingMode: 'INDIVIDUAL', defaultCriticality: 'MEDIUM' },
  ];

  const cats: Record<string, any> = {};
  for (const c of catData) {
    cats[c.code] = await prisma.assetCategory.upsert({
      where: { organizationId_code: { organizationId: org.id, code: c.code } },
      update: {},
      create: { organizationId: org.id, ...c } as any,
    });
  }
  console.log('✅ Asset categories created (20 categories)');

  // ─────────────────────────────────────────────────────────
  // SLA RULES
  // ─────────────────────────────────────────────────────────
  const slaRules = [
    { name: 'Critical – 4hr', priority: 'CRITICAL', responseTargetMins: 30, resolutionTargetMins: 240, isDefault: true },
    { name: 'High – 4hr', priority: 'HIGH', responseTargetMins: 60, resolutionTargetMins: 240, isDefault: true },
    { name: 'Medium – 1 Day', priority: 'MEDIUM', responseTargetMins: 120, resolutionTargetMins: 1440, isDefault: true },
    { name: 'Low – 3 Days', priority: 'LOW', responseTargetMins: 240, resolutionTargetMins: 4320, isDefault: true },
  ];
  for (const s of slaRules) {
    const exists = await prisma.sLARule.findFirst({ where: { organizationId: org.id, priority: s.priority as any } });
    if (!exists) await prisma.sLARule.create({ data: { ...s, organizationId: org.id } as any });
  }
  console.log('✅ SLA rules created');

  // ─────────────────────────────────────────────────────────
  // APPROVAL RULES
  // ─────────────────────────────────────────────────────────
  const approvalRules = [
    { name: 'Up to ₹2,000 – Branch Manager', minAmount: 0, maxAmount: 2000, approverRole: 'BRANCH_MANAGER', level: 1 },
    { name: '₹2,001 – ₹10,000 – Admin', minAmount: 2001, maxAmount: 10000, approverRole: 'ADMIN', level: 2 },
    { name: 'Above ₹10,000 – Super Admin', minAmount: 10001, maxAmount: null, approverRole: 'SUPER_ADMIN', level: 3 },
  ];
  for (const a of approvalRules) {
    const exists = await prisma.approvalRule.findFirst({ where: { organizationId: org.id, name: a.name } });
    if (!exists) await prisma.approvalRule.create({ data: { ...a, organizationId: org.id } as any });
  }
  console.log('✅ Approval rules created');

  // ─────────────────────────────────────────────────────────
  // VENDOR + TECHNICIANS
  // ─────────────────────────────────────────────────────────
  const vendor1 = await prisma.vendor.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'VND-0001' } },
    update: {},
    create: {
      organizationId: org.id, code: 'VND-0001',
      name: 'TechServ Solutions',
      email: 'service@techserv.in', phone: '+91 9900001111',
      city: 'Kozhikode', state: 'Kerala',
      servicesProvided: ['Network', 'ATM', 'IT Support'],
      specializations: ['Network', 'ATM', 'Hardware'],
      branchesServed: [branch1.id, branch2.id],
      isActive: true,
    },
  });

  const vendor2 = await prisma.vendor.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'VND-0002' } },
    update: {},
    create: {
      organizationId: org.id, code: 'VND-0002',
      name: 'ElectroCare Services',
      email: 'service@electrocare.in', phone: '+91 9900002222',
      city: 'Kozhikode', state: 'Kerala',
      servicesProvided: ['Electrical', 'UPS', 'Lighting'],
      specializations: ['Electrical', 'Inverter', 'Lighting'],
      branchesServed: [branch1.id, branch2.id],
      isActive: true,
    },
  });

  const tech1 = await prisma.technician.upsert({
    where: { techId: 'TECH-0001' },
    update: {},
    create: {
      organizationId: org.id, vendorId: vendor1.id, techId: 'TECH-0001',
      name: 'Ravi Kumar', email: 'ravi@techserv.in', phone: '+91 9811001100',
      specializations: ['Network', 'ATM', 'IT Support'], skillLevel: 'Senior', isExternal: true, isActive: true,
    },
  });

  const tech2 = await prisma.technician.upsert({
    where: { techId: 'TECH-0002' },
    update: {},
    create: {
      organizationId: org.id, vendorId: vendor2.id, techId: 'TECH-0002',
      name: 'Suresh Electrical', email: 'suresh@electrocare.in', phone: '+91 9811002200',
      specializations: ['Electrical', 'Inverter', 'Lighting'], skillLevel: 'Expert', isExternal: true, isActive: true,
    },
  });
  console.log('✅ Vendors and technicians created');

  // ─────────────────────────────────────────────────────────
  // ASSETS – BRANCH 1
  // ─────────────────────────────────────────────────────────
  const b1Assets = [
    { assetId: 'B1-XRC-001', name: 'Canon Colour Xerox', catCode: 'XRC', brand: 'Canon', model: 'imageRUNNER ADVANCE C3525i', ownershipType: 'OWNED', purchaseCost: 250000, condition: 'GOOD' },
    { assetId: 'B1-XRC-002', name: 'Canon B/W Xerox', catCode: 'XRC', brand: 'Canon', model: 'imageRUNNER 2206N', ownershipType: 'OWNED', purchaseCost: 85000, condition: 'GOOD' },
    { assetId: 'B1-CPU-001', name: 'Computer System 1', catCode: 'CPU', brand: 'HP', model: 'ProDesk 400', ownershipType: 'OWNED', purchaseCost: 45000, condition: 'GOOD' },
    { assetId: 'B1-CPU-002', name: 'Computer System 2', catCode: 'CPU', brand: 'HP', model: 'ProDesk 400', ownershipType: 'OWNED', purchaseCost: 45000, condition: 'GOOD' },
    { assetId: 'B1-CPU-003', name: 'Computer System 3', catCode: 'CPU', brand: 'HP', model: 'ProDesk 400', ownershipType: 'OWNED', purchaseCost: 45000, condition: 'FAIR' },
    { assetId: 'B1-CPU-004', name: 'Computer System 4', catCode: 'CPU', brand: 'Dell', model: 'OptiPlex 3080', ownershipType: 'OWNED', purchaseCost: 48000, condition: 'GOOD' },
    { assetId: 'B1-PRN-001', name: 'Epson L8050 Printer 1', catCode: 'PRN', brand: 'Epson', model: 'L8050', ownershipType: 'OWNED', purchaseCost: 32000, condition: 'GOOD' },
    { assetId: 'B1-PRN-002', name: 'Epson L8050 Printer 2', catCode: 'PRN', brand: 'Epson', model: 'L8050', ownershipType: 'OWNED', purchaseCost: 32000, condition: 'GOOD' },
    { assetId: 'B1-PRN-003', name: 'Epson L3865 Printer', catCode: 'PRN', brand: 'Epson', model: 'L3865', ownershipType: 'OWNED', purchaseCost: 18000, condition: 'GOOD' },
    { assetId: 'B1-ATM-001', name: 'Hitachi ATM', catCode: 'ATM', brand: 'Hitachi', model: 'MCRM1526', serialNumber: 'MCRM1526', ownershipType: 'RENTAL', criticality: 'CRITICAL', isCritical: true, monthlyRental: 15000 },
    { assetId: 'B1-BND-001', name: 'Spiral Binding Machine', catCode: 'BND', brand: 'Fellowes', ownershipType: 'OWNED', purchaseCost: 8500, condition: 'GOOD' },
    { assetId: 'B1-LAM-001', name: 'Lamination Machine', catCode: 'LAM', brand: 'Orion', ownershipType: 'OWNED', purchaseCost: 6000, condition: 'GOOD' },
    { assetId: 'B1-INV-001', name: 'Microtech Inverter', catCode: 'INV', brand: 'Microtek', model: 'EB 1600 VA', ownershipType: 'OWNED', purchaseCost: 14000, condition: 'GOOD', criticality: 'HIGH' },
    { assetId: 'B1-FAN-001', name: 'Ceiling Fan 1', catCode: 'FAN', brand: 'Havells', ownershipType: 'OWNED', purchaseCost: 2800, condition: 'GOOD' },
    { assetId: 'B1-FAN-002', name: 'Ceiling Fan 2', catCode: 'FAN', brand: 'Havells', ownershipType: 'OWNED', purchaseCost: 2800, condition: 'GOOD' },
    { assetId: 'B1-FAN-003', name: 'Ceiling Fan 3', catCode: 'FAN', brand: 'Havells', ownershipType: 'OWNED', purchaseCost: 2800, condition: 'FAIR' },
    { assetId: 'B1-FAN-004', name: 'Ceiling Fan 4', catCode: 'FAN', brand: 'Havells', ownershipType: 'OWNED', purchaseCost: 2800, condition: 'GOOD' },
    { assetId: 'B1-TUB-001', name: 'Tube Light 1', catCode: 'TUB', brand: 'Philips', ownershipType: 'OWNED', purchaseCost: 800, condition: 'GOOD' },
    { assetId: 'B1-TUB-002', name: 'Tube Light 2', catCode: 'TUB', brand: 'Philips', ownershipType: 'OWNED', purchaseCost: 800, condition: 'GOOD' },
    { assetId: 'B1-TUB-003', name: 'Tube Light 3', catCode: 'TUB', brand: 'Philips', ownershipType: 'OWNED', purchaseCost: 800, condition: 'GOOD' },
    { assetId: 'B1-TUB-004', name: 'Tube Light 4', catCode: 'TUB', brand: 'Philips', ownershipType: 'OWNED', purchaseCost: 800, condition: 'FAIR' },
    { assetId: 'B1-BLB-001', name: 'LED Bulb 1', catCode: 'BLB', brand: 'Syska', ownershipType: 'OWNED', purchaseCost: 300, condition: 'GOOD' },
    { assetId: 'B1-BLB-002', name: 'LED Bulb 2', catCode: 'BLB', brand: 'Syska', ownershipType: 'OWNED', purchaseCost: 300, condition: 'GOOD' },
    { assetId: 'B1-BLB-003', name: 'LED Bulb 3', catCode: 'BLB', brand: 'Syska', ownershipType: 'OWNED', purchaseCost: 300, condition: 'GOOD' },
    { assetId: 'B1-BLB-004', name: 'LED Bulb 4', catCode: 'BLB', brand: 'Syska', ownershipType: 'OWNED', purchaseCost: 300, condition: 'FAIR' },
    { assetId: 'B1-RSM-001', name: 'Rubber Stamp Machine', catCode: 'RSM', brand: 'Reiner', ownershipType: 'OWNED', purchaseCost: 12000, condition: 'GOOD' },
    { assetId: 'B1-CNT-001', name: 'Currency Counting Machine', catCode: 'CNT', brand: 'Godrej', ownershipType: 'OWNED', purchaseCost: 22000, condition: 'GOOD', criticality: 'HIGH' },
  ];

  for (const a of b1Assets) {
    const exists = await prisma.asset.findUnique({ where: { assetId: a.assetId } });
    if (!exists) {
      await prisma.asset.create({
        data: {
          assetId: a.assetId, organizationId: org.id, branchId: branch1.id,
          categoryId: cats[a.catCode].id,
          name: a.name, brand: a.brand, model: (a as any).model,
          serialNumber: (a as any).serialNumber,
          ownershipType: (a.ownershipType as OwnershipType) || 'OWNED',
          status: 'OPERATIONAL', condition: (a.condition as any) || 'GOOD',
          criticality: ((a as any).criticality as any) || cats[a.catCode].defaultCriticality,
          isCritical: (a as any).isCritical || false,
          purchaseCost: (a as any).purchaseCost, monthlyRental: (a as any).monthlyRental,
          purchaseDate: new Date('2022-01-15'),
          trackingMode: 'INDIVIDUAL',
        },
      });
    }
  }
  console.log(`✅ Branch 1 assets created (${b1Assets.length} assets)`);

  // ─────────────────────────────────────────────────────────
  // ASSETS – BRANCH 2
  // ─────────────────────────────────────────────────────────
  const b2Assets = [
    { assetId: 'B2-XRC-001', name: 'Canon Colour Xerox', catCode: 'XRC', brand: 'Canon', model: 'imageRUNNER ADVANCE C3525i', ownershipType: 'OWNED', purchaseCost: 250000, condition: 'GOOD' },
    { assetId: 'B2-XRC-002', name: 'Canon B/W Xerox', catCode: 'XRC', brand: 'Canon', model: 'imageRUNNER 2206N', ownershipType: 'OWNED', purchaseCost: 85000, condition: 'GOOD' },
    { assetId: 'B2-CPU-001', name: 'Computer System 1', catCode: 'CPU', brand: 'HP', model: 'ProDesk 400', ownershipType: 'OWNED', purchaseCost: 45000, condition: 'GOOD' },
    { assetId: 'B2-CPU-002', name: 'Computer System 2', catCode: 'CPU', brand: 'HP', model: 'ProDesk 400', ownershipType: 'OWNED', purchaseCost: 45000, condition: 'GOOD' },
    { assetId: 'B2-CPU-003', name: 'Computer System 3', catCode: 'CPU', brand: 'Dell', model: 'OptiPlex 3080', ownershipType: 'OWNED', purchaseCost: 48000, condition: 'FAIR' },
    { assetId: 'B2-PRN-001', name: 'Epson L8050 Printer 1', catCode: 'PRN', brand: 'Epson', model: 'L8050', ownershipType: 'OWNED', purchaseCost: 32000, condition: 'GOOD' },
    { assetId: 'B2-PRN-002', name: 'Epson L8050 Printer 2', catCode: 'PRN', brand: 'Epson', model: 'L8050', ownershipType: 'OWNED', purchaseCost: 32000, condition: 'GOOD' },
    { assetId: 'B2-PRN-003', name: 'Epson L3865 Printer', catCode: 'PRN', brand: 'Epson', model: 'L3865', ownershipType: 'OWNED', purchaseCost: 18000, condition: 'GOOD' },
    { assetId: 'B2-PRN-004', name: 'Brother T531 Printer', catCode: 'PRN', brand: 'Brother', model: 'T531', ownershipType: 'OWNED', purchaseCost: 14000, condition: 'GOOD' },
    { assetId: 'B2-ATM-001', name: 'Hitachi ATM MCRM7479', catCode: 'ATM', brand: 'Hitachi', model: 'MCRM Series', serialNumber: 'MCRM7479', ownershipType: 'RENTAL', criticality: 'CRITICAL', isCritical: true, monthlyRental: 15000 },
    { assetId: 'B2-BND-001', name: 'Spiral Binding Machine', catCode: 'BND', brand: 'Fellowes', ownershipType: 'OWNED', purchaseCost: 8500, condition: 'GOOD' },
    { assetId: 'B2-LAM-001', name: 'Lamination Machine', catCode: 'LAM', brand: 'Orion', ownershipType: 'OWNED', purchaseCost: 6000, condition: 'GOOD' },
    { assetId: 'B2-INV-001', name: 'Microtech Inverter', catCode: 'INV', brand: 'Microtek', model: 'EB 1600 VA', ownershipType: 'OWNED', purchaseCost: 14000, condition: 'GOOD', criticality: 'HIGH' },
    { assetId: 'B2-FAN-001', name: 'Ceiling Fan 1', catCode: 'FAN', brand: 'Havells', ownershipType: 'OWNED', purchaseCost: 2800, condition: 'GOOD' },
    { assetId: 'B2-FAN-002', name: 'Ceiling Fan 2', catCode: 'FAN', brand: 'Havells', ownershipType: 'OWNED', purchaseCost: 2800, condition: 'GOOD' },
    { assetId: 'B2-BLB-001', name: 'LED Bulb 1', catCode: 'BLB', brand: 'Syska', ownershipType: 'OWNED', purchaseCost: 300, condition: 'GOOD' },
    { assetId: 'B2-TUB-001', name: 'Tube Light 1', catCode: 'TUB', brand: 'Philips', ownershipType: 'OWNED', purchaseCost: 800, condition: 'GOOD' },
    { assetId: 'B2-TUB-002', name: 'Tube Light 2', catCode: 'TUB', brand: 'Philips', ownershipType: 'OWNED', purchaseCost: 800, condition: 'GOOD' },
    { assetId: 'B2-TUB-003', name: 'Tube Light 3', catCode: 'TUB', brand: 'Philips', ownershipType: 'OWNED', purchaseCost: 800, condition: 'GOOD' },
    ...Array.from({ length: 12 }, (_, i) => ({
      assetId: `B2-CLT-${String(i + 1).padStart(3, '0')}`, name: `False Ceiling Light ${i + 1}`,
      catCode: 'CLT', brand: 'Havells', ownershipType: 'OWNED', purchaseCost: 1500,
      condition: i === 6 ? 'POOR' : 'GOOD',
    })),
    { assetId: 'B2-CNT-001', name: 'Currency Counting Machine', catCode: 'CNT', brand: 'Godrej', ownershipType: 'OWNED', purchaseCost: 22000, condition: 'GOOD', criticality: 'HIGH' },
  ];

  for (const a of b2Assets) {
    const exists = await prisma.asset.findUnique({ where: { assetId: a.assetId } });
    if (!exists) {
      await prisma.asset.create({
        data: {
          assetId: a.assetId, organizationId: org.id, branchId: branch2.id,
          categoryId: cats[a.catCode].id,
          name: a.name, brand: a.brand, model: (a as any).model,
          serialNumber: (a as any).serialNumber,
          ownershipType: (a.ownershipType as OwnershipType) || 'OWNED',
          status: a.assetId === 'B2-ATM-001' ? 'BREAKDOWN' : 'OPERATIONAL',
          condition: (a.condition as any) || 'GOOD',
          criticality: ((a as any).criticality as any) || cats[a.catCode].defaultCriticality,
          isCritical: (a as any).isCritical || false,
          purchaseCost: (a as any).purchaseCost, monthlyRental: (a as any).monthlyRental,
          purchaseDate: new Date('2022-06-01'),
          trackingMode: 'INDIVIDUAL',
        },
      });
    }
  }
  console.log(`✅ Branch 2 assets created (${b2Assets.length} assets)`);

  // ─────────────────────────────────────────────────────────
  // DEMO SCENARIOS
  // ─────────────────────────────────────────────────────────
  const atmAsset = await prisma.asset.findUnique({ where: { assetId: 'B2-ATM-001' } });
  const cltAsset = await prisma.asset.findUnique({ where: { assetId: 'B2-CLT-007' } });

  if (atmAsset && staffUser) {
    // SCENARIO 1: ATM Network Issue (complete workflow)
    const existIssue = await prisma.issue.findFirst({ where: { issueNo: 'ISS-2026-000001' } });
    if (!existIssue) {
      const slaResolutionDue = new Date(Date.now() - 2 * 60 * 60 * 1000); // Already past SLA for demo
      const issue1 = await prisma.issue.create({
        data: {
          issueNo: 'ISS-2026-000001', organizationId: org.id, branchId: branch2.id,
          assetId: atmAsset.id, raisedById: staffUser.id,
          title: 'Network signal unavailable – ATM offline',
          description: 'ATM MCRM7479 showing network error. Cannot process transactions. Display shows "Network Error 404".',
          issueType: 'Network', priority: 'HIGH', criticality: 'CRITICAL',
          status: 'CLOSED',
          immediateAction: 'ATM temporarily taken offline. Customers redirected.',
          slaResponseDue: new Date(Date.now() - 3 * 60 * 60 * 1000),
          slaResolutionDue,
          slaResolutionBreached: true,
          downtimeStartAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
          downtimeEndAt: new Date(Date.now() - 30 * 60 * 1000),
          totalDowntimeMins: 270,
          resolvedAt: new Date(Date.now() - 30 * 60 * 1000),
          verifiedAt: new Date(Date.now() - 20 * 60 * 1000),
          closedAt: new Date(Date.now() - 15 * 60 * 1000),
          raisedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
        },
      });

      const wo1 = await prisma.workOrder.create({
        data: {
          workOrderNo: 'WO-2026-000001', organizationId: org.id, branchId: branch2.id,
          assetId: atmAsset.id, issueId: issue1.id, vendorId: vendor1.id,
          title: 'ATM Network Repair – MCRM7479',
          description: 'Network connectivity issue. LAN cable/connector suspected.',
          priority: 'HIGH', status: 'CLOSED', requiredSkill: 'Network',
          technicianId: tech1.id, estimatedCost: 1500, actualCost: 1200,
          createdBy: adminUser.id, completedAt: new Date(Date.now() - 30 * 60 * 1000),
          closedAt: new Date(Date.now() - 15 * 60 * 1000),
        },
      });

      const visit1 = await prisma.serviceVisit.create({
        data: {
          visitNo: 'VIS-2026-000001', organizationId: org.id, branchId: branch2.id,
          assetId: atmAsset.id, workOrderId: wo1.id, issueId: issue1.id,
          vendorId: vendor1.id, technicianId: tech1.id,
          serviceCategory: 'Network Repair', purpose: 'Fix network connectivity issue',
          status: 'CLOSED',
          scheduledDate: new Date(Date.now() - 4 * 60 * 60 * 1000),
          checkInAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
          workStartAt: new Date(Date.now() - 3.5 * 60 * 60 * 1000),
          workEndAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
          checkOutAt: new Date(Date.now() - 45 * 60 * 1000),
          closedAt: new Date(Date.now() - 15 * 60 * 1000),
          totalDurationMins: 195,
          createdBy: adminUser.id,
        },
      });

      await prisma.serviceCheckIn.create({
        data: {
          visitId: visit1.id, technicianId: tech1.id,
          techName: 'Ravi Kumar', company: 'TechServ Solutions',
          mobile: '+91 9811001100', specialization: 'Network',
          purpose: 'Fix ATM network issue', authorizedBy: mgr2.id,
          entryPoint: 'Main Door',
        },
      });

      await prisma.diagnosis.create({
        data: {
          visitId: visit1.id,
          observedProblem: 'ATM display showing "Network Error 404". No network connectivity.',
          diagnosis: 'LAN cable damaged at the connector end. RJ45 connector broken.',
          rootCause: 'Physical damage to LAN cable connector due to wear and tension.',
          rootCauseCategory: 'Physical Damage',
          severity: 'High',
          estimatedCost: 1200, estimatedTime: '2 hours',
          partsRequired: 'RJ45 connector × 2, LAN cable (Cat6) 2 meters',
          recommendedAction: 'Replace LAN cable and connectors. Check switch port.',
          diagnosedBy: tech1.id,
        },
      });

      await prisma.workAction.create({
        data: {
          visitId: visit1.id, actionType: 'PART_REPLACEMENT',
          description: 'Replaced damaged LAN cable (2m) and both RJ45 connectors. Crimped new connectors. Tested network connectivity. ATM back online.',
          timeSpentMins: 90, performedBy: tech1.id,
          afterPhotos: [], beforePhotos: [],
        },
      });

      await prisma.partUsed.create({
        data: {
          visitId: visit1.id, partName: 'Cat6 LAN Cable 2m', quantity: 1,
          unitCost: 150, totalCost: 150,
          oldPartSerial: 'OLD-LAN-CABLE', newPartSerial: 'NEW-CAT6-2M',
          recordedBy: tech1.id,
        },
      });
      await prisma.partUsed.create({
        data: {
          visitId: visit1.id, partName: 'RJ45 Connector', quantity: 2,
          unitCost: 25, totalCost: 50, recordedBy: tech1.id,
        },
      });

      await prisma.visitTestResult.create({
        data: {
          visitId: visit1.id, result: 'PASS',
          notes: 'Network connectivity restored. ATM successfully processed test transaction. All peripheral checks passed.',
          testedBy: tech1.id,
          checklistResponses: [
            { question: 'Power ON', answer: 'YES', pass: true },
            { question: 'Network Connected', answer: 'YES', pass: true },
            { question: 'Card Reader', answer: 'PASS', pass: true },
            { question: 'Cash Dispenser', answer: 'PASS', pass: true },
            { question: 'Receipt Printer', answer: 'PASS', pass: true },
          ],
        },
      });

      await prisma.verification.create({
        data: {
          visitId: visit1.id, verifiedBy: mgr2.id,
          issueResolved: true, workCompleted: true, assetOperational: true,
          testPassed: true, documentsOk: true, partsOk: true, costOk: true, photosOk: false,
          remarks: 'ATM operational. Network stable. Issue resolved. SLA breached due to delayed technician arrival.',
        },
      });

      await prisma.serviceCheckOut.create({
        data: {
          visitId: visit1.id, workCompleted: true, assetStatus: 'OPERATIONAL',
          techRemarks: 'LAN cable and connectors replaced. ATM fully operational. Recommend cable protection sleeve.',
          managerRemarks: 'Verified operational. Approved.',
          approvedBy: mgr2.id, evidencePhotos: [],
        },
      });

      await prisma.costEntry.create({
        data: {
          organizationId: org.id, branchId: branch2.id, assetId: atmAsset.id,
          workOrderId: wo1.id, visitId: visit1.id,
          categoryType: 'parts', description: 'LAN cable and connectors replacement',
          amount: 200, recordedBy: adminUser.id,
        },
      });
      await prisma.costEntry.create({
        data: {
          organizationId: org.id, branchId: branch2.id, assetId: atmAsset.id,
          workOrderId: wo1.id, visitId: visit1.id,
          categoryType: 'labour', description: 'Network technician labour charge',
          amount: 1000, recordedBy: adminUser.id,
        },
      });

      // Reset ATM to operational
      await prisma.asset.update({ where: { id: atmAsset.id }, data: { status: 'OPERATIONAL', lastMaintenanceAt: new Date() } });
      console.log('✅ Demo Scenario 1: ATM network issue (complete workflow) created');
    }
  }

  // SCENARIO 2: Ceiling Light not working
  if (cltAsset) {
    const existIssue2 = await prisma.issue.findFirst({ where: { issueNo: 'ISS-2026-000002' } });
    if (!existIssue2) {
      const issue2 = await prisma.issue.create({
        data: {
          issueNo: 'ISS-2026-000002', organizationId: org.id, branchId: branch2.id,
          assetId: cltAsset.id, raisedById: staffUser?.id || adminUser.id,
          title: 'False ceiling light not working – B2-CLT-007',
          description: 'False ceiling light #7 at Branch 2 completely not working. Flickering started yesterday, now fully off.',
          issueType: 'Electrical', priority: 'LOW', criticality: 'LOW',
          status: 'CLOSED',
          resolvedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          closedAt: new Date(Date.now() - 23 * 60 * 60 * 1000),
          raisedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
      });

      const wo2 = await prisma.workOrder.create({
        data: {
          workOrderNo: 'WO-2026-000002', organizationId: org.id, branchId: branch2.id,
          assetId: cltAsset.id, issueId: issue2.id, vendorId: vendor2.id,
          title: 'Ceiling light driver replacement – B2-CLT-007',
          priority: 'LOW', status: 'CLOSED', requiredSkill: 'Electrical',
          technicianId: tech2.id, estimatedCost: 500, actualCost: 450,
          createdBy: adminUser.id, completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          closedAt: new Date(Date.now() - 23 * 60 * 60 * 1000),
        },
      });

      const visit2 = await prisma.serviceVisit.create({
        data: {
          visitNo: 'VIS-2026-000002', organizationId: org.id, branchId: branch2.id,
          assetId: cltAsset.id, workOrderId: wo2.id, issueId: issue2.id,
          vendorId: vendor2.id, technicianId: tech2.id,
          serviceCategory: 'Electrical Repair', purpose: 'Replace faulty light driver',
          status: 'CLOSED',
          checkInAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          workStartAt: new Date(Date.now() - 23.5 * 60 * 60 * 1000),
          workEndAt: new Date(Date.now() - 23 * 60 * 60 * 1000),
          checkOutAt: new Date(Date.now() - 22.5 * 60 * 60 * 1000),
          closedAt: new Date(Date.now() - 22 * 60 * 60 * 1000),
          totalDurationMins: 90, createdBy: adminUser.id,
        },
      });

      await prisma.workAction.create({
        data: {
          visitId: visit2.id, actionType: 'PART_REPLACEMENT',
          description: 'Replaced LED driver for false ceiling light B2-CLT-007. Old driver (12W) burnt. Installed new 15W driver. Light operational.',
          timeSpentMins: 45, performedBy: tech2.id,
        },
      });

      await prisma.partUsed.create({
        data: {
          visitId: visit2.id, partName: 'LED Driver 15W', quantity: 1,
          unitCost: 250, totalCost: 250,
          oldPartSerial: 'OLD-DRV-12W', newPartSerial: 'NEW-DRV-15W',
          warrantyMonths: 12, recordedBy: tech2.id,
        },
      });

      await prisma.visitTestResult.create({
        data: {
          visitId: visit2.id, result: 'PASS',
          notes: 'Light working normally after driver replacement.',
          testedBy: tech2.id,
        },
      });

      await prisma.costEntry.create({
        data: {
          organizationId: org.id, branchId: branch2.id, assetId: cltAsset.id,
          workOrderId: wo2.id, categoryType: 'parts',
          description: 'LED Driver 15W', amount: 250, recordedBy: adminUser.id,
        },
      });
      await prisma.costEntry.create({
        data: {
          organizationId: org.id, branchId: branch2.id, assetId: cltAsset.id,
          workOrderId: wo2.id, categoryType: 'labour',
          description: 'Electrical technician labour', amount: 200, recordedBy: adminUser.id,
        },
      });

      await prisma.asset.update({ where: { id: cltAsset.id }, data: { status: 'OPERATIONAL', condition: 'GOOD' } });
      console.log('✅ Demo Scenario 2: Ceiling light repair created');
    }
  }

  // ─────────────────────────────────────────────────────────
  // KNOWLEDGE ARTICLES
  // ─────────────────────────────────────────────────────────
  const articles = [
    {
      title: 'Epson L8050 – Paper Feed Issue',
      symptom: 'Paper not feeding, paper jam error',
      possibleCauses: '1. Dirty pickup roller\n2. Wrong paper type\n3. Overfilled tray\n4. Damaged roller',
      solution: '1. Clean pickup roller with dry cloth\n2. Use correct paper weight (75-90 GSM)\n3. Load max 80% tray capacity\n4. Replace roller if worn',
      estimatedTime: '30 minutes',
      requiredParts: 'Pickup roller (if damaged)',
      tags: ['epson', 'paper-feed', 'printer'],
    },
    {
      title: 'Hitachi ATM – Network Error',
      symptom: 'ATM showing "Network Error", cannot process transactions',
      possibleCauses: '1. LAN cable damaged\n2. RJ45 connector loose\n3. Switch port failure\n4. IP configuration issue',
      solution: '1. Check LAN cable continuity\n2. Re-crimp or replace RJ45 connectors\n3. Try different switch port\n4. Verify IP settings in ATM menu',
      estimatedTime: '1-2 hours',
      requiredParts: 'Cat6 LAN cable, RJ45 connectors',
      tags: ['atm', 'hitachi', 'network'],
    },
    {
      title: 'Microtek Inverter – Not Charging Battery',
      symptom: 'Inverter on but battery not charging, low battery alarm',
      possibleCauses: '1. Faulty battery\n2. Charging circuit failure\n3. Bad connection\n4. Blown fuse',
      solution: '1. Check battery voltage (should be 12V+)\n2. Check fuse on inverter board\n3. Clean battery terminals\n4. Replace battery if below 10V',
      estimatedTime: '1 hour',
      requiredParts: 'Battery (if faulty), fuse',
      tags: ['inverter', 'microtek', 'battery'],
    },
  ];

  for (const a of articles) {
    const exists = await prisma.knowledgeArticle.findFirst({ where: { organizationId: org.id, title: a.title } });
    if (!exists) {
      await prisma.knowledgeArticle.create({
        data: { ...a, organizationId: org.id, isApproved: true, approvedBy: adminUser.id, createdBy: adminUser.id },
      });
    }
  }
  console.log('✅ Knowledge articles created');

  // ─────────────────────────────────────────────────────────
  // VENDOR PERFORMANCE STATS
  // ─────────────────────────────────────────────────────────
  await prisma.vendorPerformance.upsert({
    where: { vendorId: vendor1.id },
    update: {},
    create: {
      vendorId: vendor1.id, totalVisits: 5, completedVisits: 5,
      avgResponseMins: 60, avgResolutionMins: 180,
      firstTimeFixRate: 80, slaBreachCount: 1, totalCost: 8500, performanceScore: 78,
    },
  });

  await prisma.vendorPerformance.upsert({
    where: { vendorId: vendor2.id },
    update: {},
    create: {
      vendorId: vendor2.id, totalVisits: 3, completedVisits: 3,
      avgResponseMins: 45, avgResolutionMins: 120,
      firstTimeFixRate: 100, slaBreachCount: 0, totalCost: 2200, performanceScore: 92,
    },
  });

  console.log('\n🎉 SVV AMS Seed completed successfully!');
  console.log('\n📊 Summary:');
  console.log('   Organization: SVV Communication');
  console.log('   Branches: SVV-1, SVV-2');
  console.log('   Users: 7 (owner, admin, 2 managers, staff, technician, vendor)');
  console.log('   Categories: 20');
  console.log('   Branch 1 Assets: 26 (B1-XRC-001 to B1-CNT-001)');
  console.log('   Branch 2 Assets: 31 (B2-XRC-001 to B2-CNT-001 + 12 ceiling lights)');
  console.log('   Vendors: 2, Technicians: 2');
  console.log('   Demo Issues: 2 (complete workflows)');
  console.log('   Knowledge Articles: 3');
  console.log('\n🔑 Login credentials:');
  console.log('   admin@svvcommunication.in / SVV@Admin2026 (Super Admin / Admin)');
  console.log('   manager1@svvcommunication.in / SVV@User2026 (Branch Manager SVV-1)');
  console.log('   manager2@svvcommunication.in / SVV@User2026 (Branch Manager SVV-2)');
  console.log('   staff1@svvcommunication.in / SVV@User2026 (Staff)');
  console.log('   tech1@svvcommunication.in / SVV@User2026 (Technician)');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
