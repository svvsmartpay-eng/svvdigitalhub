import prisma from '../../config/database';

export async function getPluginSettings(orgId: string) {
  const settings = await prisma.systemPluginSetting.findMany({
    where: { organizationId: orgId },
  });

  const settingMap: Record<string, boolean> = {};
  settings.forEach((s) => {
    settingMap[s.pluginKey] = s.isEnabled;
  });

  // Default known plugins
  return {
    print_whatsapp_hub: settingMap['print_whatsapp_hub'] ?? false,
    ...settingMap,
  };
}

export async function togglePlugin(orgId: string, pluginKey: string, isEnabled: boolean, userId?: string) {
  const updated = await prisma.systemPluginSetting.upsert({
    where: {
      organizationId_pluginKey: {
        organizationId: orgId,
        pluginKey,
      },
    },
    create: {
      organizationId: orgId,
      pluginKey,
      isEnabled,
      updatedBy: userId,
    },
    update: {
      isEnabled,
      updatedBy: userId,
    },
  });

  return updated;
}

export async function isPluginEnabled(orgId: string, pluginKey: string): Promise<boolean> {
  const setting = await prisma.systemPluginSetting.findUnique({
    where: {
      organizationId_pluginKey: {
        organizationId: orgId,
        pluginKey,
      },
    },
  });

  return setting?.isEnabled ?? false;
}
