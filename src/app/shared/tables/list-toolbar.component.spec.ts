import { vi } from 'vitest';

import { searchSelectionFilters } from './list-toolbar.component';

describe('searchSelectionFilters', () => {
  const categories = [
    { label: 'gradeLevel', options: [ { label: 'Grade 1', value: '1' }, { label: 'Grade 2', value: '2' } ] },
    { label: 'subjectLevel', options: [ { label: 'Beginner', value: 'beginner' } ] }
  ];

  it('gives each selected value a chip labelled from its options', () => {
    const selection = { isEmpty: false, gradeLevel: [ '1', '2' ], subjectLevel: [ 'beginner' ] };

    const filters = searchSelectionFilters(categories, selection, vi.fn());

    expect(filters.map(filter => filter.label)).toEqual([ 'Grade 1', 'Grade 2', 'Beginner' ]);
  });

  it('skips categories that were never selected', () => {
    expect(searchSelectionFilters(categories, { isEmpty: true }, vi.fn())).toEqual([]);
  });

  it('clears only its own value from its category', () => {
    const change = vi.fn();
    const filters = searchSelectionFilters(categories, { gradeLevel: [ '1', '2' ] }, change);

    filters[0].clear();

    expect(change).toHaveBeenCalledWith({ category: 'gradeLevel', items: [ '2' ] });
  });
});
