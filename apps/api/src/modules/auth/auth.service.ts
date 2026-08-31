import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../../config/database';
import { env } from '../../config/env';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../lib/jwt';
import { AppError } from '../../middleware/error.middleware';
import { createAuditLog } from '../../lib/auditLog';

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: {
      userRoles: { include: { role: true } },
      userBranches: { include: { branch: true } },
      organization: true,
    },
  });

  if (!user || user.status !== 'ACTIVE') {
    throw new AppError(401, 'Invalid credentials');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AppError(401, 'Invalid credentials');
  }

  const roles = user.userRoles.map(ur => ur.role.type as string);
  const primaryRole = roles[0] || 'STAFF';
  const branches = user.userBranches.map(ub => ub.branchId);
  const primaryBranch = user.userBranches.find(ub => ub.isPrimary) || user.userBranches[0];

  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    orgId: user.organizationId,
    roles,
    branches,
    primaryRole,
  });

  const tokenId = uuidv4();
  const refreshToken = signRefreshToken({ sub: user.id, tokenId });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: { userId: user.id, token: refreshToken, expiresAt },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await createAuditLog({
    organizationId: user.organizationId,
    userId: user.id,
    userEmail: user.email,
    userRole: primaryRole,
    action: 'LOGIN',
    resource: 'user',
    resourceId: user.id,
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      photoUrl: user.photoUrl,
      organizationId: user.organizationId,
      orgName: user.organization.name,
      roles,
      primaryRole,
      branches,
      primaryBranchId: primaryBranch?.branchId,
      primaryBranchCode: primaryBranch?.branch.code,
      mustChangePass: user.mustChangePass,
    },
  };
}

export async function refresh(refreshToken: string) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError(401, 'Invalid refresh token');
  }

  const stored = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: { user: { include: { userRoles: { include: { role: true } }, userBranches: true } } },
  });

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw new AppError(401, 'Refresh token expired or revoked');
  }

  if (stored.user.status !== 'ACTIVE') {
    throw new AppError(401, 'Account inactive');
  }

  // Revoke old token (rotation)
  await prisma.refreshToken.update({ where: { token: refreshToken }, data: { revokedAt: new Date() } });

  const roles = stored.user.userRoles.map(ur => ur.role.type as string);
  const branches = stored.user.userBranches.map(ub => ub.branchId);
  const primaryRole = roles[0] || 'STAFF';

  const newAccessToken = signAccessToken({
    sub: stored.user.id,
    email: stored.user.email,
    orgId: stored.user.organizationId,
    roles,
    branches,
    primaryRole,
  });

  const tokenId = uuidv4();
  const newRefreshToken = signRefreshToken({ sub: stored.user.id, tokenId });
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: { userId: stored.user.id, token: newRefreshToken, expiresAt },
  });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

export async function logout(refreshToken: string) {
  await prisma.refreshToken.updateMany({
    where: { token: refreshToken },
    data: { revokedAt: new Date() },
  });
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userRoles: { include: { role: true } },
      userBranches: { include: { branch: true } },
      organization: true,
    },
  });

  if (!user) throw new AppError(404, 'User not found');

  const roles = user.userRoles.map(ur => ur.role.type as string);
  const primaryRole = roles[0] || 'STAFF';
  const branches = user.userBranches.map(ub => ub.branchId);
  const primaryBranch = user.userBranches.find(ub => ub.isPrimary) || user.userBranches[0];

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    photoUrl: user.photoUrl,
    designation: user.designation,
    organizationId: user.organizationId,
    orgName: user.organization.name,
    roles,
    primaryRole,
    branches,
    primaryBranchId: primaryBranch?.branchId,
    primaryBranchCode: primaryBranch?.branch.code,
    mustChangePass: user.mustChangePass,
    lastLoginAt: user.lastLoginAt,
  };
}

export async function changePassword(userId: string, oldPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'User not found');

  const valid = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!valid) throw new AppError(400, 'Current password is incorrect');

  const passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash, mustChangePass: false } });

  await createAuditLog({
    organizationId: user.organizationId,
    userId: user.id,
    userEmail: user.email,
    action: 'CHANGE_PASSWORD',
    resource: 'user',
    resourceId: user.id,
  });
}
