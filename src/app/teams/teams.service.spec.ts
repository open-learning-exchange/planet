import { of } from 'rxjs';
import { vi } from 'vitest';
import { TeamsService } from './teams.service';

describe('TeamsService membership writes', () => {
  const successfulBulkResponse = { res: [ { id: 'membership-1', ok: true, rev: '2-membership' } ] };

  const createService = (couchOverrides: any = {}) => {
    const couchService = {
      findAll: vi.fn().mockReturnValue(of([])),
      bulkDocs: vi.fn().mockReturnValue(of(successfulBulkResponse)),
      ...couchOverrides
    };
    const service = new TeamsService(
      couchService as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any
    );
    return { service, couchService };
  };

  const team = {
    _id: 'team-1',
    teamPlanetCode: 'planet-a',
    teamType: 'local'
  };

  const membership = {
    _id: 'membership-1',
    _rev: '1-membership',
    createdDate: 123,
    updatedDate: 456,
    teamId: team._id,
    teamPlanetCode: team.teamPlanetCode,
    teamType: team.teamType,
    userId: 'org.couchdb.user:alex',
    userPlanetCode: 'planet-a',
    docType: 'membership',
    isLeader: true,
    role: 'Mentor'
  };

  const enrichedFields = {
    name: 'Alex',
    avatar: '/avatar',
    status: 'active',
    userDoc: { doc: { derived_key: 'secret', salt: 'secret-salt' } },
    attachmentDoc: { _attachments: { img: {} } },
    tasks: [ { _id: 'task-1' } ]
  };

  it('keeps exactly the persisted membership schema', () => {
    const { service } = createService();

    expect((service as any).membershipWriteDoc({
      ...membership,
      ...enrichedFields
    }, { _deleted: true })).toEqual({
      ...membership,
      _deleted: true
    });
  });

  it('updates a role without exposing enrichment or erasing leadership', () => {
    const { service, couchService } = createService({
      findAll: vi.fn().mockReturnValue(of([ membership ]))
    });

    service.updateMembershipDoc(team, false, {
      ...membership,
      ...enrichedFields,
      role: 'Coordinator'
    }).subscribe();

    expect(couchService.bulkDocs).toHaveBeenCalledWith('teams', [ {
      ...membership,
      role: 'Coordinator'
    } ]);
  });

  it('sanitizes leadership writes and promotes before demoting', () => {
    const promotionResponse = { res: [ { id: 'membership-new', ok: true, rev: '2-new' } ] };
    const demotionResponse = { res: [ { id: 'membership-old', ok: true, rev: '2-old' } ] };
    const bulkDocs = vi.fn()
      .mockReturnValueOnce(of(promotionResponse))
      .mockReturnValueOnce(of(demotionResponse));
    const { service } = createService({ bulkDocs });
    const oldLeader = {
      ...membership,
      ...enrichedFields,
      _id: 'membership-old',
      _rev: '1-old',
      userId: 'org.couchdb.user:old'
    };
    const newLeader = {
      ...membership,
      ...enrichedFields,
      _id: 'membership-new',
      _rev: '1-new',
      userId: 'org.couchdb.user:new',
      role: 'Coordinator',
      isLeader: false
    };

    service.changeTeamLeadership(oldLeader, newLeader).subscribe();

    expect(bulkDocs).toHaveBeenNthCalledWith(1, 'teams', [ {
      ...membership,
      _id: 'membership-new',
      _rev: '1-new',
      userId: 'org.couchdb.user:new',
      role: 'Coordinator',
      isLeader: true
    } ]);
    expect(bulkDocs).toHaveBeenNthCalledWith(2, 'teams', [ {
      ...membership,
      _id: 'membership-old',
      _rev: '1-old',
      userId: 'org.couchdb.user:old',
      isLeader: false
    } ]);
  });

  it('does not demote the old leader when promotion fails', () => {
    const bulkDocs = vi.fn().mockReturnValue(of({
      res: [ { error: 'conflict', reason: 'Document update conflict.' } ]
    }));
    const { service } = createService({ bulkDocs });
    const error = vi.fn();

    service.changeTeamLeadership(
      { ...membership, _id: 'membership-old', userId: 'org.couchdb.user:old' },
      { ...membership, _id: 'membership-new', userId: 'org.couchdb.user:new' }
    ).subscribe({ error });

    expect(error).toHaveBeenCalledWith(expect.objectContaining({ error: 'conflict' }));
    expect(bulkDocs).toHaveBeenCalledTimes(1);
  });

  it('skips a synthesized old leader without a persisted membership ID', () => {
    const { service, couchService } = createService();

    service.changeTeamLeadership(undefined, {
      ...membership,
      _id: 'membership-new',
      userId: 'org.couchdb.user:new'
    }).subscribe();

    expect(couchService.bulkDocs).toHaveBeenCalledTimes(1);
  });

  it('fails a shelf promotion before demoting until origin-aware migration is available', () => {
    const shelf = {
      _id: 'org.couchdb.user:new',
      _rev: '1-shelf',
      myTeamIds: [ team._id ]
    };
    const bulkDocs = vi.fn().mockReturnValue(of({
      res: [ { error: 'conflict', reason: 'Document update conflict.' } ]
    }));
    const { service } = createService({
      bulkDocs
    });
    const error = vi.fn();

    service.changeTeamLeadership(membership, {
      ...shelf,
      fromShelf: true,
      teamId: team._id,
      userId: shelf._id
    }).subscribe({ error });

    expect(error).toHaveBeenCalledWith(expect.objectContaining({ error: 'conflict' }));
    expect(bulkDocs).toHaveBeenCalledTimes(1);
    expect(bulkDocs.mock.calls[0][1][0]).toEqual(expect.objectContaining({
      _id: shelf._id,
      _rev: shelf._rev,
      isLeader: true
    }));
  });

  it('sanitizes membership deletion writes', () => {
    const { service, couchService } = createService({
      findAll: vi.fn().mockReturnValue(of([ membership ]))
    });

    service.updateMembershipDoc(team, true, {
      userId: membership.userId,
      userPlanetCode: membership.userPlanetCode
    }).subscribe();

    expect(couchService.bulkDocs).toHaveBeenCalledWith('teams', [ {
      ...membership,
      _deleted: true
    } ]);
  });

  it('rejects an unexpected wrapped bulk response', () => {
    const { service } = createService({
      bulkDocs: vi.fn().mockReturnValue(of({ ok: true }))
    });
    const error = vi.fn();

    service.updateMembershipDoc(team, false, membership).subscribe({ error });

    expect(error).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Unexpected bulk document response.'
    }));
  });
});
