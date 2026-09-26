import { prisma } from './src/config/db';

async function main() {
  const users = await prisma.user.findMany({
    include: { gmailConnection: true, emailSchedules: { include: { recipients: true } } }
  });
  console.log('USERS COUNT:', users.length);
  for (const u of users) {
    console.log('User:', u.id, u.email, u.name);
    console.log('GmailConnection:', u.gmailConnection);
    console.log('Schedules count:', u.emailSchedules.length);
    for (const s of u.emailSchedules) {
      console.log(' - Schedule:', s.id, s.subject, s.status, 'Recipients:', s.recipients.map(r => ({ email: r.email, status: r.status, gmailMessageId: r.gmailMessageId, error: r.errorMessage })));
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
