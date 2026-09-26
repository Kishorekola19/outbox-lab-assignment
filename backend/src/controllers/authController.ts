import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { verifyGoogleToken, loginOrRegisterDemoUser } from '../auth/authService';
import { config } from '../config/env';
import { prisma } from '../config/db';
import { getGmailAuthUrl, handleGmailOAuthCallback } from '../services/gmailService';

export async function googleAuthHandler(req: Request, res: Response) {
  const redirectUri = encodeURIComponent(config.googleCallbackUrl);
  const scope = encodeURIComponent('openid profile email https://www.googleapis.com/auth/gmail.send');
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${config.googleClientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
  
  if (!config.googleClientId) {
    return res.status(400).json({
      error: 'GOOGLE_CLIENT_ID is not configured in backend .env. Use /api/auth/demo for 1-click testing.',
    });
  }

  res.redirect(googleAuthUrl);
}

export async function googleCallbackHandler(req: Request, res: Response) {
  try {
    const { code } = req.query;
    if (!code || typeof code !== 'string') {
      return res.redirect(`${config.frontendUrl}/login?error=missing_code`);
    }

    const { OAuth2Client } = require('google-auth-library');
    const client = new OAuth2Client(config.googleClientId, config.googleClientSecret, config.googleCallbackUrl);
    const { tokens } = await client.getToken(code);

    if (!tokens.id_token) {
      return res.redirect(`${config.frontendUrl}/login?error=no_id_token`);
    }

    const { user, token } = await verifyGoogleToken(tokens.id_token);

    // If Google returned tokens with access to Gmail, save/update GmailConnection
    if (tokens.refresh_token || tokens.access_token) {
      await prisma.gmailConnection.upsert({
        where: { userId: user.id },
        update: {
          email: user.email,
          refreshToken: tokens.refresh_token || undefined,
          accessToken: tokens.access_token || undefined,
          connected: true,
        },
        create: {
          userId: user.id,
          email: user.email,
          refreshToken: tokens.refresh_token || '',
          accessToken: tokens.access_token || '',
          connected: true,
        },
      });
      console.log(`[AUTH] Gmail connection saved during Google Login for ${user.email}`);
    }

    res.redirect(`${config.frontendUrl}/login?token=${token}`);
  } catch (error: any) {
    console.error('Google Callback Error:', error.message);
    res.redirect(`${config.frontendUrl}/login?error=auth_failed`);
  }
}

export async function googleVerifyHandler(req: Request, res: Response) {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: 'idToken is required' });
    }

    const { user, token } = await verifyGoogleToken(idToken);
    return res.json({ user, token });
  } catch (error: any) {
    return res.status(401).json({ error: error.message || 'Google authentication failed' });
  }
}

export async function connectGmailHandler(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  if (!config.googleClientId) {
    return res.redirect(`${config.frontendUrl}/settings/slack?gmail_error=${encodeURIComponent('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are not configured in backend/.env')}`);
  }

  const authUrl = getGmailAuthUrl(userId);
  res.redirect(authUrl);
}

export async function gmailCallbackHandler(req: Request, res: Response) {
  try {
    const { code, state: userId } = req.query;
    if (!code || typeof code !== 'string' || !userId || typeof userId !== 'string') {
      return res.redirect(`${config.frontendUrl}/settings/slack?gmail_error=missing_code`);
    }

    await handleGmailOAuthCallback(code, userId);
    res.redirect(`${config.frontendUrl}/settings/slack?gmail_connected=true`);
  } catch (error: any) {
    console.error('Gmail OAuth Callback Error:', error.message);
    res.redirect(`${config.frontendUrl}/settings/slack?gmail_error=${encodeURIComponent(error.message)}`);
  }
}

export async function getGmailStatusHandler(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const connection = await prisma.gmailConnection.findUnique({
      where: { userId },
    });

    return res.json({
      connected: !!connection?.connected,
      email: connection?.email || null,
      updatedAt: connection?.updatedAt || null,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function demoLoginHandler(req: Request, res: Response) {
  try {
    const { email, name } = req.body;
    const { user, token } = await loginOrRegisterDemoUser(email || 'oliver.brown@domain.io', name || 'Oliver Brown');
    return res.json({ user, token, message: 'Logged in successfully as Oliver Brown' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function getMeHandler(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        slackConnection: {
          select: { connected: true, slackUserId: true },
        },
        gmailConnection: {
          select: { connected: true, email: true },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function logoutHandler(req: Request, res: Response) {
  res.clearCookie('token');
  return res.json({ message: 'Logged out successfully' });
}
