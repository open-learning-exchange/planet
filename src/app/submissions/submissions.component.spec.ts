import { signal } from '@angular/core';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { DeviceType } from '@shared/ui/device-info.service';

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
    {
      isMobile: signal(false),
      watchDeviceType: vi.fn().mockReturnValue(of(DeviceType.DESKTOP))
    } as any
  );

  it('keeps the search input synchronized with the table filter', () => {
    const component = createComponent();

    component.applyFilter('learner name');

    expect(component.searchValue).toBe('learner name');
    expect(component.submissions.filter).toBe('learner name');
  });
});
