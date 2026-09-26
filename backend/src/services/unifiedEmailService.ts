import { config } from '../config/env';
import { prisma } from '../config/db';
import { sendEmail as sendEtherealEmail } from './emailService';
import { sendEmailViaGmail } from './gmailService';

export interface DispatchEmailOptions {
  userId: string;
  from: string;
  to: string;
  subject: string;
  html: string;
}

export async function dispatchEmail(options: DispatchEmailOptions) {
  // Check if user has an active Gmail connection
  const gmailConn = await prisma.gmailConnection.findUnique({
    where: { userId: options.userId },
  });

  if (gmailConn && gmailConn.connected && gmailConn.refreshToken) {
    console.log(`[EMAIL_DISPATCH] Using real Gmail API for recipient ${options.to} (Sender: ${gmailConn.email})`);
    return await sendEmailViaGmail({
      ...options,
      from: gmailConn.email,
    });
  }

  throw new Error(
    `Real email delivery requires an authenticated Gmail account. Please connect your Gmail account in Settings before sending real emails to recipient ${options.to}.`
  );
}
