import { describe, it, expect } from 'vitest';
import { initialOrder, between, beforeAll, afterAll } from './lexorank';

describe('lexorank', () => {
  it('initialOrder() returns a valid string', () => {
    expect(initialOrder()).toMatch(/^[a-zA-Z0-9]+$/);
  });

  it('between(a, b) returns a key strictly between a and b', () => {
    const result = between('a0', 'a1');
    expect(result > 'a0' && result < 'a1').toBe(true);
  });

  it('beforeAll(first) returns a key smaller than first', () => {
    expect(beforeAll('a0') < 'a0').toBe(true);
  });

  it('afterAll(last) returns a key larger than last', () => {
    expect(afterAll('a0') > 'a0').toBe(true);
  });

  it('between() can be applied repeatedly without collision', () => {
    let lo = 'a0';
    let hi = 'a1';
    for (let i = 0; i < 50; i++) {
      const mid = between(lo, hi);
      expect(mid > lo && mid < hi).toBe(true);
      lo = mid;
    }
  });
});
