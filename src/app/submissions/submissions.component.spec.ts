import { vi } from 'vitest';

import { SubmissionsComponent } from './submissions.component';

describe('SubmissionsComponent', () => {
  const createComponent = () => new SubmissionsComponent(
    {} as any,
    { snapshot: { paramMap: { get: vi.fn().mockReturnValue(null) } } } as any,
    {} as any,
    {} as any,
    {} as any,
    { configuration: {} } as any,
    { start: vi.fn() } as any,
    {} as any,
    {} as any
  );

  it('keeps the search input synchronized with the table filter', () => {
    const component = createComponent();

    component.applyFilter('learner name');

    expect(component.searchValue).toBe('learner name');
    expect(component.submissions.filter).toBe('learner name');
  });

  it('clears the status that switching back to tests turns on', () => {
    const component = createComponent();
    component.onFilterChange('survey', 'type');

    component.resetFilter();

    expect(component.filter.type).toBe('exam');
    expect(component.filter.status).toBe('');
    expect(component.activeFilters).toEqual([]);
  });
});
