import test from 'node:test';
import assert from 'node:assert/strict';
import { adjustedScore, calculateResult } from '../lib/gap';

test('reverse scores negatively worded items', () => {
  assert.equal(adjustedScore(1, true), 5);
  assert.equal(adjustedScore(2, true), 4);
  assert.equal(adjustedScore(5, true), 1);
  assert.equal(adjustedScore(2, false), 2);
});

test('applies 30 percent self and 70 percent supervisor weighting', () => {
  const result = calculateResult(4, 3, 4);
  assert.equal(result.actualLevel, 3.7);
  assert.ok(Math.abs(result.gap - 0.3) < 1e-10);
  assert.equal(result.category, 'MINOR');
});

test('classifies critical and moderate boundaries correctly', () => {
  assert.equal(calculateResult(4, 2, 2).category, 'CRITICAL');
  assert.equal(calculateResult(4, 3, 3).category, 'MODERATE');
  assert.equal(calculateResult(4, 3.5, 3.5).category, 'MINOR');
});

test('does not create a negative gap when actual exceeds required', () => {
  const result = calculateResult(3, 5, 5);
  assert.equal(result.gap, 0);
  assert.equal(result.category, 'MINOR');
});

test('regression: 30/70 weighting has no floating-point noise (3*0.3 + 4*0.7 = 3.7)', () => {
  assert.equal(calculateResult(4, 3, 4).actualLevel, 3.7);
});

test('exact boundaries: gap 2.0 is Critical, gap 1.0 is Moderate, gap just under 1 is Minor', () => {
  assert.equal(calculateResult(4, 2, 2).gap, 2);          // actual 2.0
  assert.equal(calculateResult(4, 2, 2).category, 'CRITICAL');
  assert.equal(calculateResult(4, 3, 3).gap, 1);          // actual 3.0
  assert.equal(calculateResult(4, 3, 3).category, 'MODERATE');
  assert.equal(calculateResult(4, 3.5, 3.5).category, 'MINOR'); // gap 0.5
});

test('every required level x self average x supervisor rating combination matches exact integer arithmetic', () => {
  for (let req = 1; req <= 5; req++) for (let s2 = 2; s2 <= 10; s2++) for (let sup = 1; sup <= 5; sup++) {
    const gap20 = 20 * req - 3 * s2 - 14 * sup;                 // gap x 20, no decimals
    const expected = gap20 >= 40 ? 'CRITICAL' : gap20 >= 20 ? 'MODERATE' : 'MINOR';
    assert.equal(calculateResult(req, s2 / 2, sup).category, expected, `req ${req}, self ${s2 / 2}, sup ${sup}`);
  }
});

test('negative wording is reversed before averaging a competency', () => {
  // "I write efficient code" = 4 (normal) and "I often need help to debug" = 2 (negative -> 4): self average 4
  const avg = (adjustedScore(4, false) + adjustedScore(2, true)) / 2;
  assert.equal(avg, 4);
  assert.equal(calculateResult(4, avg, 4).category, 'MINOR');
});
