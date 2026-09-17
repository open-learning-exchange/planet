import { vi } from 'vitest';

import { ReportsService } from './reports.service';

describe('ReportsService.getDateRange', () => {
  const service = Object.create(ReportsService.prototype) as ReportsService;
  const minDate = new Date(2018, 6, 1);

  const atTime = (date: Date) => {
    vi.useFakeTimers();
    vi.setSystemTime(date);
  };

  afterEach(() => {
    vi.useRealTimers();
  });

  it('clamps a month end start date to the last day of the target month', () => {
    atTime(new Date(2025, 4, 31, 14, 30));

    // Unclamped, subtracting three months from May 31 overflows Feb 31 into Mar 3.
    expect(service.getDateRange('3m', minDate).startDate).toEqual(new Date(2025, 1, 28));
  });

  it('clamps a leap day start date when going back a year', () => {
    atTime(new Date(2024, 1, 29, 9, 15));

    expect(service.getDateRange('12m', minDate).startDate).toEqual(new Date(2023, 1, 28));
  });

  it('does not let the start date calculation move the end of the range', () => {
    atTime(new Date(2025, 4, 31, 14, 30));

    expect(service.getDateRange('3m', minDate).endDate).toEqual(new Date(2025, 4, 31, 14, 30));
  });

  it('leaves the day and hour ranges rolling', () => {
    atTime(new Date(2025, 4, 31, 14, 30));

    expect(service.getDateRange('7d', minDate).startDate).toEqual(new Date(2025, 4, 24, 14, 30));
    expect(service.getDateRange('24h', minDate).startDate).toEqual(new Date(2025, 4, 30, 14, 30));
  });
});
