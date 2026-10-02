/**
 * Simple validation helpers.
 * No external library needed for a prototype.
 */

export function validatePhone(phone: unknown): string | null {
  if (typeof phone !== 'string') return null;
  const cleaned = phone.replace(/\s+/g, '');
  // Accept any non-empty string as phone (no validation per spec)
  if (cleaned.length < 3 || cleaned.length > 20) return null;
  return cleaned;
}

export function validateAmount(amount: unknown): number | null {
  const num = Number(amount);
  if (isNaN(num) || num <= 0) return null;
  return Math.round(num * 100) / 100; // Round to 2 decimal places
}

export function validateMessage(message: unknown): string | null {
  if (typeof message !== 'string') return null;
  const trimmed = message.trim();
  if (trimmed.length === 0 || trimmed.length > 2000) return null;
  return trimmed;
}

export function validateName(name: unknown): string | null {
  if (typeof name !== 'string') return null;
  const trimmed = name.trim();
  if (trimmed.length === 0 || trimmed.length > 100) return null;
  return trimmed;
}
