import { of } from 'rxjs';
import { vi } from 'vitest';

import { SubmissionsComponent } from './submissions.component';
import { DeviceType } from '@shared/platform/device-info.service';

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
      watchDeviceType: vi.fn().mockReturnValue(of(DeviceType.DESKTOP)),
      getDeviceType: vi.fn().mockReturnValue(DeviceType.DESKTOP)
    } as any
  );

  it('keeps the search input synchronized with the table filter', () => {
    const component = createComponent();

    component.applyFilter('learner name');

    expect(component.searchValue).toBe('learner name');
    expect(component.submissions.filter).toBe('learner name');
  });
});
