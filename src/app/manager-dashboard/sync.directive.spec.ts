import { concat, of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { SyncDirective } from './sync.directive';

describe('SyncDirective parent users', () => {
  const buildDirective = (findAllStream: any = vi.fn()) => {
    const couchService = {
      findAllStream,
      findAll: vi.fn(),
      post: vi.fn()
    };
    const syncService = {
      replicatorId: vi.fn(),
      deleteReplicators: vi.fn(),
      confirmPasswordAndRunReplicators: vi.fn()
    };
    const planetMessageService = { showMessage: vi.fn() };
    const managerService = { addAdminLog: vi.fn() };
    const stateService = {
      configuration: { parentCode: 'nation', parentDomain: 'nation.org' }
    };
    const dialogsLoadingService = { start: vi.fn(), stop: vi.fn() };
    return {
      couchService,
      syncService,
      planetMessageService,
      managerService,
      dialogsLoadingService,
      directive: new SyncDirective(
        couchService as any,
        {} as any,
        syncService as any,
        planetMessageService as any,
        managerService as any,
        stateService as any,
        {} as any,
        dialogsLoadingService as any
      )
    };
  };

  it('collects every page before returning an authoritative snapshot', () => {
    const { directive } = buildDirective(vi.fn().mockReturnValue(of(
      [ { _id: 'user-1' } ],
      [ { _id: 'user-2' } ]
    )));
    let users;

    directive.getParentUsers().subscribe((res) => users = res);

    expect(users).toEqual([ { _id: 'user-1' }, { _id: 'user-2' } ]);
  });

  it('does not return a partial snapshot when a later page fails', () => {
    const failure = { status: 0, error: { reason: 'timeout' } };
    const { directive } = buildDirective(vi.fn().mockReturnValue(concat(
      of([ { _id: 'user-1' } ]),
      throwError(failure)
    )));
    let users;
    let error;

    directive.getParentUsers().subscribe({ next: (res) => users = res, error: (err) => error = err });

    expect(users).toBeUndefined();
    expect(error).toEqual(failure);
  });

  it('keeps existing replicators and stops loading when the parent snapshot fails', () => {
    const failure = { status: 0, error: { reason: 'timeout' } };
    const {
      couchService, syncService, dialogsLoadingService, planetMessageService, directive
    } = buildDirective(vi.fn().mockReturnValue(throwError(failure)));
    couchService.findAll.mockReturnValue(of([ { _id: 'resources_pull', _replication_state: 'completed' } ]));
    vi.spyOn(directive, 'replicatorList').mockReturnValue([]);
    vi.spyOn(directive, 'updateReplicatorUsers').mockReturnValue(of({}));
    vi.spyOn(directive, 'sendStatsToParent').mockReturnValue(of({}));

    directive.runSyncClick();

    expect(syncService.deleteReplicators).not.toHaveBeenCalled();
    expect(dialogsLoadingService.start).toHaveBeenCalledTimes(1);
    expect(dialogsLoadingService.stop).toHaveBeenCalledTimes(1);
    expect(planetMessageService.showMessage).toHaveBeenCalledWith('timeout');
  });

  it('stops loading when preparing local replicator users fails', () => {
    const { dialogsLoadingService, directive } = buildDirective();
    vi.spyOn(directive, 'updateReplicatorUsers').mockReturnValue(throwError(new Error('offline')));

    directive.runSyncClick();

    expect(dialogsLoadingService.stop).toHaveBeenCalledTimes(1);
  });

  it('stops loading only once when opening password confirmation', () => {
    const {
      couchService, syncService, managerService, dialogsLoadingService, directive
    } = buildDirective();
    couchService.findAll.mockReturnValue(of([]));
    syncService.deleteReplicators.mockReturnValue(of({}));
    syncService.confirmPasswordAndRunReplicators.mockReturnValue(of({}));
    managerService.addAdminLog.mockReturnValue(of({}));
    vi.spyOn(directive, 'replicatorList').mockReturnValue([]);
    vi.spyOn(directive, 'updateReplicatorUsers').mockReturnValue(of({}));
    vi.spyOn(directive, 'sendStatsToParent').mockReturnValue(of({}));
    const getParentUsers = vi.spyOn(directive, 'getParentUsers').mockReturnValue(of([]));
    vi.spyOn(directive, 'updateParentUsers').mockImplementation(() => {});
    vi.spyOn(directive, 'getAchievementsAndTeamAndNewsResources').mockReturnValue(of([ [], [], [] ]));
    vi.spyOn(directive, 'achievementResourceReplicator').mockReturnValue(of([]));
    vi.spyOn(directive, 'teamAndNewsResourcesReplicator').mockReturnValue(of([]));

    directive.runSyncClick();

    expect(getParentUsers.mock.invocationCallOrder[0])
      .toBeLessThan(syncService.deleteReplicators.mock.invocationCallOrder[0]);
    expect(dialogsLoadingService.stop).toHaveBeenCalledTimes(1);
  });
});
