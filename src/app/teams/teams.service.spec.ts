import { of } from 'rxjs';
import { vi } from 'vitest';
import { TeamsService } from './teams.service';

describe('TeamsService membership writes', () => {
  const successfulBulkResponse = { res: [ { id: 'membership-1', ok: true, rev: '2-membership' } ] };

  afterEach(() => vi.restoreAllMocks());

  const createService = (couchOverrides: any = {}) => {
    const couchService = {
      findAll: vi.fn().mockReturnValue(of([])),
      get: vi.fn().mockReturnValue(of({})),
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

  it('uses the freshly read membership revision instead of the enriched view revision', () => {
    const freshMembership = { ...membership, _rev: '2-fresh' };
    const { service, couchService } = createService({
      findAll: vi.fn().mockReturnValue(of([ freshMembership ]))
    });

    service.updateMembershipDoc(team, false, {
      ...membership,
      _rev: '1-stale',
      role: 'Coordinator'
    }).subscribe();

    expect(couchService.bulkDocs).toHaveBeenCalledWith('teams', [ {
      ...membership,
      _rev: '2-fresh',
      role: 'Coordinator'
    } ]);
  });

  it('preserves shelf identity when no persisted membership document is found', () => {
    const shelfMembership = {
      _id: 'org.couchdb.user:shelf-member',
      _rev: '1-shelf',
      fromShelf: true,
      myTeamIds: [ team._id ],
      teamId: team._id,
      userId: 'org.couchdb.user:shelf-member'
    };
    const { service, couchService } = createService({
      bulkDocs: vi.fn().mockReturnValue(of({
        res: [ { id: shelfMembership._id, error: 'conflict', reason: 'Document update conflict.' } ]
      }))
    });
    const error = vi.fn();

    service.updateMembershipDoc(team, false, shelfMembership).subscribe({ error });

    expect(couchService.bulkDocs).toHaveBeenCalledWith('teams', [ expect.objectContaining({
      _id: shelfMembership._id,
      _rev: shelfMembership._rev,
      userId: shelfMembership.userId
    }) ]);
    expect(error).toHaveBeenCalledWith(expect.objectContaining({ error: 'conflict' }));
  });

  it('preserves persisted leadership when the member update omits isLeader', () => {
    const { service, couchService } = createService({
      findAll: vi.fn().mockReturnValue(of([ membership ]))
    });

    service.updateMembershipDoc(team, false, {
      userId: membership.userId,
      userPlanetCode: membership.userPlanetCode,
      role: 'Coordinator'
    }).subscribe();

    expect(couchService.bulkDocs).toHaveBeenCalledWith('teams', [ {
      ...membership,
      role: 'Coordinator'
    } ]);
  });

  it('preserves stored planet identity when a stale shelf row matches a persisted membership', () => {
    const { service, couchService } = createService({
      findAll: vi.fn().mockReturnValue(of([ membership ]))
    });

    service.updateMembershipDoc(team, false, {
      _id: membership.userId,
      _rev: '1-shelf',
      fromShelf: true,
      teamId: team._id,
      userId: membership.userId,
      role: 'Coordinator'
    }).subscribe();

    expect(couchService.bulkDocs).toHaveBeenCalledWith('teams', [ {
      ...membership,
      role: 'Coordinator'
    } ]);
  });

  it('validates mixed add-member writes and reduces request deletions to tombstones', () => {
    const selected = [ { _id: 'org.couchdb.user:new', planetCode: 'planet-a' } ];
    const request = {
      ...membership,
      ...enrichedFields,
      _id: 'request-1',
      _rev: '1-request',
      userId: selected[0]._id,
      docType: 'request'
    };
    const bulkDocs = vi.fn().mockReturnValue(of({
      res: [
        { id: 'membership-new', rev: '1-new' },
        { id: request._id, rev: '2-request' }
      ]
    }));
    const { service } = createService({ bulkDocs });

    service.addMembers(team, selected, [ request ]).subscribe();

    expect(bulkDocs).toHaveBeenCalledWith('teams', [
      {
        teamId: team._id,
        userId: selected[0]._id,
        teamPlanetCode: team.teamPlanetCode,
        teamType: team.teamType,
        userPlanetCode: selected[0].planetCode,
        docType: 'membership'
      },
      { _id: request._id, _rev: request._rev, _deleted: true }
    ]);
  });

  it('reports an individual add-member bulk failure', () => {
    const bulkDocs = vi.fn().mockReturnValue(of({
      res: [ { id: 'membership-new', error: 'forbidden', reason: 'Membership rejected.' } ]
    }));
    const { service } = createService({ bulkDocs });
    const error = vi.fn();

    service.addMembers(team, [ { _id: 'org.couchdb.user:new', planetCode: 'planet-a' } ], []).subscribe({ error });

    expect(error).toHaveBeenCalledWith(expect.objectContaining({ error: 'forbidden' }));
  });

  it('accepts an add-member write when only request cleanup conflicts', () => {
    const selected = [ { _id: 'org.couchdb.user:new', planetCode: 'planet-a' } ];
    const request = { _id: 'request-1', _rev: '1-request', userId: selected[0]._id };
    const bulkDocs = vi.fn().mockReturnValue(of({
      res: [
        { id: 'membership-new', rev: '1-new' },
        { id: request._id, error: 'conflict', reason: 'Document update conflict.' }
      ]
    }));
    const { service } = createService({ bulkDocs });
    const next = vi.fn();
    const error = vi.fn();

    service.addMembers(team, selected, [ request ]).subscribe({ next, error });

    expect(next).toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it('rejects a second required membership failure before best-effort request cleanup', () => {
    const selected = [
      { _id: 'org.couchdb.user:first', planetCode: 'planet-a' },
      { _id: 'org.couchdb.user:second', planetCode: 'planet-a' }
    ];
    const request = { _id: 'request-1', _rev: '1-request', userId: selected[0]._id };
    const bulkDocs = vi.fn().mockImplementation((_dbName: string, docs: any[]) => of({
      res: docs.map((doc, index) => {
        if (doc._deleted) {
          return { id: doc._id, rev: '2-request' };
        }
        return doc.userId === selected[1]._id
          ? { id: `membership-${index}`, error: 'forbidden', reason: 'Membership rejected.' }
          : { id: `membership-${index}`, rev: '1-membership' };
      })
    }));
    const { service } = createService({ bulkDocs });
    const error = vi.fn();

    service.addMembers(team, selected, [ request ]).subscribe({ error });

    expect(error).toHaveBeenCalledWith(expect.objectContaining({ error: 'forbidden' }));
  });

  it('rejects an add-member write without a user ID', () => {
    const { service, couchService } = createService();
    const error = vi.fn();

    service.addMembers(team, [ { planetCode: 'planet-a' } ], []).subscribe({ error });

    expect(error).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Membership user ID is required.'
    }));
    expect(couchService.bulkDocs).not.toHaveBeenCalled();
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

  it('uses freshly read revisions for both leadership writes', () => {
    const oldLeader = {
      ...membership,
      _id: 'membership-old',
      _rev: '1-old',
      userId: 'org.couchdb.user:old'
    };
    const newLeader = {
      ...membership,
      _id: 'membership-new',
      _rev: '1-new',
      userId: 'org.couchdb.user:new',
      isLeader: false
    };
    const get = vi.fn()
      .mockReturnValueOnce(of({ ...newLeader, _rev: '2-new' }))
      .mockReturnValueOnce(of({ ...oldLeader, _rev: '2-old' }));
    const { service, couchService } = createService({ get });

    service.changeTeamLeadership(oldLeader, newLeader).subscribe();

    expect(get).toHaveBeenNthCalledWith(1, 'teams/membership-new');
    expect(get).toHaveBeenNthCalledWith(2, 'teams/membership-old');
    expect(couchService.bulkDocs).toHaveBeenNthCalledWith(1, 'teams', [ {
      ...newLeader,
      _rev: '2-new',
      isLeader: true
    } ]);
    expect(couchService.bulkDocs).toHaveBeenNthCalledWith(2, 'teams', [ {
      ...oldLeader,
      _rev: '2-old',
      isLeader: false
    } ]);
  });

  it('does not demote when the old and new leader are the same document', () => {
    const get = vi.fn().mockReturnValue(of({ ...membership, _rev: '2-fresh' }));
    const { service, couchService } = createService({ get });

    service.changeTeamLeadership(membership, membership).subscribe();

    expect(get).toHaveBeenCalledTimes(1);
    expect(couchService.bulkDocs).toHaveBeenCalledTimes(1);
    expect(couchService.bulkDocs).toHaveBeenCalledWith('teams', [ {
      ...membership,
      _rev: '2-fresh',
      isLeader: true
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

  [
    { description: 'empty', response: { res: [] } },
    { description: 'invalid', response: { res: [ {} ] } }
  ].forEach(({ description, response }) => {
    it(`does not demote the old leader after an ${description} promotion response`, () => {
      const bulkDocs = vi.fn().mockReturnValue(of(response));
      const { service } = createService({ bulkDocs });
      const error = vi.fn();

      service.changeTeamLeadership(
        { ...membership, _id: 'membership-old', userId: 'org.couchdb.user:old' },
        { ...membership, _id: 'membership-new', userId: 'org.couchdb.user:new' }
      ).subscribe({ error });

      expect(error).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Unexpected bulk document response.'
      }));
      expect(bulkDocs).toHaveBeenCalledTimes(1);
    });
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

  it('rejects a membership update without a user ID before querying or writing', () => {
    const { service, couchService } = createService();
    const error = vi.fn();

    service.updateMembershipDoc(team, true, {}).subscribe({ error });

    expect(error).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Membership user ID is required.'
    }));
    expect(couchService.findAll).not.toHaveBeenCalled();
    expect(couchService.bulkDocs).not.toHaveBeenCalled();
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

  it('rejects a partial bulk response', () => {
    const secondMembership = {
      ...membership,
      _id: 'membership-2',
      _rev: '1-membership-2'
    };
    const { service } = createService({
      findAll: vi.fn().mockReturnValue(of([ membership, secondMembership ])),
      bulkDocs: vi.fn().mockReturnValue(of(successfulBulkResponse))
    });
    const error = vi.fn();

    service.updateMembershipDoc(team, false, membership).subscribe({ error });

    expect(error).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Unexpected bulk document response.'
    }));
  });

  it('accepts a successful result with an id and revision when ok is omitted', () => {
    const { service } = createService({
      bulkDocs: vi.fn().mockReturnValue(of({
        res: [ { id: 'membership-1', rev: '2-membership' } ]
      }))
    });
    const next = vi.fn();
    const error = vi.fn();

    service.updateMembershipDoc(team, false, membership).subscribe({ next, error });

    expect(next).toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });
});
