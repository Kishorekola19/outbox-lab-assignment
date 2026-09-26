import { Router } from 'express';
import {
  connectSlackHandler,
  slackCallbackHandler,
  getSlackStatusHandler,
  disconnectSlackHandler,
  mockConnectSlackHandler,
} from '../controllers/slackController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.get('/connect', authMiddleware, connectSlackHandler);
router.get('/callback', slackCallbackHandler);
router.get('/status', authMiddleware, getSlackStatusHandler);
router.post('/disconnect', authMiddleware, disconnectSlackHandler);
router.post('/mock-connect', authMiddleware, mockConnectSlackHandler);

export default router;
