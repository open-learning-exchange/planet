import { Component, Input, OnInit, Pipe, PipeTransform, ViewEncapsulation } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TasksService } from './tasks.service';
import { TasksAssigneesDialogComponent } from './tasks-assignees-dialog.component';
import { PlanetMessageService } from '@shared/ui/planet-message.service';
import { environment } from '../../environments/environment';
import { UserService } from '@shared/auth/user.service';
import { trackById } from '@shared/tables/table.helpers';
import { CouchService } from '@shared/database/couchdb.service';
import { MatDialog } from '@angular/material/dialog';
import { DialogsPromptComponent } from '@shared/dialogs/dialogs-prompt.component';
import { DialogsFormService } from '@shared/dialogs/dialogs-form.service';
import { NotificationsService, notificationRecipient } from '../notifications/notifications.service';
import { DialogsAddMeetupsComponent } from '@shared/dialogs/pickers/dialogs-add-meetups.component';
import { UsersProfileDialogService } from '../users/users-profile/users-profile-dialog.service';
import { StateService } from '@shared/state.service';
import {
  assigneeIdentityCandidates, assigneeKey, assigneeMatches, assigneeName, effectiveAssignees, storedAssignee
} from './tasks.utils';
import { NgClass, DatePipe } from '@angular/common';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatButtonToggleGroup, MatButtonToggle } from '@angular/material/button-toggle';
import {
  MatList, MatListItem, MatListItemIcon, MatListItemTitle, MatListItemLine, MatListItemAvatar, MatListItemMeta
} from '@angular/material/list';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { MatMenuTrigger, MatMenu, MatMenuContent, MatMenuItem } from '@angular/material/menu';

@Pipe({ name: 'assigneeName' })
export class AssigneeNamePipe implements PipeTransform {
  transform(assignee) {
    return assigneeName(assignee);
  }
}

interface AssigneeUpdateState {
  task: any;
  assignees: any[];
  saving: boolean;
  dirty: boolean;
  pendingNotifications: Map<string, any>;
}


@Component({
  selector: 'planet-tasks',
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.scss'],
  encapsulation: ViewEncapsulation.None,
  imports: [
    MatButton,
    MatButtonToggleGroup,
    MatButtonToggle,
    MatList,
    MatListItem,
    MatCheckbox,
    MatListItemIcon,
    MatListItemTitle,
    MatListItemLine,
    NgClass,
    MatListItemAvatar,
    MatTooltip,
    MatListItemMeta,
    MatIconButton,
    MatIcon,
    MatMenuTrigger,
    MatMenu,
    MatMenuContent,
    MatMenuItem,
    DatePipe,
    AssigneeNamePipe
  ]
})
export class TasksComponent implements OnInit {

  @Input() mode: any;
  @Input() link: any;
  @Input() sync: { type: 'local' | 'sync', planetCode: string };
  @Input() editable = true;
  @Input()
  get assignees() {
    return this.assigneesList;
  }
  set assignees(newAssignees: any[]) {
    const uniqueAssignees = new Map<string, any>();
    (newAssignees || []).forEach(assignee => {
      // Without a userId there is no identity to store, notify or match on, so the entry cannot be
      // assigned at all — listing it would only let one member's toggle select all of them.
      const key = assigneeKey(assignee, this.localPlanetCode);
      if (!key) {
        return;
      }
      const current = uniqueAssignees.get(key);
      if (!current || (!current.userPlanetCode && assignee.userPlanetCode)) {
        uniqueAssignees.set(key, assignee);
      }
    });
    this.assigneesList = [ ...uniqueAssignees.values() ].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    this.setCurrentAssignees();
    this.setTaskViews();
    this.filterTasks();
  }
  dbName = 'tasks';
  deleteDialog: any;
  tasks: any[] = [];
  myTasks: any[] = [];
  taskViews: any[] = [];
  filteredTaskViews: any[] = [];
  imgUrlPrefix = environment.couchAddress;
  filter: 'self' | 'all' = 'self';
  trackById = trackById;
  private assigneesList: any[] = [];
  private currentAssignees = new Map<string, any>();
  private failedAvatarSources = new Map<string, string>();
  private assigneeUpdates = new Map<string, AssigneeUpdateState>();

  constructor(
    private tasksService: TasksService,
    private planetMessageService: PlanetMessageService,
    private userService: UserService,
    private stateService: StateService,
    private couchService: CouchService,
    private dialog: MatDialog,
    private usersProfileDialogService: UsersProfileDialogService,
    private dialogsFormService: DialogsFormService,
    private notificationsService: NotificationsService
  ) {}

  ngOnInit() {
    this.tasksService.tasksListener(this.link).subscribe((tasks) => {
      this.tasks = this.tasksService.sortedTasks(tasks, this.tasks);
      this.setMyTasks();
      this.filter = this.myTasks.length === 0 ? 'all' : this.filter;
      this.setTaskViews();
      this.filterTasks();
    });
    this.tasksService.getTasks();
  }

  private setCurrentAssignees() {
    this.currentAssignees = new Map(this.assigneesList
      .map(assignee => [ assigneeKey(assignee, this.localPlanetCode), assignee ] as [ string, any ])
      .filter(([ key ]) => key));
  }

  addTask(task?) {
    this.openAddDialog({ link: this.link, sync: this.sync }, task, () => {
      this.tasksService.getTasks();
      const msg = task ? $localize`Task updated successfully` : $localize`Task created successfully`;
      this.planetMessageService.showMessage(msg);
      this.dialogsFormService.closeDialogsForm();
    });
  }

  isTaskDueSoon(task): boolean {
    if (!task || task.completed || !task.deadline) {
      return false;
    }

    const now = new Date();
    const deadline = new Date(task.deadline);
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const isWithinNextDay = deadline <= twentyFourHoursFromNow && deadline > now;

    return isWithinNextDay;
  }

  isTaskOverdue(task): boolean {
    if (task.completed || !task.deadline) {
      return false;
    }

    const now = new Date();
    const deadline = new Date(task.deadline);
    return deadline < now;
  }

  openAddDialog(additionalFields, task: any = {}, onSuccess = (res) => {}) {
    const { fields, formGroup } = this.tasksService.addDialogForm(task);
    this.dialogsFormService.openDialogsForm(task.title ? $localize`Edit Task` : $localize`Add Task`, fields, formGroup, {
      onSubmit: (newTask) => {
        if (newTask) {
          this.tasksService.addDialogSubmit(additionalFields, task, newTask, onSuccess.bind(this));
        }
      },
      autoFocus: true
    });
  }

  archiveClick(task) {
    this.deleteDialog = this.dialog.open(DialogsPromptComponent, {
      data: {
        okClick: this.archiveTask(task),
        changeType: 'delete',
        type: 'task',
        displayName: task.title
      }
    });
  }

  archiveTask(task) {
    return {
      request: this.tasksService.archiveTask(task)(),
      onNext: () => {
        this.deleteDialog.close();
        this.planetMessageService.showMessage($localize`You have deleted a task.`);
        this.removeTaskFromTable();
      },
      onError: () => this.planetMessageService.showAlert($localize`There was a problem deleting this team.`)
    };
  }

  removeTaskFromTable() {
    this.tasksService.getTasks();
  }

  toggleTaskComplete(task) {
    this.tasksService.addTask({ ...task, completed: !task.completed }).subscribe((res) => {
      this.tasksService.getTasks();
    });
  }

  openAssigneeMenu(event) {
    event.stopPropagation();
  }

  toggleAssignee(task, assignee) {
    const taskId = task._id;
    const state = this.assigneeUpdates.get(taskId) || {
      task,
      assignees: effectiveAssignees(task).map(item => storedAssignee(item, this.localPlanetCode)),
      saving: false,
      dirty: false,
      pendingNotifications: new Map<string, any>()
    };
    this.assigneeUpdates.set(taskId, state);

    const index = state.assignees.findIndex(item => assigneeMatches(item, assignee, this.localPlanetCode));
    const key = assigneeKey(assignee, this.localPlanetCode);
    if (index > -1) {
      state.assignees.splice(index, 1);
      state.pendingNotifications.delete(key);
    } else {
      state.assignees.push(storedAssignee(assignee, this.localPlanetCode));
      if (!this.currentUserIdentities().some(identity => assigneeMatches(
        assignee, identity, this.localPlanetCode
      ))) {
        state.pendingNotifications.set(key, assignee);
      }
    }

    state.dirty = true;
    this.refreshTaskViews();
    if (!state.saving) {
      this.saveAssigneeUpdate(taskId, state);
    }
  }

  private saveAssigneeUpdate(taskId: string, state: AssigneeUpdateState) {
    const assignees = [ ...state.assignees ];
    const updatedTask = { ...state.task, assignee: assignees[0] || '', assignees };
    state.saving = true;
    state.dirty = false;
    this.tasksService.addTask(updatedTask).subscribe({
      next: res => {
        state.task = res?.doc || updatedTask;
        state.saving = false;
        if (state.dirty) {
          this.saveAssigneeUpdate(taskId, state);
        } else {
          this.sendPendingNotifications(state);
          this.replaceTask(state.task);
          this.assigneeUpdates.delete(taskId);
          this.refreshTaskViews();
        }
      },
      error: () => {
        this.assigneeUpdates.delete(taskId);
        this.refreshTaskViews();
        this.tasksService.getTasks();
        this.planetMessageService.showAlert($localize`There was a problem updating the task assignees.`);
      }
    });
  }

  // The saved doc carries the new revision and assignees, so swap it in rather than waiting for the
  // tasks refresh — the next toggle would otherwise post a stale _rev.
  private replaceTask(task: any) {
    const index = this.tasks.findIndex(({ _id }) => _id === task?._id);
    if (index > -1) {
      this.tasks[index] = task;
    }
  }

  private refreshTaskViews() {
    this.setMyTasks();
    this.setTaskViews();
    this.filterTasks();
  }

  private setMyTasks() {
    const identities = this.currentUserIdentities();
    this.myTasks = this.tasks.filter(task =>
      this.taskAssignees(task).some(assignee => identities.some(identity =>
        assigneeMatches(assignee, identity, this.localPlanetCode)
      ))
    );
  }

  private currentUserIdentities() {
    return assigneeIdentityCandidates(this.userService.get(), this.localPlanetCode);
  }

  private sendPendingNotifications(state: AssigneeUpdateState) {
    if (state.pendingNotifications.size > 0) {
      forkJoin([ ...state.pendingNotifications.values() ].map(assignee => this.sendNotifications(assignee)))
        .pipe(catchError(() => of([])))
        .subscribe();
      state.pendingNotifications.clear();
    }
  }

  setFilter(newFilter: 'self' | 'all') {
    this.filter = newFilter;
    this.filterTasks();
  }

  filterTasks() {
    const filteredTasks = this.filter === 'self' ? this.myTasks : this.tasks;
    const filteredTaskIds = new Set(filteredTasks.map(task => task._id));
    this.filteredTaskViews = this.taskViews.filter(({ task }) => filteredTaskIds.has(task._id));
  }

  sendNotifications(assignee: any = '') {
    const link = this.mode === 'services' ? 'community' : `/${this.mode}s/view/${this.link.teams}`;
    const notificationDoc = {
      // Associated accounts store their id with an @planetCode suffix the recipient's filter does not use.
      ...notificationRecipient(assignee.userDoc?.doc || assignee, assignee.userPlanetCode),
      message: $localize`You were assigned a new task`,
      link,
      linkParams: { activeTab: 'taskTab' },
      type: 'newTask',
      priority: 1,
      status: 'unread',
      time: this.couchService.datePlaceholder
    };
    return this.notificationsService.sendNotificationToUser(notificationDoc);
  }

  openTaskDetail(task) {
    this.dialog.open(DialogsAddMeetupsComponent, {
      data: {
        meetup: task,
        view: 'view',
        link: this.link,
        sync: this.sync,
        editable: false
      }
    });
  }

  openMemberDialog(assignee) {
    this.usersProfileDialogService.open({ member: { name: assignee.name, userPlanetCode: assignee.userPlanetCode } });
  }

  getAssignTooltip(task: any): string {
    return this.taskAssignees(task).length > 0 ? $localize`Reassign Task` : $localize`Assign Task`;
  }

  isAssigneeSelected(task, assignee): boolean {
    return this.taskAssignees(task).some(item => assigneeMatches(item, assignee, this.localPlanetCode));
  }

  openAssigneesPopup(assignees: any[]) {
    this.dialog.open(TasksAssigneesDialogComponent, {
      data: { assignees },
      autoFocus: false
    });
  }

  assigneeTrackKey(assignee): string {
    return assigneeKey(assignee, this.localPlanetCode);
  }

  openTaskDetailFromKeyboard(event: KeyboardEvent, task: any) {
    if (this.editable && event.target === event.currentTarget) {
      event.preventDefault();
      this.openTaskDetail(task);
    }
  }

  avatarSrc(assignee) {
    const attachmentName = Object.keys(assignee?.attachmentDoc?._attachments || {})[0];
    if (attachmentName) {
      return `${this.imgUrlPrefix}/attachments/${assignee.attachmentDoc._id}/${attachmentName}`;
    }
    if (!assignee?.avatar) {
      return 'assets/image.png';
    }
    return assignee.avatar.startsWith('/') ? this.imgUrlPrefix + assignee.avatar : assignee.avatar;
  }

  useDefaultAvatar(taskView) {
    const failureKey = this.avatarFailureKey(taskView.task, taskView.assignee);
    if (failureKey && taskView.avatarSrc && taskView.avatarSrc !== 'assets/image.png') {
      this.failedAvatarSources.set(failureKey, taskView.avatarSrc);
    }
    taskView.avatarSrc = 'assets/image.png';
  }

  private setTaskViews() {
    this.taskViews = this.tasks.map(task => {
      const assignees = this.taskAssignees(task).map(item => this.currentAssigneeMetadata(item));
      const assignee = assignees[0];
      const avatarSrc = assignee ? this.avatarSrc(assignee) : undefined;
      const failureKey = this.avatarFailureKey(task, assignee);
      const failedAvatarSrc = failureKey && this.failedAvatarSources.get(failureKey);
      if (failureKey && failedAvatarSrc && failedAvatarSrc !== avatarSrc) {
        this.failedAvatarSources.delete(failureKey);
      }
      return {
        task,
        assignees,
        assignee,
        avatarSrc: failedAvatarSrc === avatarSrc ? 'assets/image.png' : avatarSrc
      };
    });
  }

  private avatarFailureKey(task, assignee) {
    return assigneeKey(assignee, this.localPlanetCode) || task?._id;
  }

  // An assignment being saved is not on the task document yet, so the pending list wins until it lands.
  private taskAssignees(task: any): any[] {
    return this.assigneeUpdates.get(task?._id)?.assignees || effectiveAssignees(task);
  }

  private currentAssigneeMetadata(assignee) {
    const currentAssignee = this.currentAssignees.get(assigneeKey(assignee, this.localPlanetCode));
    return currentAssignee?.userDoc || currentAssignee?.attachmentDoc ? currentAssignee : assignee;
  }

  private get localPlanetCode(): string | undefined {
    return this.stateService.configuration?.code;
  }

}
