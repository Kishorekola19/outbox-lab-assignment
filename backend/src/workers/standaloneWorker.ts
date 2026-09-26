import { connectDatabase } from '../config/db';
import { initEmailService } from '../services/emailService';
import { startEmailWorker } from './emailWorker';

async function bootstrapWorker() {
  console.log('⚡ Starting Standalone BullMQ Worker Process...');
  await connectDatabase();
  await initEmailService();
  startEmailWorker();
  console.log('✅ Standalone Worker listening for BullMQ delayed/active jobs...');
}

bootstrapWorker().catch((err) => {
  console.error('❌ Worker process crash:', err);
  process.exit(1);
});
