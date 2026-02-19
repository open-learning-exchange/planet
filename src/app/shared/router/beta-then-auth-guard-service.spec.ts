import { Subject, of } from 'rxjs';

import { AuthService } from '../auth-guard.service';
import { BetaThenAuthService } from '../beta-then-auth-guard-service';
import { StateService } from '../state.service';
import { UserService } from '../user.service';

describe('BetaThenAuthService', () => {
  let authService: jasmine.SpyObj<AuthService>;
  let userService: jasmine.SpyObj<UserService>;
  let stateService: jasmine.SpyObj<StateService> & { configuration: any };
  let guardService: BetaThenAuthService;

  beforeEach(() => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', [ 'canActivateChild' ]);
    userService = jasmine.createSpyObj<UserService>('UserService', [ 'isBetaEnabled' ]);
    stateService = jasmine.createSpyObj<StateService>('StateService', [ 'couchStateListener' ]) as jasmine.SpyObj<StateService> & { configuration: any };
    stateService.configuration = { _id: 'config-id' };

    guardService = new BetaThenAuthService(authService, userService, stateService);
  });

  it('waits for config load before evaluating authentication', () => {
    const route = {} as any;
    const state = { url: '/earth' } as any;
    const configLoaded$ = new Subject<any>();
    stateService.configuration = {};
    stateService.couchStateListener.and.returnValue(configLoaded$);
    userService.isBetaEnabled.and.returnValue(false);
    authService.canActivateChild.and.returnValue(of(true));

    let activationResult: boolean | undefined;
    guardService.canActivate(route, state).subscribe((result) => {
      activationResult = result;
    });

    expect(stateService.couchStateListener).toHaveBeenCalledWith('configurations');
    expect(authService.canActivateChild).not.toHaveBeenCalled();
    expect(activationResult).toBeUndefined();

    configLoaded$.next({ newData: {}, db: 'configurations', planetField: null, inProgress: false });

    expect(authService.canActivateChild).toHaveBeenCalledWith(route, state);
    expect(activationResult).toBe(true);
  });

  it('allows beta-enabled users without auth guard checks', () => {
    userService.isBetaEnabled.and.returnValue(true);

    let activationResult: boolean | undefined;
    guardService.canActivate({} as any, {} as any).subscribe((result) => {
      activationResult = result;
    });

    expect(activationResult).toBe(true);
    expect(authService.canActivateChild).not.toHaveBeenCalled();
  });

  it('defers to auth guard for authenticated non-beta users', () => {
    const route = {} as any;
    const state = { url: '/earth' } as any;
    userService.isBetaEnabled.and.returnValue(false);
    authService.canActivateChild.and.returnValue(of(true));

    let activationResult: boolean | undefined;
    guardService.canActivate(route, state).subscribe((result) => {
      activationResult = result;
    });

    expect(authService.canActivateChild).toHaveBeenCalledWith(route, state);
    expect(activationResult).toBe(true);
  });
});
