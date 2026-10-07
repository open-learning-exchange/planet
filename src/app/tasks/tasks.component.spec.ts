import { Subject, of } from 'rxjs';
import { vi } from 'vitest';
import { MatDialog } from '@angular/material/dialog';
import { TasksComponent } from './tasks.component';
import { TasksService } from './tasks.service';
import { PlanetMessageService } from '@shared/ui/planet-message.service';
import { UserService } from '@shared/auth/user.service';
import { CouchService } from '@shared/database/couchdb.service';
import { DialogsFormService } from '@shared/dialogs/dialogs-form.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersProfileDialogService } from '../users/users-profile/users-profile-dialog.service';
import { StateService } from '@shared/state.service';
import { TestBed } from '@angular/core/testing';
import { TasksAssigneesDialogComponent } from './tasks-assignees-dialog.component';

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
  let planetMessageService: { showAlert: ReturnType<typeof vi.fn> };

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
    planetMessageService = { showAlert: vi.fn() };
    component = new TasksComponent(
      tasksService as any as TasksService,
      planetMessageService as any as PlanetMessageService,
      userService as any as UserService,
      { configuration: { code: 'planet-a' } } as any as StateService,
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

  it('separates My Tasks ownership for same-id users on different planets', () => {
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

    expect(component.myTasks.map(task => task._id)).toEqual([ 'local-task' ]);
  });

  it('notifies a same-id assignee from a different planet', () => {
    const task = { _id: 'task-1' };

    component.toggleAssignee(task, {
      userId: 'org.couchdb.user:alex',
      userPlanetCode: 'planet-b',
      name: 'alex',
      userDoc: {}
    });
    expect(notificationsService.sendNotificationToUser).toHaveBeenCalled();
  });

  it('recognizes both membership stamps for an associated current user', () => {
    userService.get.mockReturnValue({
      _id: 'org.couchdb.user:alex',
      planetCode: 'planet-b',
      requestId: 'request-1'
    });
    component.ngOnInit();

    taskUpdates.next([
      { _id: 'origin-task', assignee: { userId: 'org.couchdb.user:alex', userPlanetCode: 'planet-b' } },
      { _id: 'local-task', assignee: { userId: 'org.couchdb.user:alex', userPlanetCode: 'planet-a' } },
      { _id: 'other-task', assignee: { userId: 'org.couchdb.user:alex', userPlanetCode: 'planet-c' } }
    ]);

    expect(component.myTasks.map(task => task._id)).toEqual([ 'origin-task', 'local-task' ]);
  });

  it('suppresses self-notifications for either associated membership stamp', () => {
    userService.get.mockReturnValue({
      _id: 'org.couchdb.user:alex',
      planetCode: 'planet-b',
      sync: true
    });

    component.toggleAssignee({ _id: 'origin-task' }, {
      userId: 'org.couchdb.user:alex', userPlanetCode: 'planet-b', name: 'alex'
    });
    component.toggleAssignee({ _id: 'local-task' }, {
      userId: 'org.couchdb.user:alex', userPlanetCode: 'planet-a', name: 'alex'
    });
    component.toggleAssignee({ _id: 'other-task' }, {
      userId: 'org.couchdb.user:alex', userPlanetCode: 'planet-c', name: 'alex'
    });

    expect(notificationsService.sendNotificationToUser).toHaveBeenCalledTimes(1);
    expect(notificationsService.sendNotificationToUser).toHaveBeenCalledWith(expect.objectContaining({
      userPlanetCode: 'planet-c'
    }));
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

  it('can notify a remote assignee without a local user document', () => {
    component.toggleAssignee({ _id: 'task-1' }, {
      userId: 'org.couchdb.user:other',
      userPlanetCode: 'planet-b',
      name: 'other'
    });

    expect(notificationsService.sendNotificationToUser).toHaveBeenCalled();
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

    component.toggleAssignee({ _id: 'task-1' }, assignee);

    expect(tasksService.addTask).toHaveBeenCalledWith({
      _id: 'task-1',
      assignee: {
        userId: assignee.userId,
        userPlanetCode: assignee.userPlanetCode,
        name: assignee.name,
        userDoc: { fullName: 'Other User' }
      },
      assignees: [ {
        userId: assignee.userId,
        userPlanetCode: assignee.userPlanetCode,
        name: assignee.name,
        userDoc: { fullName: 'Other User' }
      } ]
    });
  });

  it('keeps stored metadata for a planet-less local legacy identity', () => {
    const currentMember = { userId: 'org.couchdb.user:alex', name: 'current' };
    const snapshot = { userId: 'org.couchdb.user:alex', name: 'snapshot' };
    component.assignees = [ currentMember ];
    component.ngOnInit();

    taskUpdates.next([ { _id: 'legacy-task', assignee: snapshot } ]);

    expect(component.taskViews[0].assignee).toBe(snapshot);
  });

  it('deduplicates shelf and membership entries while keeping same-id remote members', () => {
    const shelfEntry = { userId: 'org.couchdb.user:alex', name: 'alex' };
    const localMember = { ...shelfEntry, userPlanetCode: 'planet-a' };
    const remoteMember = { ...shelfEntry, userPlanetCode: 'planet-b' };

    component.assignees = [ shelfEntry, localMember, remoteMember ];

    expect(component.assignees).toEqual([ localMember, remoteMember ]);
  });

  it('drops members with no identity to assign', () => {
    const member = { userId: 'org.couchdb.user:alex', userPlanetCode: 'planet-a', name: 'alex' };

    component.assignees = [ member, { name: 'no id' }, { name: 'also no id' } ];

    expect(component.assignees).toEqual([ member ]);
  });

  it('leaves the cached task untouched and rolls back the view when a save fails', () => {
    const save = new Subject<any>();
    tasksService.addTask.mockReturnValueOnce(save);
    const task = { _id: 'task-1', _rev: '1-a', assignee: '', assignees: [] };
    const member = { userId: 'org.couchdb.user:other', userPlanetCode: 'planet-a', name: 'other' };
    component.tasks = [ task ];
    component.filter = 'all';

    component.toggleAssignee(task, member);
    expect(component.taskViews[0].assignees).toHaveLength(1);
    expect(task.assignees).toEqual([]);

    save.error({ status: 409 });

    expect(task.assignees).toEqual([]);
    expect(task.assignee).toBe('');
    expect(component.taskViews[0].assignees).toEqual([]);
    expect(planetMessageService.showAlert).toHaveBeenCalled();
  });

  it('normalizes an associated account before notifying', () => {
    component.sendNotifications({
      userId: 'org.couchdb.user:alex@planet-b',
      userPlanetCode: 'planet-b',
      name: 'alex@planet-b',
      userDoc: {
        doc: { _id: 'org.couchdb.user:alex@planet-b', name: 'alex@planet-b', planetCode: 'planet-b', requestId: 'req-1' }
      }
    });

    expect(notificationsService.sendNotificationToUser).toHaveBeenCalledWith(expect.objectContaining({
      user: 'org.couchdb.user:alex',
      userPlanetCode: 'planet-b'
    }));
  });

  it('keeps rapid assignee saves in sequence and uses the latest revision', () => {
    const firstSave = new Subject<any>();
    const secondSave = new Subject<any>();
    tasksService.addTask.mockReturnValueOnce(firstSave).mockReturnValueOnce(secondSave);
    const task = { _id: 'task-1', _rev: '1-a', assignee: '', assignees: [] };
    const local = { userId: 'org.couchdb.user:alex', userPlanetCode: 'planet-a', name: 'alex' };
    const remote = { userId: 'org.couchdb.user:other', userPlanetCode: 'planet-b', name: 'other' };

    component.toggleAssignee(task, local);
    component.toggleAssignee(task, remote);
    expect(tasksService.addTask).toHaveBeenCalledTimes(1);

    firstSave.next({ doc: { ...tasksService.addTask.mock.calls[0][0], _rev: '2-b' } });
    expect(tasksService.addTask.mock.calls[1][0]._rev).toBe('2-b');
    expect(tasksService.addTask.mock.calls[1][0].assignees).toHaveLength(2);

    secondSave.next({ doc: { ...tasksService.addTask.mock.calls[1][0], _rev: '3-c' } });
    expect(notificationsService.sendNotificationToUser).toHaveBeenCalledTimes(1);
  });

  it('does not notify an assignee removed again while a save is in flight', () => {
    const firstSave = new Subject<any>();
    const secondSave = new Subject<any>();
    tasksService.addTask.mockReturnValueOnce(firstSave).mockReturnValueOnce(secondSave);
    const task = { _id: 'task-1', _rev: '1-a', assignee: '', assignees: [] };
    const remote = { userId: 'org.couchdb.user:other', userPlanetCode: 'planet-b', name: 'other' };

    component.toggleAssignee(task, remote);
    component.toggleAssignee(task, remote);
    firstSave.next({ doc: { ...tasksService.addTask.mock.calls[0][0], _rev: '2-b' } });
    secondSave.next({ doc: { ...tasksService.addTask.mock.calls[1][0], _rev: '3-c' } });

    expect(notificationsService.sendNotificationToUser).not.toHaveBeenCalled();
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
});

describe('TasksComponent read-only template', () => {
  const assignees = [
    { userId: 'org.couchdb.user:alex', userPlanetCode: 'planet-a', name: 'alex' },
    { userId: 'org.couchdb.user:sam', userPlanetCode: 'planet-b', name: 'sam' }
  ];
  const task = {
    _id: 'task-1',
    title: 'Shared task',
    deadline: Date.now(),
    completed: false,
    assignee: assignees[0],
    assignees
  };
  let dialog: { open: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    dialog = { open: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [ TasksComponent ],
      providers: [
        {
          provide: TasksService,
          useValue: {
            tasksListener: vi.fn().mockReturnValue(of([ task ])),
            sortedTasks: vi.fn((tasks) => tasks),
            getTasks: vi.fn(),
            addTask: vi.fn().mockReturnValue(of({}))
          }
        },
        { provide: PlanetMessageService, useValue: { showAlert: vi.fn() } },
        {
          provide: UserService,
          useValue: { get: vi.fn().mockReturnValue({ _id: assignees[0].userId, planetCode: 'planet-a' }) }
        },
        { provide: StateService, useValue: { configuration: { code: 'planet-a' } } },
        { provide: CouchService, useValue: { datePlaceholder: 0 } },
        { provide: MatDialog, useValue: dialog },
        { provide: UsersProfileDialogService, useValue: { open: vi.fn() } },
        { provide: DialogsFormService, useValue: {} },
        { provide: NotificationsService, useValue: { sendNotificationToUser: vi.fn().mockReturnValue(of({})) } }
      ]
    }).compileComponents();
  });

  it('keeps the multi-assignee dialog available when the task row is read-only', () => {
    const fixture = TestBed.createComponent(TasksComponent);
    fixture.componentInstance.editable = false;
    fixture.componentInstance.link = { teams: 'team-1' };
    fixture.componentInstance.assignees = assignees;
    fixture.detectChanges();

    const row: HTMLElement = fixture.nativeElement.querySelector('.km-task-row');
    const title: HTMLElement = fixture.nativeElement.querySelector('.km-task-title');
    const viewAssignees: HTMLButtonElement = fixture.nativeElement.querySelector('.km-view-assignees');
    expect(row).toBeTruthy();
    expect(title.getAttribute('tabindex')).toBeNull();
    expect(viewAssignees.disabled).toBe(false);

    viewAssignees.click();
    expect(dialog.open).toHaveBeenCalledWith(TasksAssigneesDialogComponent, {
      data: { assignees },
      autoFocus: false
    });
  });
});
