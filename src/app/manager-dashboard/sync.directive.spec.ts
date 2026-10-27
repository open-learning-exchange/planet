import { EMPTY, of, throwError } from 'rxjs';

import { SyncDirective } from './sync.directive';

describe('SyncDirective loading', () => {
  let couchService: any;
  let syncService: any;
  let planetMessageService: any;
  let dialogsLoadingService: any;
  let directive: SyncDirective;

  beforeEach(() => {
    couchService = {
      findAll: vi.fn().mockReturnValue(of([])),
      get: vi.fn().mockReturnValue(of({})),
      post: vi.fn().mockReturnValue(of({})),
      bulkDocs: vi.fn().mockReturnValue(of({}))
    };
    syncService = {
      replicatorId: vi.fn(),
      deleteReplicators: vi.fn().mockReturnValue(of({})),
      replicatorsArrayWithTags: vi.fn().mockReturnValue(of([])),
      confirmPasswordAndRunReplicators: vi.fn().mockReturnValue(of([]))
    };
    planetMessageService = { showMessage: vi.fn() };
    dialogsLoadingService = { start: vi.fn(), stop: vi.fn() };
    directive = new SyncDirective(
      couchService,
      { userProperties: [ 'name' ] } as any,
      syncService,
      planetMessageService,
      { addAdminLog: vi.fn().mockReturnValue(of({})) } as any,
      { configuration: { code: 'local', parentCode: 'nation', parentDomain: 'nation.test' } } as any,
      { getDatabaseCount: vi.fn().mockReturnValue(of(0)) } as any,
      dialogsLoadingService
    );
  });

  it('ends the overlay and reports when updating replicator users fails', () => {
    couchService.post.mockReturnValue(throwError({ error: { reason: 'offline' } }));

    directive.runSyncClick();

    expect(dialogsLoadingService.stop).toHaveBeenCalledTimes(1);
    expect(planetMessageService.showMessage).toHaveBeenCalledWith('offline');
  });

  it('ends the overlay and reports when sync fails before the password prompt', () => {
    syncService.deleteReplicators.mockReturnValue(throwError({ error: { reason: 'offline' } }));

    directive.runSyncClick();

    expect(dialogsLoadingService.stop).toHaveBeenCalledTimes(1);
    expect(planetMessageService.showMessage).toHaveBeenCalledWith('offline');
  });

  it('ends the overlay and reports when a tags request fails without an error', () => {
    syncService.replicatorsArrayWithTags.mockReturnValue(EMPTY);

    directive.runSyncClick();

    expect(dialogsLoadingService.stop).toHaveBeenCalledTimes(1);
    expect(planetMessageService.showMessage).toHaveBeenCalledWith('Sync could not start, please try again');
    expect(syncService.confirmPasswordAndRunReplicators).not.toHaveBeenCalled();
  });

  it('ends the overlay once when the password is rejected', () => {
    syncService.confirmPasswordAndRunReplicators.mockReturnValue(throwError('rejected'));

    directive.runSyncClick();

    expect(dialogsLoadingService.stop).toHaveBeenCalledTimes(1);
  });
});
