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
