import { Router } from 'express';
import { requireAuth, requireRoles } from '../../middleware/auth.middleware';
import * as tenantService from './tenant.service';

const router = Router();

// Only SUPER_ADMIN can access tenant routes
router.use(requireAuth);
router.use(requireRoles(['SUPER_ADMIN']));

router.get('/', async (req, res, next) => {
  try {
    const tenants = await tenantService.getAllTenants();
    res.json({ success: true, data: tenants });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const tenant = await tenantService.createTenant(req.body);
    res.status(201).json({ success: true, data: tenant });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const tenant = await tenantService.updateTenant(req.params.id, req.body);
    res.json({ success: true, data: tenant });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await tenantService.deleteTenant(req.params.id);
    res.json({ success: true, message: 'Tenant deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
