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

  it('frees the key whenever no dialog opens', () => {
    const guard = new DialogGuardService();
    const ref = { afterClosed: () => new Subject<void>() } as any;
    const opened = vi.fn();

    guard.open('key', () => throwError(new Error('open failed'))).subscribe({ error: () => {} });
    guard.open('key', () => {
      throw new Error('open failed');
    }).subscribe({ error: () => {} });
    guard.open('key', () => of(undefined)).subscribe();
    guard.open('key', () => NEVER).subscribe().unsubscribe();
    guard.open('key', () => of(ref)).subscribe(opened);

    expect(opened).toHaveBeenCalledWith(ref);
    expect(guard.isActive('key')).toBe(true);
  });
});
