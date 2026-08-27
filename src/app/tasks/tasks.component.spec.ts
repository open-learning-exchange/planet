import { Subject, of } from 'rxjs';
import { vi } from 'vitest';
import { MatDialog } from '@angular/material/dialog';
import { TasksComponent, FilterAssigneePipe } from './tasks.component';
import { TasksService } from './tasks.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersProfileDialogService } from '../users/users-profile/users-profile-dialog.service';

describe('TasksComponent', () => {
  let component: TasksComponent;
  let taskUpdates: Subject<any[]>;
  let tasksService: {
    tasksListener: ReturnType<typeof vi.fn>;
    sortedTasks: ReturnType<typeof vi.fn>;
    getTasks: ReturnType<typeof vi.fn>;
    addTask: ReturnType<typeof vi.fn>;
  };
  let userService: { get: ReturnType<typeof vi.fn> };
  let dialog: { open: ReturnType<typeof vi.fn> };
  let usersProfileDialogService: { open: ReturnType<typeof vi.fn> };
  let notificationsService: { sendNotificationToUser: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    taskUpdates = new Subject<any[]>();
    tasksService = {
      tasksListener: vi.fn().mockReturnValue(taskUpdates),
      sortedTasks: vi.fn((tasks) => tasks),
      getTasks: vi.fn(),
      addTask: vi.fn().mockReturnValue(of({}))
    };
    userService = {
      get: vi.fn().mockReturnValue({
        _id: 'org.couchdb.user:alex',
        planetCode: 'planet-a'
      })
    };
    dialog = { open: vi.fn() };
    usersProfileDialogService = { open: vi.fn() };
    notificationsService = { sendNotificationToUser: vi.fn().mockReturnValue(of({})) };
    component = new TasksComponent(
      tasksService as any as TasksService,
      {} as PlanetMessageService,
      userService as any as UserService,
      { datePlaceholder: 0 } as any as CouchService,
      dialog as any as MatDialog,
      usersProfileDialogService as any as UsersProfileDialogService,
      {} as DialogsFormService,
      notificationsService as any as NotificationsService
    );
    component.link = { teams: 'team-1' };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves a stored assignee against the current member using ID and planet code', () => {
    const currentMember = {
      userId: 'org.couchdb.user:alex',
      userPlanetCode: 'planet-b',
      name: 'alex',
      avatar: '/current-avatar',
      userDoc: { doc: { _attachments: { img: {} } } }
    };
    const task = {
      _id: 'task-1',
      assignee: {
        userId: currentMember.userId,
        userPlanetCode: currentMember.userPlanetCode,
        name: 'old-name',
        avatar: '/old-avatar'
      }
    };
    component.assignees = [ currentMember ];
    component.ngOnInit();

    taskUpdates.next([ task ]);

    expect(component.taskViews[0].assignee).toBe(currentMember);
    expect(task).toEqual({
      _id: 'task-1',
      assignee: {
        userId: currentMember.userId,
        userPlanetCode: currentMember.userPlanetCode,
        name: 'old-name',
        avatar: '/old-avatar'
      }
    });
  });

  it('keeps the stored snapshot when the current member is unavailable', () => {
    const snapshot = {
      userId: 'org.couchdb.user:alex',
      userPlanetCode: 'planet-b',
      name: 'alex',
      avatar: '/snapshot-avatar'
    };
    const task = { _id: 'task-1', assignee: snapshot };
    component.assignees = [];
    component.ngOnInit();

    taskUpdates.next([ task ]);

    expect(component.taskViews[0].assignee).toBe(snapshot);
  });

  it('keeps the stored snapshot when the matching current member is not enriched', () => {
    const snapshot = {
      userId: 'org.couchdb.user:alex',
      userPlanetCode: 'planet-a',
      name: 'snapshot-alex',
      avatar: '/snapshot-avatar'
    };
    const unresolvedMember = {
      userId: snapshot.userId,
      userPlanetCode: snapshot.userPlanetCode,
      name: 'current-alex',
      avatar: 'assets/image.png'
    };
    component.assignees = [ unresolvedMember ];
    component.ngOnInit();

    taskUpdates.next([ { _id: 'task-1', assignee: snapshot } ]);

    expect(component.taskViews[0].assignee).toBe(snapshot);
    expect(component.taskViews[0].avatarSrc).toBe(`${component.imgUrlPrefix}/snapshot-avatar`);
  });

  it('uses a resolved no-image state and refreshes when an attachment appears', () => {
    const snapshot = {
      userId: 'org.couchdb.user:alex',
      userPlanetCode: 'planet-a',
      name: 'snapshot-alex',
      avatar: '/previous-avatar'
    };
    const resolvedMember = {
      userId: snapshot.userId,
      userPlanetCode: snapshot.userPlanetCode,
      name: 'current-alex',
      avatar: 'assets/image.png',
      userDoc: { doc: {} }
    };
    component.assignees = [ resolvedMember ];
    component.ngOnInit();
    taskUpdates.next([ { _id: 'task-1', assignee: snapshot } ]);

    expect(component.taskViews[0].assignee).toBe(resolvedMember);
    expect(component.taskViews[0].avatarSrc).toBe('assets/image.png');

    const attachmentDoc = {
      _id: `${snapshot.userId}@${snapshot.userPlanetCode}`,
      _attachments: { img: { digest: 'md5-current' } }
    };
    component.assignees = [ { ...resolvedMember, attachmentDoc } ];

    expect(component.taskViews[0].avatarSrc)
      .toMatch(/\/attachments\/org\.couchdb\.user:alex@planet-a\/img$/);
  });

  it('keeps existing ID-only My Tasks ownership until the shared identity migration', () => {
    component.ngOnInit();

    taskUpdates.next([
      {
        _id: 'remote-task',
        assignee: {
          userId: 'org.couchdb.user:alex',
          userPlanetCode: 'planet-b'
        }
      },
      {
        _id: 'local-task',
        assignee: {
          userId: 'org.couchdb.user:alex',
          userPlanetCode: 'planet-a'
        }
      }
    ]);

    expect(component.myTasks.map(task => task._id)).toEqual([ 'remote-task', 'local-task' ]);
  });

  it('keeps existing ID-only self-notification suppression', () => {
    const task = { _id: 'task-1' };

    component.addAssignee(task, {
      userId: 'org.couchdb.user:alex',
      userPlanetCode: 'planet-b',
      name: 'alex',
      userDoc: {}
    });
    expect(notificationsService.sendNotificationToUser).not.toHaveBeenCalled();
  });

  it('opens the profile dialog with the assignee planet code', () => {
    component.openMemberDialog({ name: 'alex', userPlanetCode: 'planet-b', teamPlanetCode: 'planet-a' });

    expect(usersProfileDialogService.open).toHaveBeenCalledWith({
      member: { name: 'alex', userPlanetCode: 'planet-b' }
    });
  });

  it('retains a failed avatar until the member source changes', () => {
    const member = (attachmentName: string) => ({
      userId: 'org.couchdb.user:alex',
      userPlanetCode: 'planet-b',
      name: 'alex',
      attachmentDoc: {
        _id: 'org.couchdb.user:alex@planet-b',
        _attachments: { [attachmentName]: { digest: `md5-${attachmentName}` } }
      }
    });
    component.assignees = [ member('img') ];
    component.ngOnInit();
    taskUpdates.next([ {
      _id: 'task-1',
      assignee: {
        userId: 'org.couchdb.user:alex',
        userPlanetCode: 'planet-b'
      }
    } ]);

    component.useDefaultAvatar(component.filteredTaskViews[0]);
    expect(component.filteredTaskViews[0].avatarSrc).toBe('assets/image.png');

    component.assignees = [ member('img') ];
    expect(component.filteredTaskViews[0].avatarSrc).toBe('assets/image.png');

    component.assignees = [ member('img_') ];
    expect(component.filteredTaskViews[0].avatarSrc).toMatch(/\/img_$/);
  });

  it('keeps a historical missing-code assignee unresolved', () => {
    const remoteMember = {
      userId: 'org.couchdb.user:alex',
      userPlanetCode: 'planet-b',
      name: 'remote-alex'
    };
    const task = {
      _id: 'legacy-task',
      assignee: {
        userId: 'org.couchdb.user:alex',
        name: 'old-alex'
      }
    };
    component.assignees = [ remoteMember ];
    component.ngOnInit();

    taskUpdates.next([ task ]);

    expect(component.myTasks).toEqual([ task ]);
    expect(component.taskViews[0].assignee).toBe(task.assignee);
  });

  it('precomputes the current attachment key whenever member data refreshes', () => {
    const task = {
      _id: 'task-1',
      assignee: {
        userId: 'org.couchdb.user:alex',
        userPlanetCode: 'planet-b'
      }
    };
    const member = (attachmentName: string) => ({
      ...task.assignee,
      attachmentDoc: {
        _id: 'org.couchdb.user:alex@planet-b',
        _attachments: { [attachmentName]: { digest: `md5-${attachmentName}` } }
      }
    });
    component.assignees = [ member('img') ];
    component.ngOnInit();
    taskUpdates.next([ task ]);

    expect(component.filteredTaskViews[0].avatarSrc).toMatch(/\/attachments\/org\.couchdb\.user:alex@planet-b\/img$/);

    component.assignees = [ member('img_') ];
    expect(component.filteredTaskViews[0].avatarSrc).toMatch(/\/img_$/);

    component.assignees = [ member('img') ];
    expect(component.filteredTaskViews[0].avatarSrc).toMatch(/\/img$/);
  });

  it('rebuilds the task view when a task is reassigned', () => {
    const firstMember = {
      userId: 'org.couchdb.user:first',
      userPlanetCode: 'planet-a',
      name: 'first',
      userDoc: { doc: {} }
    };
    const secondMember = {
      userId: 'org.couchdb.user:second',
      userPlanetCode: 'planet-b',
      name: 'second',
      userDoc: { doc: {} }
    };
    component.assignees = [ firstMember, secondMember ];
    component.ngOnInit();

    taskUpdates.next([ {
      _id: 'task-1',
      assignee: {
        userId: firstMember.userId,
        userPlanetCode: firstMember.userPlanetCode
      }
    } ]);
    expect(component.filteredTaskViews[0].assignee).toBe(firstMember);

    taskUpdates.next([ {
      _id: 'task-1',
      assignee: {
        userId: secondMember.userId,
        userPlanetCode: secondMember.userPlanetCode
      }
    } ]);
    expect(component.filteredTaskViews[0].assignee).toBe(secondMember);
  });

  it('keeps relative and absolute fallback avatar URLs distinct', () => {
    expect(component.avatarSrc({ avatar: '/_users/org.couchdb.user:alex/img' }))
      .toBe(`${component.imgUrlPrefix}/_users/org.couchdb.user:alex/img`);
    expect(component.avatarSrc({ avatar: 'https://planet.example/_users/org.couchdb.user:alex/img' }))
      .toBe('https://planet.example/_users/org.couchdb.user:alex/img');
  });

  it('does not notify an assignee without a resolved user document', () => {
    component.addAssignee({ _id: 'task-1' }, {
      userId: 'org.couchdb.user:other',
      userPlanetCode: 'planet-b',
      name: 'other'
    });

    expect(notificationsService.sendNotificationToUser).not.toHaveBeenCalled();
  });

  it('stores only non-sensitive, server-independent assignee metadata', () => {
    const assignee = {
      userId: 'org.couchdb.user:other',
      userPlanetCode: 'planet-b',
      name: 'other',
      avatar: 'https://planet.example/attachments/other/img',
      attachmentDoc: {
        _id: 'org.couchdb.user:other@planet-b',
        _attachments: { img: { digest: 'md5-image' } }
      },
      userDoc: {
        _id: 'org.couchdb.user:other',
        fullName: 'Other User',
        doc: { derived_key: 'secret-hash', salt: 'secret-salt' }
      }
    };

    component.addAssignee({ _id: 'task-1' }, assignee);

    expect(tasksService.addTask).toHaveBeenCalledWith({
      _id: 'task-1',
      assignee: {
        userId: assignee.userId,
        userPlanetCode: assignee.userPlanetCode,
        name: assignee.name,
        attachmentDoc: assignee.attachmentDoc,
        userDoc: { fullName: 'Other User' }
      }
    });
  });

  it('does not resolve when neither snapshot nor member has a planet code', () => {
    const currentMember = { userId: 'org.couchdb.user:alex', name: 'current' };
    const snapshot = { userId: 'org.couchdb.user:alex', name: 'snapshot' };
    component.assignees = [ currentMember ];
    component.ngOnInit();

    taskUpdates.next([ { _id: 'legacy-task', assignee: snapshot } ]);

    expect(component.taskViews[0].assignee).toBe(snapshot);
  });

  it('filters task views when switching between My Tasks and All Tasks', () => {
    component.ngOnInit();
    taskUpdates.next([
      { _id: 'owned', assignee: { userId: 'org.couchdb.user:alex', userPlanetCode: 'planet-a' } },
      { _id: 'other', assignee: { userId: 'org.couchdb.user:other', userPlanetCode: 'planet-a' } }
    ]);

    expect(component.filteredTaskViews.map(({ task }) => task._id)).toEqual([ 'owned' ]);

    component.setFilter('all');
    expect(component.filteredTaskViews.map(({ task }) => task._id)).toEqual([ 'owned', 'other' ]);

    component.setFilter('self');
    expect(component.filteredTaskViews.map(({ task }) => task._id)).toEqual([ 'owned' ]);
  });

  it('partitions tasks into activeTaskViews and completedTaskViews', () => {
    component.ngOnInit();
    taskUpdates.next([
      { _id: 'task-active', completed: false, assignee: { userId: 'org.couchdb.user:alex' } },
      { _id: 'task-done', completed: true, assignee: { userId: 'org.couchdb.user:alex' } },
      { _id: 'task-pending', assignee: { userId: 'org.couchdb.user:alex' } }
    ]);

    expect(component.activeTaskViews.map(({ task }) => task._id)).toEqual([ 'task-active', 'task-pending' ]);
    expect(component.completedTaskViews.map(({ task }) => task._id)).toEqual([ 'task-done' ]);
  });

  it('toggles completed section expansion state', () => {
    expect(component.isCompletedExpanded).toBe(true);
    component.toggleCompletedSection();
    expect(component.isCompletedExpanded).toBe(false);
    component.toggleCompletedSection();
    expect(component.isCompletedExpanded).toBe(true);
  });

  it('maintains active and completed partitioning when switching filter between self and all', () => {
    component.ngOnInit();
    taskUpdates.next([
      { _id: 'my-active', completed: false, assignee: { userId: 'org.couchdb.user:alex' } },
      { _id: 'my-done', completed: true, assignee: { userId: 'org.couchdb.user:alex' } },
      { _id: 'other-active', completed: false, assignee: { userId: 'org.couchdb.user:other' } },
      { _id: 'other-done', completed: true, assignee: { userId: 'org.couchdb.user:other' } }
    ]);

    // Default 'self' filter
    expect(component.activeTaskViews.map(({ task }) => task._id)).toEqual([ 'my-active' ]);
    expect(component.completedTaskViews.map(({ task }) => task._id)).toEqual([ 'my-done' ]);

    // 'all' filter
    component.setFilter('all');
    expect(component.activeTaskViews.map(({ task }) => task._id)).toEqual([ 'my-active', 'other-active' ]);
    expect(component.completedTaskViews.map(({ task }) => task._id)).toEqual([ 'my-done', 'other-done' ]);
  });

  it('unsubscribes and completes onDestroy$ on ngOnDestroy', () => {
    component.ngOnInit();
    expect(() => component.ngOnDestroy()).not.toThrow();
  });
});

describe('FilterAssigneePipe', () => {
  it('keeps existing ID-only assignment-menu filtering', () => {
    const pipe = new FilterAssigneePipe();
    const current = { userId: 'org.couchdb.user:alex', userPlanetCode: 'planet-a' };
    const remote = { userId: 'org.couchdb.user:alex', userPlanetCode: 'planet-b' };
    const other = { userId: 'org.couchdb.user:other', userPlanetCode: 'planet-a' };

    expect(pipe.transform([ current, remote, other ], current)).toEqual([ other ]);
  });
});
