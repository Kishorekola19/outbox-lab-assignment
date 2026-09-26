export function isValidEmailString(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

export function parseCSVRecipients(rawText: string): { validEmails: string[]; invalidEmails: string[] } {
  const lines = rawText.split(/[\r\n,;]+/);
  const validEmails: string[] = [];
  const invalidEmails: string[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const cleaned = line.trim().toLowerCase();
    if (!cleaned || cleaned === 'email' || cleaned === 'emails') continue; // skip CSV headers

    if (isValidEmailString(cleaned)) {
      if (!seen.has(cleaned)) {
        seen.add(cleaned);
        validEmails.push(cleaned);
      }
    } else if (cleaned.length > 0) {
      invalidEmails.push(cleaned);
    }
  }

  return { validEmails, invalidEmails };
}
