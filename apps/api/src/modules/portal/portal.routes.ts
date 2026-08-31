import { Router, Request, Response, NextFunction } from 'express';
import { upload } from '../../middleware/upload.middleware';
import * as svc from './portal.service';

const router = Router();

// Public Token-authenticated endpoints for external technicians
router.get('/service/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await svc.getTicketByServiceToken(req.params.token);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/service/:token/submit', upload.array('photos', 10), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const files = req.files as Express.Multer.File[];
    const uploadedPhotos = files?.map(f => `/uploads/${f.filename}`) || [];

    // Parse JSON fields if passed as strings in multipart form-data
    let checklist = req.body.checklist;
    if (typeof checklist === 'string') {
      try { checklist = JSON.parse(checklist); } catch { checklist = []; }
    }

    let partsUsed = req.body.partsUsed;
    if (typeof partsUsed === 'string') {
      try { partsUsed = JSON.parse(partsUsed); } catch { partsUsed = []; }
    }

    let location = req.body.location;
    if (typeof location === 'string') {
      try { location = JSON.parse(location); } catch { location = undefined; }
    }

    const payload = {
      techName: req.body.techName,
      techPhone: req.body.techPhone,
      company: req.body.company,
      status: req.body.status || 'RESOLVED',
      diagnosisNote: req.body.diagnosisNote,
      actionsTaken: req.body.actionsTaken,
      checklist,
      partsUsed,
      location,
      remarks: req.body.remarks,
    };

    const data = await svc.submitTechnicianUpdate(req.params.token, payload, uploadedPhotos);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

export default router;
