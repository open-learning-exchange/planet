import { concat, of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { StateService } from './state.service';

describe('StateService', () => {
  it('notifies listeners and clears the pending flag when a database request fails', () => {
    const couchService = { get: vi.fn().mockReturnValue(throwError(new Error('offline'))) };
    const service = new StateService(couchService as any);
    const updates: any[] = [];
    service.couchStateListener('courses').subscribe((res) => updates.push(res));

    service.requestData('courses', 'parent');

    expect(updates).toEqual([ { newData: [], db: 'courses', planetField: 'parent', inProgress: false, error: true } ]);

    service.requestData('courses', 'parent');

    expect(couchService.get).toHaveBeenCalledTimes(2);
  });

  it('keeps the pages that arrived when a find fails part-way, and still re-runs the whole find next time', () => {
    const couchService = {
      get: vi.fn().mockReturnValue(of({ last_seq: '9', results: [] })),
      findAllStream: vi.fn().mockReturnValue(concat(of([ { _id: 'course-1' } ]), throwError(new Error('offline'))))
    };
    const service = new StateService(couchService as any);
    const updates: any[] = [];
    service.couchStateListener('courses').subscribe((res) => updates.push(res));

    service.requestData('courses', 'parent');

    expect(updates[updates.length - 1].newData).toEqual([ { _id: 'course-1' } ]);
    expect(updates[updates.length - 1].error).toBe(true);
    expect(service.state.parent.courses.docs).toEqual([ { _id: 'course-1' } ]);
    expect(service.state.parent.courses.lastSeq).toBe('now');

    service.requestData('courses', 'parent');

    expect(couchService.findAllStream).toHaveBeenCalledTimes(2);
  });

  it('emits retained data to direct consumers when a refresh fails', () => {
    const couchService = { get: vi.fn().mockReturnValue(throwError(new Error('offline'))) };
    const service = new StateService(couchService as any);
    service.state.parent = { tags: { docs: [ { _id: 'tag-1' } ], lastSeq: '1' } };
    let tags;

    service.getCouchState('tags', 'parent').subscribe((res) => tags = res);

    expect(tags).toEqual([ { _id: 'tag-1' } ]);
    expect(service.state.parent.tags.docs).toEqual([ { _id: 'tag-1' } ]);
  });

  it('drops a retained document that the successful retry no longer reports', () => {
    const couchService = {
      get: vi.fn().mockReturnValue(of({ last_seq: '9', results: [] })),
      findAllStream: vi.fn()
        .mockReturnValueOnce(concat(of([ { _id: 'course-1' }, { _id: 'course-2' } ]), throwError(new Error('offline'))))
        .mockReturnValueOnce(of([ { _id: 'course-1' } ]))
    };
    const service = new StateService(couchService as any);

    service.requestData('courses', 'parent');
    expect(service.state.parent.courses.docs).toEqual([ { _id: 'course-1' }, { _id: 'course-2' } ]);

    service.requestData('courses', 'parent');

    // course-2 was deleted between attempts, so the authoritative retry must not carry it forward
    expect(service.state.parent.courses.docs).toEqual([ { _id: 'course-1' } ]);
  });

  it('rewinds the sequence when changes succeed but the following find fails', () => {
    const couchService = {
      get: vi.fn().mockReturnValue(of({ last_seq: '9', results: [] })),
      findAllStream: vi.fn().mockReturnValue(throwError(new Error('offline')))
    };
    const service = new StateService(couchService as any);
    service.state.parent = { courses: { docs: [], lastSeq: '1' } };

    service.requestData('courses', 'parent');

    expect(service.state.parent.courses.lastSeq).toBe('1');
    expect(service.state.parent.courses.docs).toEqual([]);
  });

  it('keeps a find incomplete until its terminal page arrives', () => {
    const couchService = {
      get: vi.fn().mockReturnValue(of({ last_seq: '9', results: [] })),
      findAllStream: vi.fn().mockReturnValue(of([ { _id: 'course-1' } ], []))
    };
    const service = new StateService(couchService as any);
    const incompleteStates: boolean[] = [];
    service.couchStateListener('courses').subscribe(() => {
      incompleteStates.push(service.state.parent.courses.incomplete);
    });

    service.requestData('courses', 'parent');

    expect(incompleteStates).toEqual([ true, false ]);
  });

  it('starts a fresh authoritative find for each subscription', () => {
    const couchService = {
      get: vi.fn().mockReturnValue(of({ last_seq: '9', results: [] })),
      findAllStream: vi.fn()
        .mockReturnValueOnce(concat(of([ { _id: 'course-1' }, { _id: 'course-2' } ]), throwError(new Error('offline'))))
        .mockReturnValueOnce(of([ { _id: 'course-1' } ], []))
    };
    const service = new StateService(couchService as any);
    const stateRequest = service.getCouchState('courses', 'parent');

    stateRequest.subscribe(() => {});
    stateRequest.subscribe(() => {});

    expect(couchService.findAllStream).toHaveBeenCalledTimes(2);
    expect(service.state.parent.courses.docs).toEqual([ { _id: 'course-1' } ]);
  });

  it('ignores change rows without a document', () => {
    const couchService = {
      get: vi.fn().mockReturnValue(of({
        last_seq: '5',
        results: [ { doc: null }, { doc: { _id: '_design/courses' } }, { doc: { _id: 'course-1' } } ]
      }))
    };
    const service = new StateService(couchService as any);
    service.state.parent = { courses: { docs: [ { _id: 'course-0' } ], lastSeq: '1' } };
    const updates: any[] = [];
    service.couchStateListener('courses').subscribe((res) => updates.push(res));

    service.requestData('courses', 'parent');

    expect(updates[0].newData).toEqual([ { _id: 'course-0' }, { _id: 'course-1' } ]);
    expect(updates[0].error).toBeUndefined();
  });
});
