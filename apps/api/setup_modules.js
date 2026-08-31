const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, 'src', 'modules');
const routesDir = path.join(__dirname, 'src', 'routes');
fs.mkdirSync(routesDir, { recursive: true });
fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });
fs.mkdirSync(path.join(__dirname, 'logs'), { recursive: true });

const modelMapping = {
  'users': 'user', 'branches': 'branch', 'assets': 'asset', 'categories': 'assetCategory',
  'issues': 'issue', 'work-orders': 'workOrder', 'vendors': 'vendor', 'technicians': 'technician',
  'service-visits': 'serviceVisit', 'checkin': 'serviceCheckIn', 'diagnosis': 'diagnosis',
  'work-actions': 'workAction', 'parts': 'sparePart', 'testing': 'testResult',
  'verification': 'verification', 'pm': 'pMPlan', 'costs': 'costEntry',
  'notifications': 'notification', 'audit': 'assetAudit', 'dashboard': 'null',
  'reports': 'null', 'documents': 'document'
};

const modules = Object.keys(modelMapping);
let indexRoutes = `import { Router } from 'express';\nimport authRoutes from '../modules/auth/auth.routes';\n`;

// Generate Auth Module First
const authDir = path.join(baseDir, 'auth');
fs.mkdirSync(authDir, { recursive: true });
fs.writeFileSync(path.join(authDir, 'auth.schema.ts'), `
import { z } from 'zod';
export const loginSchema = z.object({ email: z.string().email(), password: z.string() });
export const changePasswordSchema = z.object({ oldPassword: z.string(), newPassword: z.string() });
`);
fs.writeFileSync(path.join(authDir, 'auth.service.ts'), `
import bcrypt from 'bcryptjs';
import prisma from '../../config/database';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../lib/jwt';
import { AppError } from '../../middleware/error.middleware';

export class AuthService {
  async login(data: any) {
    const user = await prisma.user.findUnique({ where: { email: data.email }, include: { userRoles: { include: { role: true } }, userBranches: true } });
    if (!user || !(await bcrypt.compare(data.password, user.passwordHash))) throw new AppError(401, 'Invalid credentials');
    const roles = user.userRoles.map(ur => ur.role.type);
    const branches = user.userBranches.map(ub => ub.branchId);
    const accessToken = signAccessToken({ sub: user.id, email: user.email, orgId: user.organizationId, roles, branches, primaryRole: roles[0] });
    const refreshToken = signRefreshToken({ sub: user.id, tokenId: 'token_id' });
    return { user, accessToken, refreshToken };
  }
  async refresh(token: string) { return { accessToken: 'new_token' }; }
  async logout(token: string) { return true; }
  async me(userId: string) { return prisma.user.findUnique({ where: { id: userId } }); }
}
export const authService = new AuthService();
`);
fs.writeFileSync(path.join(authDir, 'auth.controller.ts'), `
import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await authService.login(req.body)); } catch (e) { next(e); }
};
export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await authService.refresh(req.body.refreshToken)); } catch (e) { next(e); }
};
export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await authService.logout(req.body.refreshToken)); } catch (e) { next(e); }
};
export const me = async (req: any, res: Response, next: NextFunction) => {
  try { res.json({ data: await authService.me(req.user.sub) }); } catch (e) { next(e); }
};
`);
fs.writeFileSync(path.join(authDir, 'auth.routes.ts'), `
import { Router } from 'express';
import * as ctrl from './auth.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();
router.post('/login', ctrl.login);
router.post('/refresh', ctrl.refresh);
router.post('/logout', ctrl.logout);
router.get('/me', authenticate, ctrl.me);
export default router;
`);

modules.forEach(mod => {
  const camelName = mod.replace(/-([a-z])/g, g => g[1].toUpperCase());
  const pascalName = camelName.charAt(0).toUpperCase() + camelName.slice(1);
  const prismaModel = modelMapping[mod];
  const dir = path.join(baseDir, mod);
  fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(path.join(dir, `${mod}.schema.ts`), `
import { z } from 'zod';
export const create${pascalName}Schema = z.object({}).passthrough();
export const update${pascalName}Schema = z.object({}).passthrough();
  `.trim());

  let serviceContent = `
import prisma from '../../config/database';

export class ${pascalName}Service {
  async findAll(params: any) {
    const page = parseInt(params.page || '1');
    const limit = parseInt(params.limit || '20');
    const skip = (page - 1) * limit;
    
    const [data, total] = await Promise.all([
      (prisma as any).${prismaModel}.findMany({ skip, take: limit }),
      (prisma as any).${prismaModel}.count()
    ]);
    
    return { data, meta: { page, limit, total } };
  }
  async findById(id: string) {
    return (prisma as any).${prismaModel}.findUnique({ where: { id } });
  }
  async create(data: any) {
    return (prisma as any).${prismaModel}.create({ data });
  }
  async update(id: string, data: any) {
    return (prisma as any).${prismaModel}.update({ where: { id }, data });
  }
  async delete(id: string) {
    return (prisma as any).${prismaModel}.delete({ where: { id } });
  }
}
export const ${camelName}Service = new ${pascalName}Service();
  `.trim();

  if (prismaModel === 'null') {
    serviceContent = `export class ${pascalName}Service {}\nexport const ${camelName}Service = new ${pascalName}Service();`;
  }

  fs.writeFileSync(path.join(dir, `${mod}.service.ts`), serviceContent);

  fs.writeFileSync(path.join(dir, `${mod}.controller.ts`), `
import { Request, Response, NextFunction } from 'express';
import { ${camelName}Service } from './${mod}.service';

export const get${pascalName}s = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await ((${camelName}Service as any).findAll ? (${camelName}Service as any).findAll(req.query) : { data: [] })); } catch (e) { next(e); }
};
export const get${pascalName} = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ data: await ((${camelName}Service as any).findById ? (${camelName}Service as any).findById(req.params.id) : null) }); } catch (e) { next(e); }
};
export const create${pascalName} = async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(201).json({ data: await ((${camelName}Service as any).create ? (${camelName}Service as any).create(req.body) : {}) }); } catch (e) { next(e); }
};
export const update${pascalName} = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ data: await ((${camelName}Service as any).update ? (${camelName}Service as any).update(req.params.id, req.body) : {}) }); } catch (e) { next(e); }
};
export const delete${pascalName} = async (req: Request, res: Response, next: NextFunction) => {
  try { if ((${camelName}Service as any).delete) { await (${camelName}Service as any).delete(req.params.id); } res.status(204).send(); } catch (e) { next(e); }
};
  `.trim());

  fs.writeFileSync(path.join(dir, `${mod}.routes.ts`), `
import { Router } from 'express';
import * as ctrl from './${mod}.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();
router.use(authenticate);
router.get('/', ctrl.get${pascalName}s);
router.get('/:id', ctrl.get${pascalName});
router.post('/', ctrl.create${pascalName});
router.put('/:id', ctrl.update${pascalName});
router.delete('/:id', ctrl.delete${pascalName});
export default router;
  `.trim());

  indexRoutes += `import ${camelName}Routes from '../modules/${mod}/${mod}.routes';\n`;
});

indexRoutes += `\nconst router = Router();\nrouter.use('/auth', authRoutes);\n`;
modules.forEach(mod => {
  const camelName = mod.replace(/-([a-z])/g, g => g[1].toUpperCase());
  indexRoutes += `router.use('/${mod}', ${camelName}Routes);\n`;
});
indexRoutes += `export default router;\n`;
fs.writeFileSync(path.join(routesDir, 'index.ts'), indexRoutes);
