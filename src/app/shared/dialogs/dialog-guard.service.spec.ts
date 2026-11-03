import { NEVER, of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';

import { DialogGuardService } from './dialog-guard.service';

describe('DialogGuardService', () => {
  const loadingService = () => ({ start: vi.fn(), stop: vi.fn() });

  it('passes a run flow through and holds its key until it ends, however it ends', () => {
    const guard = new DialogGuardService(loadingService() as any);
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
    const guard = new DialogGuardService(loadingService() as any);
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

  it('covers the page while the work waits, and uncovers it however the wait ends', () => {
    const loading = loadingService();
    const guard = new DialogGuardService(loading as any);
    const ref = { afterClosed: () => new Subject<void>() } as any;
    const waits = [ new Subject<any>(), new Subject<any>(), new Subject<any>() ];

    guard.open('opens', () => waits[0]).subscribe();
    guard.open('fails', () => waits[1]).subscribe({ error: () => {} });
    const left = guard.open('left', () => waits[2]).subscribe();
    guard.open('pending', () => NEVER).subscribe();
    expect(loading.start).toHaveBeenCalledTimes(4);

    waits[0].next(ref);
    waits[1].error(new Error('lookup failed'));
    left.unsubscribe();
    expect(loading.stop).toHaveBeenCalledTimes(3);
  });

  it('leaves the page uncovered when the dialog opens at once, or when asked not to cover', () => {
    const loading = loadingService();
    const guard = new DialogGuardService(loading as any);
    const ref = { afterClosed: () => new Subject<void>() } as any;

    guard.open('sync', () => of(ref)).subscribe();
    guard.open('sync-empty', () => of(undefined)).subscribe();
    guard.open('sync-error', () => throwError(new Error('open failed'))).subscribe({ error: () => {} });
    guard.open('background', () => NEVER, { cover: false }).subscribe();
    guard.open('sync', () => NEVER).subscribe();

    expect(loading.start).not.toHaveBeenCalled();
    expect(loading.stop).not.toHaveBeenCalled();
  });

  it('returns focus to the control that opened a covered dialog when it closes', () => {
    const guard = new DialogGuardService(loadingService() as any);
    const button = document.body.appendChild(document.createElement('button'));
    const closed = new Subject<void>();
    const wait = new Subject<any>();
    button.focus();

    guard.open('key', () => wait).subscribe();
    wait.next({ afterClosed: () => closed });
    button.blur();
    closed.next();

    expect(document.activeElement).toBe(button);
    button.remove();
  });
});
