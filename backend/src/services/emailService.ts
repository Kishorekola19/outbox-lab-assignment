import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config/env';

let transporter: Transporter | null = null;
let etherealAccount: { user: string; pass: string } | null = null;

export async function initEmailService() {
  try {
    if (config.etherealUser && config.etherealPassword) {
      transporter = nodemailer.createTransport({
        host: config.etherealHost,
        port: config.etherealPort,
        secure: false,
        auth: {
          user: config.etherealUser,
          pass: config.etherealPassword,
        },
      });
      console.log(`✅ Nodemailer initialized with configured Ethereal account: ${config.etherealUser}`);
    } else {
      console.log('🔄 Creating dynamic Ethereal Email test account...');
      const testAccount = await nodemailer.createTestAccount();
      etherealAccount = {
        user: testAccount.user,
        pass: testAccount.pass,
      };
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log(`✅ Ethereal Email dynamic test account created: ${testAccount.user}`);
    }
  } catch (error: any) {
    console.error('❌ Failed to initialize Nodemailer service:', error.message);
  }
}

export interface SendEmailOptions {
  from: string;
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: SendEmailOptions) {
  if (!transporter) {
    await initEmailService();
  }

  if (!transporter) {
    throw new Error('Nodemailer transporter is not initialized');
  }

  const info = await transporter.sendMail({
    from: options.from,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  console.log(`📧 Email sent to ${options.to}. MessageId: ${info.messageId}`);
  if (previewUrl) {
    console.log(`🔗 Ethereal Preview URL: ${previewUrl}`);
  }

  return {
    messageId: info.messageId,
    previewUrl: previewUrl || undefined,
  };
}
