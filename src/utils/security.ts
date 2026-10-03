/**
 * Security and sanitization utilities for LITERIA
 */

export function sanitizeText(input: string): string {
  if (!input) return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function validateTitle(title: string, maxLength = 255): { isValid: boolean; error?: string } {
  const trimmed = title.trim();
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Title cannot be empty.' };
  }
  if (trimmed.length > maxLength) {
    return { isValid: false, error: `Title cannot exceed ${maxLength} characters.` };
  }
  return { isValid: true };
}

export function generateSafeId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
