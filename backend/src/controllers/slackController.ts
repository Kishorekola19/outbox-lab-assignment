import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { prisma } from '../config/db';
import { config } from '../config/env';
import { exchangeSlackCode } from '../slack/slackService';

export async function connectSlackHandler(req: AuthRequest, res: Response) {
  const redirectUri = encodeURIComponent(config.slackRedirectUri);
  const scope = encodeURIComponent('chat:write,incoming-webhook');
  const slackAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${config.slackClientId}&scope=${scope}&redirect_uri=${redirectUri}`;

  if (!config.slackClientId) {
    return res.status(400).json({
      error: 'SLACK_CLIENT_ID is not configured in backend .env. Use mock connect or set SLACK_CLIENT_ID.',
      slackAuthUrl: null,
    });
  }

  res.redirect(slackAuthUrl);
}

export async function slackCallbackHandler(req: Request, res: Response) {
  try {
    const { code, state } = req.query;
    if (!code || typeof code !== 'string') {
      return res.redirect(`${config.frontendUrl}/settings/slack?error=missing_code`);
    }

    // Pass code to exchangeSlackCode
    const userId = (state as string) || 'default_user';
    await exchangeSlackCode(code, userId);

    res.redirect(`${config.frontendUrl}/settings/slack?connected=true`);
  } catch (error: any) {
    console.error('Slack OAuth Callback Error:', error.message);
    res.redirect(`${config.frontendUrl}/settings/slack?error=${encodeURIComponent(error.message)}`);
  }
}

export async function getSlackStatusHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const connection = await prisma.slackConnection.findUnique({
      where: { userId },
    });

    return res.json({
      connected: !!connection?.connected,
      slackUserId: connection?.slackUserId || null,
      slackChannelId: connection?.slackChannelId || null,
      updatedAt: connection?.updatedAt || null,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function disconnectSlackHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    await prisma.slackConnection.upsert({
      where: { userId },
      update: { connected: false },
      create: {
        userId,
        accessToken: 'disconnected',
        connected: false,
      },
    });

    return res.json({ message: 'Slack disconnected successfully', connected: false });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function mockConnectSlackHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const connection = await prisma.slackConnection.upsert({
      where: { userId },
      update: {
        accessToken: 'xoxb-mock-token-demo',
        slackUserId: 'U_MOCK_USER_DEMO',
        slackChannelId: 'C_MOCK_ALERTS',
        connected: true,
      },
      create: {
        userId,
        accessToken: 'xoxb-mock-token-demo',
        slackUserId: 'U_MOCK_USER_DEMO',
        slackChannelId: 'C_MOCK_ALERTS',
        connected: true,
      },
    });

    return res.json({ message: 'Slack connected successfully (Demo Mode)', connection });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
