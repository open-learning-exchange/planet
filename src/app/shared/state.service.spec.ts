import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { StateService } from './state.service';

describe('StateService', () => {
  it('notifies listeners and clears the pending flag when a database request fails', () => {
    const couchService = { get: vi.fn().mockReturnValue(throwError(new Error('offline'))) };
    const planetMessageService = { showAlert: vi.fn() };
    const service = new StateService(couchService as any, planetMessageService as any);
    const updates: any[] = [];
    service.couchStateListener('courses').subscribe((res) => updates.push(res));

    service.requestData('courses', 'parent');

    expect(updates).toEqual([ { newData: [], db: 'courses', planetField: 'parent', inProgress: false, error: true } ]);
    expect(planetMessageService.showAlert).toHaveBeenCalledTimes(1);

    // A failure must not leave the database flagged as in progress, otherwise the view can never retry
    service.requestData('courses', 'parent');

    expect(couchService.get).toHaveBeenCalledTimes(2);
    expect(planetMessageService.showAlert).toHaveBeenCalledTimes(1);
  });

  it('only alerts once when several databases on the same planet fail', () => {
    const couchService = { get: vi.fn().mockReturnValue(throwError(new Error('offline'))) };
    const planetMessageService = { showAlert: vi.fn() };
    const service = new StateService(couchService as any, planetMessageService as any);

    service.requestData('courses', 'parent');
    service.requestData('tags', 'parent');

    expect(planetMessageService.showAlert).toHaveBeenCalledTimes(1);
  });

  it('ignores change rows without a document', () => {
    const couchService = {
      get: vi.fn().mockReturnValue(of({
        last_seq: '5',
        results: [ { doc: null }, { doc: { _id: '_design/courses' } }, { doc: { _id: 'course-1' } } ]
      }))
    };
    const service = new StateService(couchService as any, { showAlert: vi.fn() } as any);
    service.state.parent = { courses: { docs: [ { _id: 'course-0' } ], lastSeq: '1' } };
    const updates: any[] = [];
    service.couchStateListener('courses').subscribe((res) => updates.push(res));

    service.requestData('courses', 'parent');

    expect(updates[0].newData).toEqual([ { _id: 'course-0' }, { _id: 'course-1' } ]);
    expect(updates[0].error).toBeUndefined();
  });
});
