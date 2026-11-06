import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { HealthService } from './health.service';

describe('HealthService addEvent', () => {
  const patientId = 'org.couchdb.user:patient';
  let put: ReturnType<typeof vi.fn>;
  let service: HealthService;

  const failWrite = (id: string, status: number) =>
    put.mockImplementation((url, body) => body._id === id ? throwError(() => ({ status })) : of({ ok: true }));
  const addEvent = (oldEvent: any) => {
    const result = { next: vi.fn(), error: vi.fn() };
    service.addEvent(patientId, patientId, oldEvent, { selfExamination: true }).subscribe(result);
    return result;
  };

  beforeEach(() => {
    put = vi.fn().mockReturnValue(of({ ok: true }));
    const couchService = {
      findAll: vi.fn().mockReturnValue(of([ { key: 'key', iv: 'iv', createdOn: 1 } ])),
      post: vi.fn().mockReturnValue(of({ _id: patientId, _rev: '1-a', userKey: 'patient-key' })),
      get: vi.fn().mockImplementation((path: string) => of(path === 'health/exam' ? { _rev: '1-c', date: 500 } : {})),
      currentTime: vi.fn().mockReturnValue(of(1000)),
      put
    };
    service = new HealthService(couchService as any, { configuration: { code: 'planet' } } as any, { requestUsers: vi.fn() } as any);
  });

  it('writes no examination when the patient health document fails', () => {
    failWrite(patientId, 500);

    expect(addEvent({ _id: 'exam' }).error).toHaveBeenCalled();
    expect(put.mock.calls.map(([ , body ]) => body._id)).toEqual([ patientId ]);
  });

  it('overwrites a new examination an earlier attempt already saved', () => {
    put.mockImplementation((url, body) => body._id === 'exam' && !body._rev ? throwError(() => ({ status: 409 })) : of({ ok: true }));

    expect(addEvent({ _id: 'exam' }).next).toHaveBeenCalled();
    expect(put).toHaveBeenLastCalledWith(expect.any(String), expect.objectContaining({ _id: 'exam', _rev: '1-c', date: 500 }));
  });

  it('reports a conflict on an edited examination', () => {
    failWrite('exam', 409);

    expect(addEvent({ _id: 'exam', _rev: '1-b' }).error).toHaveBeenCalledWith({ status: 409 });
  });
});
