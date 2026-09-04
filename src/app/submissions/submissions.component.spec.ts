import { of } from 'rxjs';
import { vi } from 'vitest';

import { SubmissionsComponent } from './submissions.component';
import { DeviceType } from '../shared/device-info.service';

describe('SubmissionsComponent', () => {
  const submissionName = (user: any) => user.name || ((user.firstName || '') + ' ' + (user.lastName || '')).trim();

  const createComponent = () => new SubmissionsComponent(
    {} as any,
    { snapshot: { paramMap: { get: vi.fn().mockReturnValue(null) } } } as any,
    { submissionName } as any,
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

  it('links a submission to the member who answered it themselves', () => {
    const component = createComponent();

    const label = component['submittedByLabel']({ user: { _id: 'org.couchdb.user:amina', name: 'amina' } });

    expect(label).toEqual({ submittedBy: 'amina', submittedByProfile: 'amina' });
  });

  it('credits the operator who collected a response without claiming they answered it', () => {
    const component = createComponent();

    const label = component['submittedByLabel']({
      user: { age: 34, gender: 'male' },
      collectedBy: { _id: 'org.couchdb.user:gg', name: 'gg' }
    });

    expect(label.submittedBy).toBe('Collected by gg');
    expect(label.submittedByProfile).toBe('');
  });

  it('calls a response with no identity anonymous rather than unknown', () => {
    const component = createComponent();

    const label = component['submittedByLabel']({ user: { age: 34, gender: 'male' } });

    expect(label).toEqual({ submittedBy: 'Anonymous', submittedByProfile: '' });
  });
});
