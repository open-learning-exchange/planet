import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { CouchService } from '../shared/couchdb.service';
import { UserService } from '../shared/user.service';
import { StateService } from '../shared/state.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { DialogsAddTableComponent } from '../shared/dialogs/dialogs-add-table.component';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { NewsService } from '../news/news.service';
import { ReportsService } from '../manager-dashboard/reports/reports.service';
import { TasksService } from '../tasks/tasks.service';
import { DeviceInfoService } from '../shared/device-info.service';
import { TeamsService } from './teams.service';
import { TeamsViewComponent } from './teams-view.component';

// Injected rather than created so the real constructor runs without rendering the template's child components.
describe('TeamsViewComponent identity', () => {
  const serverPlanet = 'nation';
  const associatedAnn = {
    _id: 'org.couchdb.user:ann@community', name: 'ann@community', planetCode: 'community', requestId: 'request-1'
  };

  let teamsService: any;
  let tasksService: any;
  let userService: any;
  let dialog: any;

  const build = ({ user = { _id: 'org.couchdb.user:ann', planetCode: serverPlanet }, mode = 'team' } = {}) => {
    teamsService = {
      getTeamMembers: vi.fn().mockReturnValue(of([])),
      getTeamResources: vi.fn().mockReturnValue(of([])),
      changeTeamLeadership: vi.fn().mockReturnValue(of({})),
      toggleTeamMembership: vi.fn().mockReturnValue(of({})),
      removeFromRequests: vi.fn().mockReturnValue(of({})),
      cancelJoinRequest: vi.fn().mockReturnValue(of({})),
      sendNotifications: vi.fn().mockReturnValue(of({}))
    };
    tasksService = {
      sortedTasks: (tasks) => tasks,
      getTasks: vi.fn(),
      tasksListener: () => of([]),
      removeAssigneeFromTasks: vi.fn().mockReturnValue(of({}))
    };
    userService = { get: () => user, doesUserHaveRole: () => false };
    dialog = { open: vi.fn().mockReturnValue({}) };
    TestBed.configureTestingModule({
      providers: [
        TeamsViewComponent,
        { provide: CouchService, useValue: { findAll: vi.fn().mockReturnValue(of([])) } },
        { provide: UserService, useValue: userService },
        { provide: Router, useValue: { navigate: vi.fn() } },
        { provide: ActivatedRoute, useValue: { snapshot: { data: { mode }, params: {} }, paramMap: of(new Map()) } },
        { provide: PlanetMessageService, useValue: { showMessage: vi.fn(), showAlert: vi.fn() } },
        { provide: TeamsService, useValue: teamsService },
        { provide: MatDialog, useValue: dialog },
        { provide: DialogsLoadingService, useValue: { start: vi.fn(), stop: vi.fn() } },
        { provide: DialogsFormService, useValue: {} },
        { provide: NewsService, useValue: {} },
        { provide: ReportsService, useValue: {} },
        { provide: StateService, useValue: { configuration: { code: serverPlanet } } },
        { provide: TasksService, useValue: tasksService },
        { provide: DeviceInfoService, useValue: { watchDeviceType: () => new Subject() } }
      ]
    });
    const component: any = TestBed.inject(TeamsViewComponent);
    component.planetCode = serverPlanet;
    return component;
  };

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  describe('membership and leadership', () => {
    it('keeps an associated account origin distinct from a same-named server account', () => {
      const component = build({ user: associatedAnn });
      component.team = { _id: 'team-1', teamPlanetCode: 'community', teamType: 'sync' };
      const nationMembership = { userId: 'org.couchdb.user:ann', userPlanetCode: serverPlanet };
      const communityMembership = { userId: 'org.couchdb.user:ann', userPlanetCode: 'community' };

      expect(component.isUserInMemberDocs([ nationMembership ], component.user)).toBe(false);
      expect(component.isUserInMemberDocs([ communityMembership ], component.user)).toBe(true);
      expect(component.isUserInMemberDocs([ { ...communityMembership, userId: associatedAnn._id } ], component.user)).toBe(true);
      expect(component.isUserInMemberDocs([ { ...nationMembership, userId: associatedAnn._id } ], component.user)).toBe(true);

      component.planetCode = 'community';

      expect(component.isUserInMemberDocs([ communityMembership ], component.user)).toBe(true);
      expect(component.isUserInMemberDocs([ nationMembership ], component.user)).toBe(false);
    });

    it('resolves a code-less leader through the synchronized team origin', () => {
      const component = build({ user: { _id: 'org.couchdb.user:ann', planetCode: 'community' } });
      component.team = { _id: 'team-1', teamPlanetCode: 'community' };
      component.requests = [];
      component.members = [];
      component.route.snapshot.params = {};

      component.setStatus(component.team, { userId: 'org.couchdb.user:ann' }, component.user);

      expect(component.isUserLeader).toBe(true);
    });

    it('does not treat another planet\'s member or leader document as this user', () => {
      const component = build();
      component.requests = [];
      const foreignRow = { userId: 'org.couchdb.user:ann', userPlanetCode: 'community', isLeader: true };
      component.members = [ foreignRow ];
      component.route.snapshot.params = {};

      component.setStatus({}, foreignRow, component.user);

      expect(component.userStatus).toBe('unrelated');
      expect(component.isUserLeader).toBe(false);
    });

    it('toggles membership through this user\'s own row, or its own origin when no row exists', () => {
      const component = build({ user: { _id: 'org.couchdb.user:ann', planetCode: 'community' } });
      const ownRow = { _id: 'membership-home', userId: 'org.couchdb.user:ann', userPlanetCode: 'community' };
      const team = { _id: 'team-1' };
      component.members = [ { _id: 'membership-elsewhere', userId: 'org.couchdb.user:ann', userPlanetCode: 'elsewhere' }, ownRow ];
      component.team = team;

      component.toggleMembership(team, true)().subscribe();
      component.members = [];
      component.toggleMembership(team, false)().subscribe();

      expect(teamsService.toggleTeamMembership).toHaveBeenNthCalledWith(1, team, true, ownRow);
      expect(teamsService.toggleTeamMembership).toHaveBeenNthCalledWith(
        2, team, false, { userId: 'org.couchdb.user:ann', userPlanetCode: 'community' }
      );
    });

    it('accepts only request identity fields, keeping an explicit origin and resolving a missing one from the team', () => {
      const component = build();
      const team = { _id: 'team-1', teamPlanetCode: 'community' };
      const explicit = {
        _id: 'request-1', _rev: '1-request', docType: 'request', userId: 'org.couchdb.user:bob',
        userPlanetCode: 'elsewhere', isLeader: true, role: 'admin', description: 'Untrusted request metadata'
      };
      const codeless = { _id: 'request-2', _rev: '1-request', docType: 'request', userId: 'org.couchdb.user:cat' };
      component.team = team;

      (component as any).changeObject('added', explicit).obs.subscribe();
      (component as any).changeObject('added', codeless).obs.subscribe();

      expect(teamsService.toggleTeamMembership).toHaveBeenNthCalledWith(1, team, false, {
        userId: explicit.userId, userPlanetCode: 'elsewhere', docType: 'membership'
      });
      expect(teamsService.toggleTeamMembership).toHaveBeenNthCalledWith(2, team, false, {
        userId: codeless.userId, userPlanetCode: 'community', docType: 'membership'
      });
    });

    it('uses a code-less member\'s resolved team origin during task cleanup', () => {
      const component = build();
      const member = {
        _id: 'membership-1',
        userId: 'org.couchdb.user:bob',
        resolvedUserPlanetCode: 'community'
      };
      component.team = { _id: 'team-1', teamPlanetCode: 'community' };
      component.teamId = 'team-1';
      component.getMembers = vi.fn().mockReturnValue(of([]));

      component.changeMembershipRequest('removed', member)().subscribe();

      expect(tasksService.removeAssigneeFromTasks).toHaveBeenCalledWith(
        member.userId, 'community', { teams: 'team-1' }
      );
    });

    it('promotes when the team has no persisted leader record', () => {
      const component = build();
      component.members = [];
      component.leader = { userId: 'org.couchdb.user:missing', userPlanetCode: serverPlanet };
      component.team = { _id: 'team-1' };

      expect(() => component.makeLeader({ userId: 'org.couchdb.user:bob' })().subscribe()).not.toThrow();
      expect(teamsService.changeTeamLeadership).toHaveBeenCalledWith([], { userId: 'org.couchdb.user:bob' });
    });

    it('hands every persisted leader to promotion so a leftover second leader is demoted', () => {
      const component = build();
      const leaders = [ { _id: 'leader-1', userId: '', isLeader: true }, { _id: 'leader-2', userId: 'two', isLeader: true } ];
      const promoted = { _id: 'member-1', userId: 'org.couchdb.user:bob' };
      component.members = [ ...leaders, promoted ];
      component.leader = leaders[0];
      component.team = { _id: 'team-1' };

      component.makeLeader(promoted)().subscribe();

      expect(teamsService.changeTeamLeadership).toHaveBeenCalledWith(leaders, promoted);
    });

    it('removes a cancelled associated request from local state with the canonical matcher', () => {
      const component = build({ user: associatedAnn });
      const ownRequest = {
        userId: 'org.couchdb.user:ann', userPlanetCode: 'community', docType: 'request'
      };
      const sameNamedServerRequest = {
        userId: 'org.couchdb.user:ann', userPlanetCode: serverPlanet, docType: 'request'
      };
      component.team = { _id: 'team-1', teamPlanetCode: 'community' };
      component.leader = {};
      component.members = [];
      component.requests = [ ownRequest, sameNamedServerRequest ];
      component.cancelDialog = { close: vi.fn() };

      component.cancelJoinRequest().onNext();

      expect(component.requests).toEqual([ sameNamedServerRequest ]);
      expect(component.userStatus).toBe('unrelated');
    });

    it('excludes the materialized associated member without hiding the same-named native user', () => {
      const component = build();
      component.members = [ {
        userId: 'org.couchdb.user:ann',
        userDoc: {
          _id: 'org.couchdb.user:ann@community',
          doc: { _id: 'org.couchdb.user:ann@community' }
        }
      } ];

      component.openInviteMemberDialog();

      expect(dialog.open.mock.calls[0][1].data.excludeIds).toEqual([
        'org.couchdb.user:ann@community'
      ]);
    });

    it('keeps the stored name for profile routing while using the materialized user document for avatars and visits', () => {
      const component = build();
      const materializedId = 'org.couchdb.user:ann@community';
      component.team = { _id: 'team-1', teamPlanetCode: 'community' };
      teamsService.getTeamMembers.mockReturnValue(of([ {
        userId: 'org.couchdb.user:ann',
        userPlanetCode: 'community',
        docType: 'membership',
        userDoc: {
          _id: materializedId,
          doc: { _id: materializedId, name: 'ann@community', _attachments: { img: {} } }
        }
      } ]));

      component.getMembers().subscribe();

      component.visits = { 'ann@community': { count: 2 } };

      expect(component.members[0].name).toBe('ann');
      expect(component.members[0].avatar).toContain(`/_users/${materializedId}/img`);
      expect(component.memberVisits(component.members[0])).toEqual({ count: 2 });
    });
  });

  describe('label management', () => {
    it('derives custom labels from the current team document', () => {
      const component = build();
      component.team = { customVoiceLabels: [ 'Initial' ] };
      expect(component.customVoiceLabels).toEqual([ 'Initial' ]);

      component.team = { customVoiceLabels: [ 'Updated' ] };
      expect(component.customVoiceLabels).toEqual([ 'Updated' ]);
    });

    it('limits planet-level label managers to locally owned teams', () => {
      const component = build();
      component.isUserLeader = false;
      component.user = { isUserAdmin: false };
      userService.doesUserHaveRole = () => true;
      component.team = { teamPlanetCode: 'community' };

      expect(component.canManageLabels).toBe(false);

      component.team = { teamPlanetCode: serverPlanet };
      expect(component.canManageLabels).toBe(true);
    });

    it('allows a team leader to manage labels regardless of the team planet', () => {
      const component = build();
      component.isUserLeader = true;
      component.user = { isUserAdmin: false };
      userService.doesUserHaveRole = () => false;
      component.team = { teamPlanetCode: 'community' };

      expect(component.canManageLabels).toBe(true);
    });
  });

  describe('task grouping and counts', () => {
    const local = { userId: 'org.couchdb.user:alex', userPlanetCode: serverPlanet };
    const remote = { userId: 'org.couchdb.user:alex', userPlanetCode: 'community' };
    const other = { userId: 'org.couchdb.user:other', userPlanetCode: serverPlanet };

    it('separates same-id members on different planets and counts the member card like My Tasks', () => {
      const component = build({ user: { _id: 'org.couchdb.user:alex', planetCode: serverPlanet } });
      const shared = { _id: 'shared', assignees: [ other, local ], completed: false };
      const done = { _id: 'done', assignees: [ local ], completed: true };
      const remoteTask = { _id: 'remote', assignees: [ remote ], completed: false };
      component.members = [ local, remote, other ];
      component.userStatus = 'member';
      component.isUserLeader = false;

      component.setTasks([ shared, done, remoteTask ]);

      const currentMemberCard = component.members[0];
      expect(currentMemberCard.tasks).toEqual([ shared, done ]);
      expect(component.members[1].tasks).toEqual([ remoteTask ]);
      expect(component.members[2].tasks).toEqual([ shared ]);
      expect(component.taskCount).toBe(currentMemberCard.tasks.filter(task => !task.completed).length);
    });

    it('counts safe historical task identities without counting a same-named native user', () => {
      const component = build({ user: {
        _id: 'org.couchdb.user:alex@community',
        name: 'alex@community',
        planetCode: 'community',
        sync: true
      } });
      component.members = [ local, remote ];
      component.userStatus = 'member';
      component.isUserLeader = false;

      component.setTasks([
        { _id: 'materialized-server-stamped', assignees: [ {
          userId: 'org.couchdb.user:alex@community', userPlanetCode: serverPlanet
        } ], completed: false },
        { _id: 'home-stamped', assignees: [ remote ], completed: false },
        { _id: 'same-named-native', assignees: [ local ], completed: false },
        { _id: 'someone-else', assignees: [ other ], completed: false }
      ]);

      expect(component.taskCount).toBe(2);
    });

    it('groups an associated member\'s historical materialized tasks onto their card for other viewers', () => {
      const component = build({ user: { _id: 'org.couchdb.user:other', planetCode: serverPlanet } });
      const materializedId = 'org.couchdb.user:alex@community';
      const userDoc = {
        _id: materializedId, doc: { _id: materializedId, name: 'alex@community', planetCode: 'community', requestId: 'r1' }
      };
      const materializedTask = {
        _id: 'materialized', assignees: [ { userId: materializedId, userPlanetCode: serverPlanet } ], completed: false
      };
      component.members = [ { ...remote, userDoc }, local ];

      component.setTasks([ materializedTask ]);

      expect(component.members[0].tasks).toEqual([ materializedTask ]);
      expect(component.members[1].tasks).toEqual([]);
    });

    it('does not crash when the signed-in user has no member record', () => {
      const component = build({ user: { _id: 'org.couchdb.user:ghost', planetCode: serverPlanet } });
      component.members = [ local ];
      component.userStatus = 'member';
      component.isUserLeader = false;

      expect(() => component.setTasks([ { _id: 'a', assignees: [ local ], completed: false } ])).not.toThrow();
      expect(component.taskCount).toBe(0);
    });
  });

  it('uses one spinner owner when adding a member from the dialog', () => {
    const component = build();
    const dialogsLoadingService = TestBed.inject(DialogsLoadingService);
    const dialogRef = { close: vi.fn() };
    dialog.open.mockReturnValue(dialogRef);
    teamsService.addMembers = vi.fn().mockReturnValue(of({ ok: true }));
    component.members = [];
    component.team = { _id: 't1' };
    component.requests = [];
    component.getMembers = () => of([]);

    component.openInviteMemberDialog();
    const dialogCfg = dialog.open.mock.calls[0][1];
    const selected = { _id: 'u1' };
    const addTable = new DialogsAddTableComponent(dialogRef as any, dialogCfg.data, dialogsLoadingService);
    addTable.usersComponent = {
      usersTable: { tableData: { data: [ selected ] }, selection: { selected: [ selected ] } }
    } as any;
    addTable.ok();

    expect(dialogCfg.data.noSpinner).toBe(true);
    expect(dialogsLoadingService.start).toHaveBeenCalledTimes(1);
    expect(dialogsLoadingService.stop).toHaveBeenCalledTimes(1);
    expect(dialogRef.close).toHaveBeenCalled();
  });
});
