import { describe, expect, it } from 'vitest';
import { formatElapsedDuration } from './exam-timer.helpers';

describe('formatElapsedDuration', () => {
  it('formats zero and single-digit seconds correctly', () => {
    expect(formatElapsedDuration(0)).toBe('00:00');
    expect(formatElapsedDuration(5)).toBe('00:05');
  });

  it('formats minutes and seconds under an hour', () => {
    expect(formatElapsedDuration(60)).toBe('01:00');
    expect(formatElapsedDuration(65)).toBe('01:05');
    expect(formatElapsedDuration(599)).toBe('09:59');
    expect(formatElapsedDuration(3599)).toBe('59:59');
  });

  it('formats hours, minutes, and seconds when >= 1 hour', () => {
    expect(formatElapsedDuration(3600)).toBe('01:00:00');
    expect(formatElapsedDuration(3665)).toBe('01:01:05');
    expect(formatElapsedDuration(7325)).toBe('02:02:05');
  });

  it('handles negative, non-finite, and nullish inputs safely', () => {
    expect(formatElapsedDuration(-10)).toBe('00:00');
    expect(formatElapsedDuration(null)).toBe('00:00');
    expect(formatElapsedDuration(undefined)).toBe('00:00');
    expect(formatElapsedDuration(NaN)).toBe('00:00');
    expect(formatElapsedDuration(Infinity)).toBe('00:00');
  });
});
