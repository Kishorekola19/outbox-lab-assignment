import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../config/db';
import { config } from '../config/env';

const googleClient = new OAuth2Client(config.googleClientId);

export interface UserPayload {
  id: string;
  email: string;
  name: string;
  avatar?: string | null;
}

export function generateToken(user: UserPayload): string {
  return jwt.sign(user, config.jwtSecret, { expiresIn: '7d' });
}

export function verifyToken(token: string): UserPayload {
  return jwt.verify(token, config.jwtSecret) as UserPayload;
}

export async function verifyGoogleToken(idToken: string) {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: config.googleClientId,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw new Error('Invalid Google token payload');
    }

    const { sub: googleId, email, name, picture } = payload;

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        googleId,
        name: name || email.split('@')[0],
        avatar: picture,
      },
      create: {
        googleId,
        email,
        name: name || email.split('@')[0],
        avatar: picture,
      },
    });

    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
    });

    return { user, token };
  } catch (error: any) {
    console.error('Google ID token verification failed:', error.message);
    throw error;
  }
}

export async function loginOrRegisterDemoUser(email: string = 'oliver.brown@domain.io', name: string = 'Oliver Brown') {
  const avatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

  const user = await prisma.user.upsert({
    where: { email },
    update: { name, avatar },
    create: {
      email,
      name,
      avatar,
      googleId: 'demo_google_id_oliver_brown',
    },
  });

  const token = generateToken({
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
  });

  return { user, token };
}
