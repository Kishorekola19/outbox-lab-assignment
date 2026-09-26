import { google } from 'googleapis';
import { prisma } from '../config/db';
import { config } from '../config/env';

export function getGmailOAuthClient() {
  return new google.auth.OAuth2(
    config.googleClientId,
    config.googleClientSecret,
    config.gmailRedirectUri || 'http://localhost:5000/api/auth/gmail/callback'
  );
}

export function getGmailAuthUrl(userId: string) {
  const oauth2Client = getGmailOAuthClient();
  const scopes = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/userinfo.email',
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: scopes,
    state: userId,
  });
}

export async function handleGmailOAuthCallback(code: string, userId: string) {
  const oauth2Client = getGmailOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const userInfo = await oauth2.userinfo.get();
  const email = userInfo.data.email || 'connected_gmail@domain.com';

  const connection = await prisma.gmailConnection.upsert({
    where: { userId },
    update: {
      email,
      refreshToken: tokens.refresh_token || '',
      accessToken: tokens.access_token || '',
      connected: true,
    },
    create: {
      userId,
      email,
      refreshToken: tokens.refresh_token || '',
      accessToken: tokens.access_token || '',
      connected: true,
    },
  });

  return connection;
}

export interface SendGmailOptions {
  userId: string;
  from?: string;
  to: string;
  subject: string;
  html: string;
}

export async function sendEmailViaGmail(options: SendGmailOptions) {
  const connection = await prisma.gmailConnection.findUnique({
    where: { userId: options.userId },
  });

  if (!connection || !connection.connected || !connection.refreshToken) {
    throw new Error(
      `Gmail account is not connected for user ${options.userId}. Please click 'Connect Gmail for Sending' in Settings before dispatching real emails.`
    );
  }

  console.log(`[GMAIL] Authenticated account: ${connection.email}`);
  console.log(`[GMAIL] Sending email\nFrom: ${connection.email}\nTo: ${options.to}\nSubject: ${options.subject}`);

  try {
    const oauth2Client = getGmailOAuthClient();
    oauth2Client.setCredentials({
      refresh_token: connection.refreshToken,
      access_token: connection.accessToken,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Format RFC 2822 / MIME Email
    const utf8Subject = `=?utf-8?B?${Buffer.from(options.subject).toString('base64')}?=`;
    const messageParts = [
      `From: <${connection.email}>`,
      `To: <${options.to}>`,
      `Subject: ${utf8Subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      '',
      options.html,
    ];
    const message = messageParts.join('\r\n');
    const rawMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: rawMessage,
      },
    });

    const messageId = response.data.id;
    if (!messageId) {
      throw new Error(`Gmail API failed to return a valid message ID (response: ${JSON.stringify(response.data)})`);
    }

    console.log(`[GMAIL] Gmail API response\nmessageId: ${messageId}`);

    return {
      messageId,
      senderEmail: connection.email,
    };
  } catch (error: any) {
    console.error(`[GMAIL] ERROR\nstatus: FAILED\nmessage: ${error.message}`);
    throw error;
  }
}
