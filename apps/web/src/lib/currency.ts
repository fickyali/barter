export function parseIdrToNumber(input: string | null | undefined): number | null {
  const digits = String(input ?? '').replace(/[^0-9]/g, '');
  if (!digits) return null;
  const n = Number.parseInt(digits, 10);
  if (!Number.isFinite(n)) return null;
  return n;
}

export function parseIdrUnknownToNumber(input: unknown): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === 'number') return Number.isFinite(input) ? Math.floor(input) : null;
  if (typeof input === 'bigint') {
    const asNumber = Number(input);
    return Number.isFinite(asNumber) ? Math.floor(asNumber) : null;
  }
  if (typeof input === 'string') return parseIdrToNumber(input);
  return parseIdrToNumber(String(input));
}

export function formatIdr(amount: number): string {
  const safe = Math.max(0, Math.floor(amount));
  const formatted = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(safe);
  return `Rp${formatted}`;
}

export function formatIdrFromText(input: string | null | undefined): string | null {
  const trimmed = (input ?? '').trim();
  if (!trimmed) return null;

  const n = parseIdrToNumber(trimmed);
  if (n === null) return trimmed;

  return formatIdr(n);
}

export function formatIdrFromUnknown(input: unknown): string | null {
  if (input === null || input === undefined) return null;
  if (typeof input === 'string') return formatIdrFromText(input);

  const n = parseIdrUnknownToNumber(input);
  if (n === null) return String(input);
  return formatIdr(n);
}
