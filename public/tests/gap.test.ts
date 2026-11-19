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
