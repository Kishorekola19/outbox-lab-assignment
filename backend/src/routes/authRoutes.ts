import { Router } from 'express';
import {
  googleAuthHandler,
  googleCallbackHandler,
  googleVerifyHandler,
  connectGmailHandler,
  gmailCallbackHandler,
  getGmailStatusHandler,
  demoLoginHandler,
  getMeHandler,
  logoutHandler,
} from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.get('/google', googleAuthHandler);
router.get('/google/callback', googleCallbackHandler);
router.post('/google/verify', googleVerifyHandler);

router.get('/gmail/connect', authMiddleware, connectGmailHandler);
router.get('/gmail/callback', gmailCallbackHandler);
router.get('/gmail/status', authMiddleware, getGmailStatusHandler);

router.post('/demo', demoLoginHandler);
router.get('/me', authMiddleware, getMeHandler);
router.post('/logout', logoutHandler);

export default router;
