import { of } from 'rxjs';
import { vi } from 'vitest';

import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  it('completes without emitting or erroring when the login dialog is cancelled', () => {
    const guard = new AuthGuard(
      { get: () => ({}), unset: vi.fn() } as any,
      { routerState: { snapshot: { url: '/community' } }, navigate: vi.fn() } as any,
      { getSessionInfo: () => of({ userCtx: { name: null } }) } as any,
      { open: () => ({ afterClosed: () => of(undefined) }) } as any,
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
});
