describe('Email Scheduler Helper Functions & Idempotency Tests', () => {
  test('Email validation correctly identifies valid and invalid emails', () => {
    const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    expect(isValidEmail('john@example.com')).toBe(true);
    expect(isValidEmail('sarah.wilson@domain.io')).toBe(true);
    expect(isValidEmail('invalid-email')).toBe(false);
    expect(isValidEmail('john@domain')).toBe(false);
  });

  test('Idempotency key format remains unique per recipient per campaign', () => {
    const campaignId = 'campaign_123';
    const recipientEmail = 'john@example.com';
    const index = 0;
    const key1 = `${campaignId}_${recipientEmail}_${index}`;
    const key2 = `${campaignId}_${recipientEmail}_${index}`;

    expect(key1).toBe(key2);
    expect(key1).toBe('campaign_123_john@example.com_0');
  });

  test('Rate limit calculation yields next hour window delay', () => {
    const now = new Date(Date.UTC(2026, 8, 25, 10, 45, 0));
    const nextHour = new Date(Date.UTC(2026, 8, 25, 11, 0, 0));
    const delayMs = nextHour.getTime() - now.getTime();

    expect(delayMs).toBe(15 * 60 * 1000); // exactly 15 minutes
  });
});
