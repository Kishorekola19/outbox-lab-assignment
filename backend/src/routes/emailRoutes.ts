import { Router } from 'express';
import {
  scheduleEmailHandler,
  sendNowEmailHandler,
  getScheduledEmailsHandler,
  getSentEmailsHandler,
  getEmailByIdHandler,
  searchEmailsHandler,
} from '../controllers/emailController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.post('/send-now', sendNowEmailHandler);
router.post('/schedule', scheduleEmailHandler);
router.get('/scheduled', getScheduledEmailsHandler);
router.get('/sent', getSentEmailsHandler);
router.get('/search', searchEmailsHandler);
router.get('/:id', getEmailByIdHandler);

export default router;
