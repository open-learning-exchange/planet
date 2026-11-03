import { of } from 'rxjs';
import { vi } from 'vitest';
import { LoginTasksService } from './login-tasks.service';

describe('LoginTasksService', () => {
  it('continues post-login tasks when no local databases are registered', async () => {
    const userService = {
      get: vi.fn().mockReturnValue({ roles: [] }),
      newSessionLog: vi.fn().mockReturnValue(of({}))
    };
    const submissionsService = { getSubmissions: vi.fn().mockReturnValue(of([])) };
    const healthService = {
      userDatabaseName: vi.fn().mockReturnValue('userdb-test'),
      userHealthSecurity: vi.fn().mockReturnValue(of('secured'))
    };
    const service = new LoginTasksService(
      {} as any,
      userService as any,
      { replicateFromRemoteDBs: vi.fn().mockReturnValue([]) } as any,
      {} as any,
      { configuration: { planetType: 'community' } } as any,
      healthService as any,
      submissionsService as any,
      {} as any,
      {} as any
    );

    await expect(service.postLoginTasks$('tester', 'password', false, 'user-id', { adminName: 'admin@planet' }).toPromise())
      .resolves.toBe('secured');
    expect(userService.newSessionLog).toHaveBeenCalledOnce();
    expect(submissionsService.getSubmissions).toHaveBeenCalledOnce();
    expect(healthService.userHealthSecurity).toHaveBeenCalledWith('userdb-test');
  });
});
