import { of } from 'rxjs';
import { vi } from 'vitest';
import { TeamsService } from './teams.service';

describe('TeamsService membership writes', () => {
  const successfulBulkResponse = { res: [ { id: 'membership-1', ok: true, rev: '2-membership' } ] };

  afterEach(() => vi.restoreAllMocks());

  const createService = (
    couchOverrides: any = {}, usersServiceOverrides: any = {}, userServiceOverrides: any = {}
  ) => {
    const couchService = {
      findAll: vi.fn().mockReturnValue(of([])),
      get: vi.fn().mockReturnValue(of({})),
      bulkDocs: vi.fn().mockReturnValue(of(successfulBulkResponse)),
      updateDocument: vi.fn().mockReturnValue(of({ ok: true })),
      ...couchOverrides
    };
    const usersService = {
      requestUserData: vi.fn(),
      usersListener: vi.fn().mockReturnValue(of(usersServiceOverrides.users || []))
    };
    const userService = {
      get: vi.fn().mockReturnValue({
        _id: 'org.couchdb.user:current', name: 'current', planetCode: 'planet-a'
      }),
      addImageForReplication: vi.fn().mockReturnValue(of({})),
      ...userServiceOverrides
    };
    const service = new TeamsService(
      couchService as any,
      {} as any,
      userService as any,
      usersService as any,
      { configuration: { code: 'planet-a' } } as any,
      {} as any
    );
    return { service, couchService, userService, usersService };
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
    const codeLessDuplicate = { ...membership, _id: 'membership-code-less', userPlanetCode: '' };
    const { service, couchService } = createService({
      findAll: vi.fn().mockReturnValue(of([ codeLessDuplicate, freshMembership ]))
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

  it('resolves a membership with no planet code from the team origin without persisting the inference', () => {
    const codeless = { ...membership, userPlanetCode: undefined };
    const sameNamedElsewhere = { _id: membership.userId, doc: { planetCode: team.teamPlanetCode } };
    const { service } = createService({
      findAll: vi.fn().mockImplementation((db: string) => of(db === 'teams' ? [ codeless ] : []))
    }, { users: [ sameNamedElsewhere ] });
    let members: any[];

    service.getTeamMembers(team).subscribe(result => members = result);

    expect(members[0].userPlanetCode).toBeUndefined();
    expect(members[0].userDoc).toBe(sameNamedElsewhere);
  });

  it('resolves a synchronized member avatar through the canonical replicated attachment key', () => {
    const childUser = {
      _id: 'alex@community',
      doc: { _id: 'alex@community', couchId: membership.userId, name: 'alex', planetCode: 'community' }
    };
    const attachmentDoc = { _id: `${membership.userId}@community`, _attachments: { img: {} } };
    const { service } = createService({
      findAll: vi.fn().mockImplementation((db: string) => of(
        db === 'teams' ? [ { ...membership, userPlanetCode: 'community' } ] : db === 'attachments' ? [ attachmentDoc ] : []
      ))
    }, { users: [ childUser ] });
    let members: any[];

    service.getTeamMembers(team).subscribe(result => members = result);

    expect(members[0].userDoc).toBe(childUser);
    expect(members[0].attachmentDoc).toBe(attachmentDoc);
  });

  it('resolves a historical materialized membership to its associated user document', () => {
    const historical = {
      ...membership,
      userId: 'org.couchdb.user:alex@community',
      userPlanetCode: 'planet-a'
    };
    const userDoc = {
      _id: 'org.couchdb.user:alex@community',
      doc: {
        _id: 'org.couchdb.user:alex@community',
        name: 'alex@community',
        planetCode: 'community',
        requestId: 'request-1'
      }
    };
    const attachmentDoc = {
      _id: 'org.couchdb.user:alex@community@community',
      _attachments: { img: { digest: 'md5-image' } }
    };
    const { service } = createService({
      findAll: vi.fn().mockImplementation((db: string) => of(
        db === 'teams' ? [ historical ] : db === 'attachments' ? [ attachmentDoc ] : []
      ))
    }, { users: [ userDoc ] });
    let members: any[];

    service.getTeamMembers(team).subscribe(result => members = result);

    expect(members[0].userDoc).toBe(userDoc);
    expect(members[0].attachmentDoc).toBe(attachmentDoc);
  });

  it('rejects a join request by composite identity without widening to this server', () => {
    const request = {
      _id: 'request-1', _rev: '1-request', docType: 'request',
      userId: 'org.couchdb.user:ann', userPlanetCode: 'community'
    };
    const codelessLocalRequest = { _id: 'request-local', _rev: '1-local', docType: 'request', userId: request.userId };
    const { service, couchService } = createService({
      findAll: vi.fn().mockReturnValue(of([ request, codelessLocalRequest ]))
    });

    service.removeFromRequests(team, { userId: 'org.couchdb.user:ann', userPlanetCode: 'community' }).subscribe();

    expect(couchService.findAll.mock.calls[0][1].selector).toEqual(expect.objectContaining({
      teamId: team._id,
      docType: 'request',
      userId: { $in: [ 'org.couchdb.user:ann' ] },
      $or: [
        { userPlanetCode: 'community' },
        { userPlanetCode: '' },
        { userPlanetCode: { $exists: false } }
      ]
    }));
    expect(couchService.bulkDocs).toHaveBeenCalledWith('teams', [ { ...request, _deleted: true } ]);
  });

  it('rejects a request stored without a planet code through the team origin', () => {
    const codelessRequest = {
      _id: 'request-codeless', _rev: '1-request', docType: 'request', userId: 'org.couchdb.user:ann'
    };
    const { service, couchService } = createService({
      findAll: vi.fn().mockReturnValue(of([ codelessRequest ]))
    });

    service.removeFromRequests({ ...team, teamPlanetCode: 'community' }, { userId: 'org.couchdb.user:ann' }).subscribe();

    expect(couchService.bulkDocs).toHaveBeenCalledWith('teams', [ { ...codelessRequest, _deleted: true } ]);
  });

  it('rejects request cleanup without a user id before issuing a broad query', () => {
    const { service, couchService } = createService();
    const error = vi.fn();

    service.removeFromRequests(team, { userPlanetCode: 'planet-a' }).subscribe({ error });

    expect(error).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Request user ID is required.'
    }));
    expect(couchService.findAll).not.toHaveBeenCalled();
    expect(couchService.bulkDocs).not.toHaveBeenCalled();
  });

  it('writes and cancels an associated join request under its explicit origin', () => {
    const associated = {
      _id: 'org.couchdb.user:ann@community',
      name: 'ann@community',
      planetCode: 'community',
      requestId: 'request-1'
    };
    const request = {
      _id: 'request-doc', _rev: '1-request', userId: associated._id, userPlanetCode: 'community'
    };
    const updateDocument = vi.fn().mockReturnValue(of({ id: request._id, rev: request._rev }));
    const { service, couchService } = createService({
      updateDocument,
      findAll: vi.fn().mockReturnValue(of([ request ]))
    }, {}, { get: vi.fn().mockReturnValue(associated) });

    service.requestToJoinTeam(team, associated).subscribe();
    service.cancelJoinRequest(team).subscribe();

    expect(updateDocument).toHaveBeenCalledWith('teams', expect.objectContaining({
      userId: 'org.couchdb.user:ann',
      userPlanetCode: 'community',
      docType: 'request'
    }));
    expect(couchService.findAll).toHaveBeenCalledWith('teams', expect.objectContaining({
      selector: expect.objectContaining({
        userId: { $in: [ 'org.couchdb.user:ann', 'org.couchdb.user:ann@community' ] },
        $or: [
          { userPlanetCode: 'community' },
          { userPlanetCode: 'planet-a' },
          { userPlanetCode: '' },
          { userPlanetCode: { $exists: false } }
        ]
      })
    }));
    expect(couchService.bulkDocs).toHaveBeenCalledWith('teams', [ { ...request, _deleted: true } ]);
  });

  it('reports a missing request instead of claiming cancellation succeeded', () => {
    const { service, couchService } = createService({}, {}, {
      get: vi.fn().mockReturnValue({ _id: 'org.couchdb.user:ann', planetCode: 'planet-a' })
    });
    const error = vi.fn();

    service.cancelJoinRequest(team).subscribe({ error });

    expect(error).toHaveBeenCalledWith(expect.objectContaining({ message: 'Join request not found.' }));
    expect(couchService.bulkDocs).not.toHaveBeenCalled();
  });

  it('rejects a stale membership update when the persisted document has been removed', () => {
    const supplied = {
      _id: 'membership-supplied',
      _rev: '1-supplied',
      teamId: team._id,
      userId: 'org.couchdb.user:supplied',
      docType: 'membership'
    };
    const { service, couchService } = createService();
    const error = vi.fn();

    service.updateMembershipDoc(team, false, supplied).subscribe({ error });

    expect(error).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Membership document not found.'
    }));
    expect(couchService.bulkDocs).not.toHaveBeenCalled();
  });

  it('preserves persisted leadership when the member update omits isLeader', () => {
    const { service, couchService } = createService({
      findAll: vi.fn().mockReturnValue(of([ membership ]))
    });

    service.updateMembershipDoc(team, false, {
      _id: membership._id,
      _rev: membership._rev,
      docType: membership.docType,
      userId: membership.userId,
      userPlanetCode: membership.userPlanetCode,
      role: 'Coordinator'
    }).subscribe();

    expect(couchService.bulkDocs).toHaveBeenCalledWith('teams', [ {
      ...membership,
      role: 'Coordinator'
    } ]);
  });

  it('preserves stored planet identity when the update omits a planet code', () => {
    const { service, couchService } = createService({
      findAll: vi.fn().mockReturnValue(of([ membership ]))
    });

    service.updateMembershipDoc(team, false, {
      _id: membership._id,
      _rev: '1-stale',
      teamId: team._id,
      userId: membership.userId,
      role: 'Coordinator'
    }).subscribe();

    expect(couchService.bulkDocs).toHaveBeenCalledWith('teams', [ {
      ...membership,
      role: 'Coordinator'
    } ]);
  });

  it('does not persist a planet code derived only for display and comparison', () => {
    const codelessMembership = { ...membership };
    delete codelessMembership.userPlanetCode;
    const { service, couchService } = createService({
      findAll: vi.fn().mockReturnValue(of([ codelessMembership ]))
    });

    service.updateMembershipDoc(team, false, {
      ...codelessMembership,
      role: 'Coordinator'
    }).subscribe();

    expect(couchService.findAll.mock.calls[0][1].selector).toEqual({
      teamId: team._id,
      docType: 'membership',
      userId: { $in: [ membership.userId ] },
      $or: [
        { userPlanetCode: team.teamPlanetCode },
        { userPlanetCode: '' },
        { userPlanetCode: { $exists: false } }
      ]
    });
    expect(couchService.bulkDocs).toHaveBeenCalledWith('teams', [ {
      ...codelessMembership,
      role: 'Coordinator'
    } ]);
  });

  it('does not rewrite an existing code-less membership during an idempotent join', () => {
    const codeLessMembership = { ...membership, userPlanetCode: undefined };
    const { service, couchService } = createService({
      findAll: vi.fn().mockReturnValue(of([ codeLessMembership ]))
    });

    service.updateMembershipDoc(team, false, {
      userId: membership.userId,
      userPlanetCode: team.teamPlanetCode
    }).subscribe();

    expect(couchService.bulkDocs).not.toHaveBeenCalled();
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

  it('falls back to this server, not the team origin, for a selected user without a planet code', () => {
    const { service, couchService } = createService();

    service.addMembers({ ...team, teamPlanetCode: 'community' }, [ { _id: 'org.couchdb.user:local' } ], []).subscribe();

    expect(couchService.bulkDocs).toHaveBeenCalledWith('teams', [
      expect.objectContaining({ userId: 'org.couchdb.user:local', userPlanetCode: 'planet-a' })
    ]);
  });

  it('writes an associated member under their canonical id and explicit origin', () => {
    const selected = [ {
      _id: 'org.couchdb.user:new@community',
      name: 'new@community',
      planetCode: 'community',
      requestId: 'request-1'
    } ];
    const historicalRequest = {
      _id: 'request-1',
      _rev: '1-request',
      userId: selected[0]._id,
      userPlanetCode: selected[0].planetCode,
      docType: 'request'
    };
    const bulkDocs = vi.fn().mockReturnValue(of({ res: [
      { id: 'membership-new', rev: '1-membership' },
      { id: historicalRequest._id, rev: '2-request' }
    ] }));
    const { service } = createService({ bulkDocs });

    service.addMembers(team, selected, [ historicalRequest ]).subscribe();

    expect(bulkDocs).toHaveBeenCalledWith('teams', [ {
      teamId: team._id,
      userId: 'org.couchdb.user:new',
      teamPlanetCode: team.teamPlanetCode,
      teamType: team.teamType,
      userPlanetCode: 'community',
      docType: 'membership'
    }, { _id: historicalRequest._id, _rev: historicalRequest._rev, _deleted: true } ]);
  });

  it('creates an associated account team with a matching creator membership identity', () => {
    const associated = {
      _id: 'org.couchdb.user:ann@community',
      name: 'ann@community',
      planetCode: 'community',
      requestId: 'request-1'
    };
    const updateDocument = vi.fn().mockReturnValue(of({ id: team._id, rev: '1-team' }));
    const bulkDocs = vi.fn().mockReturnValue(of(successfulBulkResponse));
    const service = new TeamsService(
      {
        datePlaceholder: 'now',
        updateDocument,
        findAll: vi.fn().mockReturnValue(of([])),
        bulkDocs
      } as any,
      { confirm: vi.fn().mockReturnValue(of({ name: 'New team' })) } as any,
      {} as any,
      {} as any,
      { configuration: { code: 'planet-a', parentCode: 'earth', planetType: 'community' } } as any,
      {} as any
    );

    service.addTeamDialog(associated, 'team').subscribe();

    expect(updateDocument).toHaveBeenCalledWith('teams', expect.objectContaining({
      createdBy: 'org.couchdb.user:ann',
      createdByPlanetCode: 'community',
      teamPlanetCode: 'planet-a'
    }));
    expect(bulkDocs).toHaveBeenCalledWith('teams', [ expect.objectContaining({
      userId: 'org.couchdb.user:ann',
      userPlanetCode: 'community',
      isLeader: true,
      docType: 'membership'
    }) ]);
  });

  it('creates a membership separately from the request document when accepting a request', () => {
    const request = {
      _id: 'request-1', _rev: '1-request', teamId: team._id, docType: 'request',
      userId: 'org.couchdb.user:ann', userPlanetCode: 'planet-a'
    };
    const { service, couchService } = createService();

    service.updateMembershipDoc(team, false, request).subscribe();

    expect(couchService.findAll.mock.calls[0][1].selector).toEqual(expect.objectContaining({
      teamId: team._id, docType: 'membership', userId: { $in: [ request.userId ] }
    }));
    const [ written ] = couchService.bulkDocs.mock.calls[0][1];
    expect(written._id).toBeUndefined();
    expect(written).toEqual(expect.objectContaining({
      userId: request.userId, userPlanetCode: request.userPlanetCode, docType: 'membership'
    }));
  });

  it('does not notify an associated actor about their own team action under any of their identities', () => {
    const associated = {
      _id: 'org.couchdb.user:ann@community',
      name: 'ann@community',
      planetCode: 'community',
      requestId: 'request-1'
    };
    const legacyOwnRow = { userId: associated._id, userPlanetCode: 'planet-a' };
    const sameNamedNative = { userId: 'org.couchdb.user:ann', userPlanetCode: 'planet-a' };
    const updateDocument = vi.fn().mockReturnValue(of({}));
    const { service } = createService({ updateDocument }, {}, {
      get: vi.fn().mockReturnValue(associated)
    });

    service.sendNotifications('message', [ associated, legacyOwnRow, sameNamedNative ], {
      team: { ...team, teamPlanetCode: 'planet-a' },
      url: '/teams/view/team-1'
    }).subscribe();

    expect(updateDocument.mock.calls[0][1].docs.map(doc => [ doc.user, doc.userPlanetCode ])).toEqual([
      [ 'org.couchdb.user:ann', 'planet-a' ]
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

    service.changeTeamLeadership([ oldLeader ], newLeader).subscribe();

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

    service.changeTeamLeadership([ oldLeader ], newLeader).subscribe();

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

  it('demotes every other persisted leader, including a malformed one, in one write', () => {
    const malformedLeader = { ...membership, _id: 'membership-old', userId: '', isLeader: true };
    const secondLeader = { ...membership, _id: 'membership-second', userId: 'org.couchdb.user:second', isLeader: true };
    const newLeader = { ...membership, _id: 'membership-new', userId: 'org.couchdb.user:new', isLeader: false };
    const get = vi.fn().mockImplementation((path: string) => of({ _id: path.split('/')[1], _rev: '2-fresh' }));
    const bulkDocs = vi.fn()
      .mockReturnValueOnce(of({ res: [ { id: newLeader._id, rev: '3-new' } ] }))
      .mockReturnValueOnce(of({ res: [ { id: malformedLeader._id, rev: '3-old' }, { id: secondLeader._id, rev: '3-second' } ] }));
    const { service } = createService({ get, bulkDocs });

    service.changeTeamLeadership([ malformedLeader, secondLeader, newLeader ], newLeader).subscribe();

    expect(bulkDocs).toHaveBeenCalledTimes(2);
    expect(bulkDocs).toHaveBeenNthCalledWith(2, 'teams', [
      expect.objectContaining({ _id: malformedLeader._id, userId: '', isLeader: false }),
      expect.objectContaining({ _id: secondLeader._id, isLeader: false })
    ]);
  });

  it('does not demote when the old and new leader are the same document', () => {
    const get = vi.fn().mockReturnValue(of({ ...membership, _rev: '2-fresh' }));
    const { service, couchService } = createService({ get });

    service.changeTeamLeadership([ membership ], membership).subscribe();

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
      [ { ...membership, _id: 'membership-old', userId: 'org.couchdb.user:old' } ],
      { ...membership, _id: 'membership-new', userId: 'org.couchdb.user:new' }
    ).subscribe({ error });

    expect(error).toHaveBeenCalledWith(expect.objectContaining({ error: 'conflict' }));
    expect(bulkDocs).toHaveBeenCalledTimes(1);
    expect(bulkDocs.mock.calls[0][1][0]).toEqual(expect.objectContaining({
      _id: 'membership-new',
      isLeader: true
    }));
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
        [ { ...membership, _id: 'membership-old', userId: 'org.couchdb.user:old' } ],
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

    service.changeTeamLeadership([ { userId: 'org.couchdb.user:creator' } ], {
      ...membership,
      _id: 'membership-new',
      userId: 'org.couchdb.user:new'
    }).subscribe();

    expect(couchService.bulkDocs).toHaveBeenCalledTimes(1);
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

  it('removes a member\'s historical materialized row without touching a same-named native member', () => {
    const associated = {
      _id: 'org.couchdb.user:ann@community', name: 'ann@community', planetCode: 'community', requestId: 'request-1'
    };
    const replica = { _id: 'ann@community', couchId: 'org.couchdb.user:ann', name: 'ann', planetCode: 'community' };
    const canonical = { ...membership, _id: 'membership-canonical', userId: 'org.couchdb.user:ann', userPlanetCode: 'community' };
    const historical = { ...membership, _id: 'membership-historical', userId: associated._id, userPlanetCode: 'planet-a' };
    const sameNamedNative = { ...membership, _id: 'membership-native', userId: 'org.couchdb.user:ann', userPlanetCode: 'planet-a' };
    // The member leaving while signed in, and an admin removing a member whose user document is a child replica.
    [
      { memberInfo: canonical, userServiceOverrides: { get: vi.fn().mockReturnValue(associated) } },
      { memberInfo: { ...canonical, userDoc: { _id: replica._id, doc: replica } }, userServiceOverrides: {} }
    ].forEach(({ memberInfo, userServiceOverrides }) => {
      const { service, couchService } = createService({
        findAll: vi.fn().mockReturnValue(of([ canonical, historical, sameNamedNative ])),
        bulkDocs: vi.fn().mockReturnValue(of({ res: [ { id: canonical._id, rev: '2-a' }, { id: historical._id, rev: '2-b' } ] }))
      }, {}, userServiceOverrides);

      service.updateMembershipDoc(team, true, memberInfo).subscribe();

      expect(couchService.bulkDocs.mock.calls[0][1].map(doc => doc._id)).toEqual([ canonical._id, historical._id ]);
    });
  });

  it('fails a leave without writing or archiving when no membership matches', () => {
    const { service, couchService } = createService();
    const error = vi.fn();

    service.toggleTeamMembership(team, true, {
      userId: membership.userId,
      userPlanetCode: membership.userPlanetCode
    }).subscribe({ error });

    expect(error).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Membership document not found.'
    }));
    expect(couchService.bulkDocs).not.toHaveBeenCalled();
    expect(couchService.updateDocument).not.toHaveBeenCalled();
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
      findAll: vi.fn().mockReturnValue(of([ membership ])),
      bulkDocs: vi.fn().mockReturnValue(of({ ok: true }))
    });
    const error = vi.fn();

    service.updateMembershipDoc(team, true, {
      userId: membership.userId,
      userPlanetCode: membership.userPlanetCode
    }).subscribe({ error });

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

    service.updateMembershipDoc(team, true, {
      userId: membership.userId,
      userPlanetCode: membership.userPlanetCode
    }).subscribe({ error });

    expect(error).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Unexpected bulk document response.'
    }));
  });

  it('accepts a successful result with an id and revision when ok is omitted', () => {
    const { service } = createService({
      findAll: vi.fn().mockReturnValue(of([ membership ])),
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

  it('finds a profile\'s memberships by its own origin and an associated account\'s historical ID', () => {
    const native = {
      _id: 'membership-native', docType: 'membership', teamId: 'team-native',
      teamPlanetCode: 'planet-a', userId: 'org.couchdb.user:ann', userPlanetCode: 'planet-a'
    };
    const canonical = { ...native, _id: 'membership-canonical', teamId: 'team-canonical', userPlanetCode: 'community' };
    const historical = { ...native, _id: 'membership-historical', teamId: 'team-historical', userId: 'org.couchdb.user:ann@community' };
    const { service, couchService } = createService({
      findAll: vi.fn().mockImplementation((db: string, query: any) => of(
        query?.selector?.docType === 'membership' ? [ native, canonical, historical ] : [ { _id: 'team-native', status: 'active' } ]
      ))
    });
    const next = vi.fn();

    service.getTeamsByUser({ _id: 'org.couchdb.user:ann', name: 'ann', planetCode: 'planet-a' }).subscribe(next);
    // A local profile route carries only the materialized name, so the lookup starts from the loaded user document.
    service.getTeamsByUser({
      _id: 'org.couchdb.user:ann@community', name: 'ann@community', planetCode: 'community', requestId: 'request-1'
    }).subscribe();
    // A member card opens the child_users replica of the same account.
    service.getTeamsByUser({ _id: 'ann@community', couchId: 'org.couchdb.user:ann', name: 'ann', planetCode: 'community' }).subscribe();

    expect(couchService.findAll.mock.calls[1][1].selector).toEqual({ _id: { $in: [ 'team-native' ] } });
    expect(next).toHaveBeenCalledWith([ { doc: { _id: 'team-native', status: 'active' } } ]);
    expect(couchService.findAll.mock.calls[3][1].selector).toEqual({ _id: { $in: [ 'team-canonical', 'team-historical' ] } });
    expect(couchService.findAll.mock.calls[5][1].selector).toEqual({ _id: { $in: [ 'team-canonical', 'team-historical' ] } });
  });

  it('shows a local profile the same unknown-origin membership as the dashboard', () => {
    const unknownOrigin = {
      _id: 'membership-unknown', docType: 'membership', teamId: 'team-unknown', userId: 'org.couchdb.user:ann'
    };
    const { service, couchService } = createService({
      findAll: vi.fn().mockImplementation((db: string, query: any) => of(
        query?.selector?.docType === 'membership' ? [ unknownOrigin ] : [ { _id: 'team-unknown', status: 'active' } ]
      ))
    });
    const next = vi.fn();

    service.getTeamsByUser({ _id: unknownOrigin.userId, planetCode: 'planet-a' }).subscribe(next);

    expect(couchService.findAll.mock.calls[1][1].selector).toEqual({ _id: { $in: [ 'team-unknown' ] } });
    expect(next).toHaveBeenCalledWith([ { doc: { _id: 'team-unknown', status: 'active' } } ]);
  });
});
