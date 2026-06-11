import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import {
  getAuditLogs,
  getAuditSummary,
} from '../controllers/auditController';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/', getAuditLogs);
router.get('/summary', getAuditSummary);

export default router;
