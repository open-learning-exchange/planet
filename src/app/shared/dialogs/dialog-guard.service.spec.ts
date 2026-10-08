import { NEVER, of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';

import { DialogGuardService } from './dialog-guard.service';

describe('DialogGuardService', () => {
  it('passes a run flow through and holds its key until it ends, however it ends', () => {
    const guard = new DialogGuardService();
    const flow = new Subject<void>();
    const work = vi.fn(() => flow);
    const next = vi.fn();
    const error = vi.fn();

    guard.run('key', () => NEVER);
    guard.run('key', () => of(true)).subscribe(next);
    guard.run('key', () => throwError(new Error('flow failed'))).subscribe({ error });
    guard.run('key', () => {
      throw new Error('flow failed');
    }).subscribe({ error });
    guard.run('key', () => NEVER).subscribe().unsubscribe();
    guard.run('key', work).subscribe();
    guard.run('key', work).subscribe();

    expect(next).toHaveBeenCalledWith(true);
    expect(error).toHaveBeenCalledTimes(2);
    expect(work).toHaveBeenCalledTimes(1);
    expect(guard.isActive('key')).toBe(true);

    flow.complete();
    expect(guard.isActive('key')).toBe(false);
  });
});
