import { vi } from 'vitest';

import { ReportsDetailComponent } from './reports-detail.component';

describe('ReportsDetailComponent time frame defaults', () => {
  const buildComponent = (selectedTimeFilter: string, startDate: Date) => {
    const component = Object.create(ReportsDetailComponent.prototype) as ReportsDetailComponent;
    component.selectedTimeFilter = selectedTimeFilter;
    component.filter = { app: '', members: [], startDate, endDate: new Date(2025, 5, 1) };
    component.minDate = new Date(2018, 6, 1);
    return component;
  };

  it('seeds the custom range with the dates already on screen', () => {
    const patchValue = vi.fn();
    const twelveMonthsAgo = new Date(2024, 5, 1);
    const component = buildComponent('12m', twelveMonthsAgo);
    component.dateFilterForm = { patchValue } as any;
    (component as any).activityService = {
      getDateRange: () => ({ startDate: null, endDate: null, showCustomDateFields: true })
    };

    component.onTimeFilterChange('custom');

    expect(patchValue).toHaveBeenCalledWith({ startDate: twelveMonthsAgo, endDate: new Date(2025, 5, 1) });
  });

  it('follows the selected time frame rather than a fixed default', () => {
    const component = buildComponent('12m', new Date(2024, 5, 1));
    const getDateRange = vi.fn(() => ({ startDate: new Date(2024, 0, 2), endDate: new Date(), showCustomDateFields: false }));
    (component as any).activityService = { getDateRange };

    expect((component as any).defaultStartDate()).toEqual(new Date(2024, 0, 2));
    expect(getDateRange).toHaveBeenCalledWith('12m', component.minDate);
  });
});
