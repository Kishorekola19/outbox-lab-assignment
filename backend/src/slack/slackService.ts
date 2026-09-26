import { WebClient } from '@slack/web-api';
import axios from 'axios';
import { prisma } from '../config/db';
import { config } from '../config/env';

export async function exchangeSlackCode(code: string, userId: string) {
  try {
    const params = new URLSearchParams({
      client_id: config.slackClientId,
      client_secret: config.slackClientSecret,
      code,
      redirect_uri: config.slackRedirectUri,
    });

    const response = await axios.post('https://slack.com/api/oauth.v2.access', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (!response.data.ok) {
      throw new Error(response.data.error || 'Slack OAuth exchange failed');
    }

    const { access_token, authed_user, incoming_webhook } = response.data;
    const slackUserId = authed_user?.id || response.data.bot_user_id || 'U_UNKNOWN';
    const slackChannelId = incoming_webhook?.channel_id || response.data.incoming_webhook?.channel_id || null;

    const connection = await prisma.slackConnection.upsert({
      where: { userId },
      update: {
        accessToken: access_token,
        slackUserId,
        slackChannelId,
        connected: true,
      },
      create: {
        userId,
        accessToken: access_token,
        slackUserId,
        slackChannelId,
        connected: true,
      },
    });

    return connection;
  } catch (error: any) {
    console.error('Slack OAuth Error:', error.message);
    throw error;
  }
}

export async function sendSlackRateLimitNotification(
  userId: string,
  senderEmail: string,
  hourlyLimit: number,
  timeWindow: string
) {
  try {
    const slackConn = await prisma.slackConnection.findUnique({
      where: { userId },
    });

    if (!slackConn || !slackConn.connected || !slackConn.accessToken) {
      console.log(`ℹ️ Slack notification skipped: User ${userId} has no active Slack connection.`);
      return;
    }

    const client = new WebClient(slackConn.accessToken);
    const channel = slackConn.slackChannelId || slackConn.slackUserId || 'general';

    const text = `⚠️ *Email Rate Limit Reached*\n\nSender: \`${senderEmail}\`\nHourly limit: *${hourlyLimit}*\nCurrent window: *${timeWindow}*\nAdditional emails have been delayed until the next available window.`;

    await client.chat.postMessage({
      channel,
      text,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `⚠️ *Email Rate Limit Reached*\n\nSender: *${senderEmail}*\nHourly limit: *${hourlyLimit}*\nCurrent window: *${timeWindow}*\n\n_Additional emails have been delayed until the next available window._`,
          },
        },
      ],
    });

    console.log(`💬 Slack rate limit notification sent to channel/user ${channel} for ${senderEmail}`);
  } catch (error: any) {
    console.error(`❌ Error sending Slack notification: ${error.message}`);
  }
}
