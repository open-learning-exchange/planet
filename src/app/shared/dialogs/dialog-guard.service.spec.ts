import { NEVER, of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';

import { DialogGuardService } from './dialog-guard.service';

describe('DialogGuardService', () => {
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
