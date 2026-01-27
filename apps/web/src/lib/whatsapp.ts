export function normalizeWhatsapp(input: string): string {
  // Keep digits only.
  const digits = input.replace(/\D/g, '');

  // Common case: user types 08xx (Indonesia). Convert to 628xx.
  if (digits.startsWith('08')) return `62${digits.slice(1)}`;

  // Already in 62... or other country code.
  return digits;
}

export function isWhatsappValid(normalizedDigits: string): boolean {
  // Basic sanity check: 10–15 digits, starts with country code.
  return /^\d{10,15}$/.test(normalizedDigits);
}

export function whatsappLink(normalizedDigits: string): string {
  return `https://wa.me/${normalizedDigits}`;
}
