import { of, Subject } from 'rxjs';
import { vi } from 'vitest';

import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  it('completes without emitting or erroring when the login dialog is cancelled', () => {
    const guard = new AuthGuard(
      { get: () => ({}), unset: vi.fn() } as any,
      { routerState: { snapshot: { url: '/community' } }, navigate: vi.fn() } as any,
      { getSessionInfo: () => of({ userCtx: { name: null } }) } as any,
      { getDialogById: () => undefined, open: () => ({ afterClosed: () => of(undefined) }) } as any,
      { configuration: { planetType: 'community' } } as any
    );
    const next = vi.fn();
    const error = vi.fn();
    const complete = vi.fn();

    guard.checkAuthenticationStatus().subscribe({ next, error, complete });

    expect(next).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    expect(complete).toHaveBeenCalledOnce();
  });

  it('shares one login dialog between concurrent checks and resumes both after login', () => {
    let session = { userCtx: { name: null } };
    const closed = new Subject<string>();
    let openDialog;
    const dialog = {
      getDialogById: () => openDialog,
      open: vi.fn(() => openDialog = { afterClosed: () => closed })
    };
    const guard = new AuthGuard(
      { get: () => ({ name: 'learner' }), unset: vi.fn() } as any,
      { routerState: { snapshot: { url: '/community' } }, navigate: vi.fn() } as any,
      { getSessionInfo: () => of(session) } as any,
      dialog as any,
      { configuration: { planetType: 'community' } } as any
    );
    const first = vi.fn();
    const second = vi.fn();

    guard.checkAuthenticationStatus().subscribe(first);
    guard.checkAuthenticationStatus().subscribe(second);
    session = { userCtx: { name: 'learner' } };
    closed.next('loggedIn');

    expect(dialog.open).toHaveBeenCalledOnce();
    expect(first).toHaveBeenCalledWith(true);
    expect(second).toHaveBeenCalledWith(true);
  });
});
