import { describe, it, expect } from 'vitest';
import { scanPresetRange } from './scanDefaults';

describe('scanPresetRange', () => {
  const wednesday = new Date('2026-10-08T05:30:00+07:00');
  const sunday = new Date('2026-10-11T22:00:00+07:00');

  it.each([
    ['thisWeek', wednesday, '2026-10-05', '2026-10-08'],
    ['thisWeek', sunday, '2026-10-05', '2026-10-11'],
    ['lastWeek', wednesday, '2026-09-28', '2026-10-04'],
    ['lastWeek', sunday, '2026-09-28', '2026-10-04'],
    ['thisMonth', wednesday, '2026-10-01', '2026-10-08'],
  ] as const)('%s on %s → %s .. %s (weeks start Monday, local dates)', (preset, now, startDate, endDate) => {
    expect(scanPresetRange(preset, now)).toEqual({ startDate, endDate });
  });
});
