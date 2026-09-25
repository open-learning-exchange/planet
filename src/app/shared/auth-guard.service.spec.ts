import { of } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from './auth-guard.service';

describe('AuthService login guard', () => {
  it('sends a signed-in user on to the link they opened', () => {
    const router = { navigateByUrl: vi.fn() };
    const pouchAuthService = { getSessionInfo: () => of({ userCtx: { name: 'alex' } }) };
    const stateService = { configuration: { planetType: 'center' } };
    const service = new AuthService({} as any, router as any, pouchAuthService as any, {} as any, stateService as any);
    let canActivate: boolean;

    service.canActivate({ queryParams: { returnUrl: '/voices/voice-1' } } as any, {} as any)
      .subscribe(result => canActivate = result);

    expect(canActivate).toBe(false);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/voices/voice-1');
  });
});
