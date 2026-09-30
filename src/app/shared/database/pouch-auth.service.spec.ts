import { vi } from 'vitest';
import { PouchAuthService } from './pouch-auth.service';

describe('PouchAuthService', () => {
  it('completes logout when no local databases are registered', async () => {
    const authDB = { logOut: vi.fn().mockResolvedValue({ ok: true }) };
    const pouchService = {
      getAuthDB: vi.fn().mockReturnValue(authDB),
      deconfigureDBs: vi.fn().mockReturnValue([])
    };
    const userStatusService = { resetStatus: vi.fn() };
    const service = new PouchAuthService(pouchService as any, {} as any, userStatusService as any);

    await expect(service.logout().toPromise()).resolves.toEqual([]);
    expect(authDB.logOut).toHaveBeenCalledOnce();
    expect(pouchService.deconfigureDBs).toHaveBeenCalledOnce();
    expect(userStatusService.resetStatus).toHaveBeenCalledOnce();
  });
});
