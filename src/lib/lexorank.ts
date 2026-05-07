import { generateKeyBetween } from 'fractional-indexing';

export function initialOrder(): string {
  return generateKeyBetween(null, null);
}

export function between(a: string, b: string): string {
  return generateKeyBetween(a, b);
}

export function beforeAll(first: string): string {
  return generateKeyBetween(null, first);
}

export function afterAll(last: string): string {
  return generateKeyBetween(last, null);
}
