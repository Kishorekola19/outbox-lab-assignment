import Redis from 'ioredis';
import { config } from './env';

const isTls = config.redisUrl.startsWith('rediss://');

export const redisConnection = new Redis(config.redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  ...(isTls ? { tls: { rejectUnauthorized: false } } : {}),
  retryStrategy(times) {
    // Retry connecting every 2 seconds without throwing uncaught exceptions
    return 2000;
  },
});

redisConnection.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

redisConnection.on('error', (err) => {
  // Silent log warning so dev server never crashes if Redis is offline
  if (process.env.NODE_ENV === 'development') {
    console.warn(`⚠️ Redis connection note (${config.redisUrl}): ${err.message}`);
  }
});
