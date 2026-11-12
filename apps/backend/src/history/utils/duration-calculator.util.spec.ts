import { computeEngagementDuration } from './duration-calculator.util';

describe('computeEngagementDuration', () => {
  it('should compute single day duration correctly', () => {
    const result = computeEngagementDuration('2026-03-01', '2026-03-01', new Date('2026-03-01'));
    expect(result.durationDays).toBe(1);
    expect(result.durationFormatted).toBe('1 day');
    expect(result.status).toBe('ONGOING');
  });

  it('should compute multi-day duration and mark as ONGOING when within range', () => {
    const result = computeEngagementDuration('2026-03-01', '2026-03-15', new Date('2026-03-10'));
    expect(result.durationDays).toBe(15);
    expect(result.durationFormatted).toBe('15 days');
    expect(result.status).toBe('ONGOING');
  });

  it('should format months and days for longer durations', () => {
    const result = computeEngagementDuration('2026-01-01', '2026-02-15', new Date('2026-02-20'));
    expect(result.durationDays).toBe(46);
    expect(result.durationFormatted).toBe('1 month 16 days');
    expect(result.status).toBe('COMPLETED');
  });

  it('should mark as SCHEDULED if reference date is before start date', () => {
    const result = computeEngagementDuration('2026-04-01', '2026-04-10', new Date('2026-03-01'));
    expect(result.status).toBe('SCHEDULED');
  });

  it('should mark as COMPLETED if reference date is after end date', () => {
    const result = computeEngagementDuration('2026-01-01', '2026-01-10', new Date('2026-02-01'));
    expect(result.status).toBe('COMPLETED');
  });
});
