import { describe, it, expect } from 'vitest';
import { defaultScanRange } from './scanDefaults';

describe('defaultScanRange', () => {
  it('uses the local calendar date, not the UTC date', () => {
    // 05:30 in Jakarta (UTC+7) is still the previous day in UTC.
    const now = new Date('2026-10-08T05:30:00+07:00');

    expect(defaultScanRange(now)).toEqual({ startDate: '2026-10-01', endDate: '2026-10-08' });
  });
});
