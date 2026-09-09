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
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { NewsService } from '../news/news.service';
import { ReportsService } from '../manager-dashboard/reports/reports.service';
import { TasksService } from '../tasks/tasks.service';
import { DeviceInfoService } from '../shared/device-info.service';
import { TeamsService } from './teams.service';
import { TeamsViewComponent } from './teams-view.component';

// The component is built through TestBed's injector rather than createComponent: the real constructor
// and field initializers run, without pulling in the template's child component tree.
describe('TeamsViewComponent identity', () => {
  const serverPlanet = 'nation';

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
    // ngOnInit's first statement; the rest of it loads a team and is out of scope here.
    component.planetCode = serverPlanet;
    return component;
  };

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  describe('membership and leadership', () => {
    it('keeps an associated account origin distinct from a same-named server account', () => {
      const component = build({ user: {
        _id: 'org.couchdb.user:ann@community',
        name: 'ann@community',
        planetCode: 'community',
        requestId: 'request-1'
      } });
      component.team = { _id: 'team-1', teamPlanetCode: 'community', teamType: 'sync' };
      const nationMembership = { userId: 'org.couchdb.user:ann', userPlanetCode: serverPlanet };
      const communityMembership = { userId: 'org.couchdb.user:ann', userPlanetCode: 'community' };

      expect(component.isUserInMemberDocs([ nationMembership ], component.user)).toBe(false);
      expect(component.isUserInMemberDocs([ communityMembership ], component.user)).toBe(true);

      component.planetCode = 'community';

      expect(component.isUserInMemberDocs([ communityMembership ], component.user)).toBe(true);
      expect(component.isUserInMemberDocs([ nationMembership ], component.user)).toBe(false);
    });

    it('resolves a membership row with no planet code as belonging to the viewed server', () => {
      const component = build();

      expect(component.isUserInMemberDocs([ { userId: 'org.couchdb.user:ann' } ], component.user)).toBe(true);
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

    it('leaves the team through the member row belonging to this user, not another planet\'s', () => {
      const component = build({ user: { _id: 'org.couchdb.user:ann', planetCode: 'community' } });
      const ownRow = { _id: 'membership-home', userId: 'org.couchdb.user:ann', userPlanetCode: 'community' };
      component.members = [
        { _id: 'membership-elsewhere', userId: 'org.couchdb.user:ann', userPlanetCode: 'elsewhere' },
        ownRow
      ];
      const team = { _id: 'team-1' };
      component.team = team;

      component.toggleMembership(team, true)().subscribe();

      expect(teamsService.toggleTeamMembership).toHaveBeenCalledWith(team, true, ownRow);
    });

    it('uses the associated account origin when no member row exists yet', () => {
      const component = build({ user: { _id: 'org.couchdb.user:ann', planetCode: 'community' } });
      const team = { _id: 'team-1' };
      component.members = [];
      component.team = team;

      component.toggleMembership(team, false)().subscribe();

      expect(teamsService.toggleTeamMembership).toHaveBeenCalledWith(
        team, false, { userId: 'org.couchdb.user:ann', userPlanetCode: 'community' }
      );
    });

    it('accepts only request identity fields while preserving an explicit foreign origin', () => {
      const component = build();
      const team = { _id: 'team-1', teamPlanetCode: 'community' };
      const request = {
        _id: 'request-1',
        _rev: '1-request',
        userId: 'org.couchdb.user:bob',
        userPlanetCode: 'community',
        docType: 'request',
        isLeader: true,
        role: 'admin',
        description: 'Untrusted request metadata'
      };
      component.team = team;

      (component as any).changeObject('added', request).obs.subscribe();

      expect(teamsService.toggleTeamMembership).toHaveBeenCalledWith(team, false, {
        userId: request.userId,
        userPlanetCode: 'community',
        docType: 'membership'
      });
    });

    it('resolves a code-less accepted request from the team origin', () => {
      const component = build();
      const team = { _id: 'team-1', teamPlanetCode: 'community' };
      const request = {
        _id: 'request-1',
        _rev: '1-request',
        userId: 'org.couchdb.user:bob',
        docType: 'request'
      };
      component.team = team;

      (component as any).changeObject('added', request).obs.subscribe();

      expect(teamsService.toggleTeamMembership).toHaveBeenCalledWith(team, false, {
        userId: request.userId,
        userPlanetCode: 'community',
        docType: 'membership'
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

    it('promotes against the leader row identified by composite identity', () => {
      const component = build();
      const currentLeader = { _id: 'membership-leader', userId: 'org.couchdb.user:ann', userPlanetCode: serverPlanet };
      const promoted = { _id: 'membership-bob', userId: 'org.couchdb.user:bob', userPlanetCode: serverPlanet };
      component.members = [
        { _id: 'membership-decoy', userId: 'org.couchdb.user:ann', userPlanetCode: 'community' },
        currentLeader,
        promoted
      ];
      component.leader = { userId: 'org.couchdb.user:ann', userPlanetCode: serverPlanet };
      component.team = { _id: 'team-1' };

      component.makeLeader(promoted)().subscribe();

      expect(teamsService.changeTeamLeadership).toHaveBeenCalledWith(currentLeader, promoted);
    });

    it('demotes a malformed persisted leader by document id', () => {
      const component = build();
      const malformedLeader = { _id: 'membership-leader', userId: '', isLeader: true };
      const promoted = {
        _id: 'membership-bob', userId: 'org.couchdb.user:bob', userPlanetCode: serverPlanet
      };
      component.members = [ malformedLeader, promoted ];
      component.leader = malformedLeader;
      component.team = { _id: 'team-1', teamPlanetCode: serverPlanet };

      component.makeLeader(promoted)().subscribe();

      expect(teamsService.changeTeamLeadership).toHaveBeenCalledWith(malformedLeader, promoted);
    });

    it('promotes when the team has no persisted leader record', () => {
      const component = build();
      component.members = [];
      component.leader = { userId: 'org.couchdb.user:missing', userPlanetCode: serverPlanet };
      component.team = { _id: 'team-1' };

      expect(() => component.makeLeader({ userId: 'org.couchdb.user:bob' })().subscribe()).not.toThrow();
      expect(teamsService.changeTeamLeadership).toHaveBeenCalledWith(undefined, { userId: 'org.couchdb.user:bob' });
    });

    it('uses the sole persisted leader even when the displayed leader matches a different member', () => {
      const component = build();
      const persistedLeader = { _id: 'leader-1', userId: '', isLeader: true };
      const promoted = { _id: 'member-1', userId: 'org.couchdb.user:bob' };
      component.members = [ persistedLeader, promoted ];
      component.leader = { ...promoted };
      component.team = { _id: 'team-1' };

      component.makeLeader(promoted)().subscribe();

      expect(teamsService.changeTeamLeadership).toHaveBeenCalledWith(persistedLeader, promoted);
    });

    it('fails closed when multiple persisted leaders already exist', () => {
      const component = build();
      const error = vi.fn();
      component.members = [
        { _id: 'leader-1', userId: 'one', isLeader: true },
        { _id: 'leader-2', userId: 'two', isLeader: true }
      ];
      component.leader = component.members[0];
      component.team = { _id: 'team-1' };
      component.getMembers = vi.fn().mockReturnValue(of([]));

      component.makeLeader({ _id: 'member-1', userId: 'three' })().subscribe({ error });

      expect(error).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Multiple persisted team leaders must be resolved before promotion.'
      }));
      expect(teamsService.changeTeamLeadership).not.toHaveBeenCalled();
    });

    it('removes a cancelled associated request from local state with the canonical matcher', () => {
      const component = build({ user: {
        _id: 'org.couchdb.user:ann@community',
        name: 'ann@community',
        planetCode: 'community',
        requestId: 'request-1'
      } });
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

    it('recognizes a historical materialized membership for an associated account', () => {
      const component = build({ user: {
        _id: 'org.couchdb.user:ann@community',
        name: 'ann@community',
        planetCode: 'community',
        requestId: 'request-1'
      } });
      component.team = { _id: 'team-1', teamPlanetCode: 'community' };

      expect(component.isUserInMemberDocs([ {
        userId: 'org.couchdb.user:ann@community', userPlanetCode: 'community'
      } ], component.user)).toBe(true);
      expect(component.isUserInMemberDocs([ {
        userId: 'org.couchdb.user:ann@community', userPlanetCode: serverPlanet
      } ], component.user)).toBe(true);
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

    it('separates same-id members on different planets and projects secondary assignments', () => {
      const component = build({ user: { _id: 'org.couchdb.user:alex', planetCode: serverPlanet } });
      const localTask = { _id: 'local', assignees: [ other, local ], completed: false };
      const remoteTask = { _id: 'remote', assignees: [ remote ], completed: false };
      component.members = [ local, remote, other ];
      component.userStatus = 'member';
      component.isUserLeader = false;

      component.setTasks([ localTask, remoteTask ]);

      expect(component.members[0].tasks).toEqual([ localTask ]);
      expect(component.members[1].tasks).toEqual([ remoteTask ]);
      expect(component.members[2].tasks).toEqual([ localTask ]);
    });

    it('counts the signed-in member card and My Tasks identically', () => {
      const component = build({ user: { _id: 'org.couchdb.user:alex', planetCode: serverPlanet } });
      const mine = { _id: 'mine', assignees: [ local ], completed: false };
      const done = { _id: 'done', assignees: [ local ], completed: true };
      const theirs = { _id: 'theirs', assignees: [ remote ], completed: false };
      component.members = [ local, remote ];
      component.userStatus = 'member';
      component.isUserLeader = false;

      component.setTasks([ mine, done, theirs ]);

      const currentMemberCard = component.members[0];
      expect(currentMemberCard.tasks).toEqual([ mine, done ]);
      expect(component.taskCount).toBe(currentMemberCard.tasks.filter(task => !task.completed).length);
      expect(component.taskCount).toBe(1);
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

    it('counts every incomplete team task for a leader', () => {
      const component = build({ user: { _id: 'org.couchdb.user:alex', planetCode: serverPlanet } });
      component.members = [ local, remote ];
      component.userStatus = 'member';
      component.isUserLeader = true;

      component.setTasks([
        { _id: 'a', assignees: [ local ], completed: false },
        { _id: 'b', assignees: [ remote ], completed: false },
        { _id: 'c', assignees: [ other ], completed: true }
      ]);

      expect(component.taskCount).toBe(2);
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
});
