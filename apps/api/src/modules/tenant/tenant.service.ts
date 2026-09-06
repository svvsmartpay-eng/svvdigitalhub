import prisma from '../../config/database';
import { AppError } from '../../middleware/error.middleware';

export async function getAllTenants() {
  return prisma.organization.findMany({
    include: {
      subscription: {
        include: { plan: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
}

export async function getTenantById(id: string) {
  const tenant = await prisma.organization.findUnique({
    where: { id },
    include: { subscription: { include: { plan: true } } }
  });
  if (!tenant) throw new AppError(404, 'Tenant not found');
  return tenant;
}

export async function createTenant(data: any) {
  // basic validation could go here
  return prisma.organization.create({
    data: {
      name: data.name,
      shortName: data.shortName || data.name.substring(0, 3).toUpperCase(),
      email: data.email,
      customDomain: data.customDomain,
      themeColor: data.themeColor || '#0D6EFD',
      isPrintHubEnabled: data.modules?.print ?? true,
      isTasksEnabled: data.modules?.tasks ?? true,
      isAssetsEnabled: data.modules?.assets ?? true,
      isBillingEnabled: data.modules?.billing ?? false,
      isReportsEnabled: data.modules?.reports ?? true,
    }
  });
}

export async function updateTenant(id: string, data: any) {
  return prisma.organization.update({
    where: { id },
    data: {
      name: data.name,
      customDomain: data.customDomain,
      themeColor: data.themeColor,
      isActive: data.isActive,
      isPrintHubEnabled: data.modules?.print,
      isTasksEnabled: data.modules?.tasks,
      isAssetsEnabled: data.modules?.assets,
      isBillingEnabled: data.modules?.billing,
      isReportsEnabled: data.modules?.reports,
    }
  });
}

export async function deleteTenant(id: string) {
  return prisma.organization.delete({
    where: { id }
  });
}
