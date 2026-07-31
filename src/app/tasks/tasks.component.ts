import { Component, Input, OnInit, Pipe, PipeTransform, ViewEncapsulation, forwardRef } from '@angular/core';
import { of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { TasksService } from './tasks.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { environment } from '../../environments/environment';
import { UserService } from '../shared/user.service';
import { trackById } from '../shared/table-helpers';
import { CouchService } from '../shared/couchdb.service';
import { MatDialog } from '@angular/material/dialog';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DialogsAddMeetupsComponent } from '../shared/dialogs/dialogs-add-meetups.component';
import { UserProfileDialogComponent } from '../users/users-profile/users-profile-dialog.component';
import { NgClass, DatePipe } from '@angular/common';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatButtonToggleGroup, MatButtonToggle } from '@angular/material/button-toggle';
import {
  MatActionList, MatListItem, MatListItemIcon, MatListItemTitle, MatListItemLine, MatListItemAvatar, MatListItemMeta
} from '@angular/material/list';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';

export const assigneeCompare = (assignee1, assignee2, legacyPlanetCode?: string) => {
  const planetCode1 = assignee1?.userPlanetCode || legacyPlanetCode;
  const planetCode2 = assignee2?.userPlanetCode || legacyPlanetCode;
  return !!assignee1?.userId && !!planetCode1 &&
    assignee1.userId === assignee2?.userId && planetCode1 === planetCode2;
};

const assigneeKey = (assignee, legacyPlanetCode?: string) => {
  const userId = assignee?.userId;
  const planetCode = assignee?.userPlanetCode || legacyPlanetCode;
  return userId && planetCode ? `${userId}\u0000${planetCode}` : undefined;
};

@Pipe({ name: 'filterAssignee' })
export class FilterAssigneePipe implements PipeTransform {
  transform(assignees: any[], assignee: any, legacyPlanetCode?: string) {
    return (assignees || []).filter(item => !assigneeCompare(item, assignee, legacyPlanetCode));
  }
}

@Pipe({ name: 'assigneeName' })
export class AssigneeNamePipe implements PipeTransform {
  transform(assignee) {
    return (assignee.userDoc || {}).fullName || assignee.name;
  }
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
    MatActionList,
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
    MatMenuItem,
    DatePipe,
    forwardRef(() => FilterAssigneePipe),
    forwardRef(() => AssigneeNamePipe)
  ]
})
export class TasksComponent implements OnInit {

  @Input() mode: any;
  @Input() link: any;
  @Input() sync: { type: 'local' | 'sync', planetCode: string };
  @Input() editable = true;
  private _assignees: any[] = [];
  private currentAssignees = new Map<string, any>();
  @Input()
  get assignees() {
    return this._assignees;
  }
  set assignees(newAssignees: any[]) {
    this._assignees = [ ...(newAssignees || []) ].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    this.currentAssignees = new Map(this._assignees
      .filter(assignee => assigneeKey(assignee, this.legacyPlanetCode))
      .map(assignee => [ assigneeKey(assignee, this.legacyPlanetCode), assignee ]));
    this.setTaskViews();
    this.filterTasks();
  }
  dbName = 'tasks';
  deleteDialog: any;
  tasks: any[] = [];
  myTasks: any[] = [];
  filteredTasks: any[] = [];
  taskViews: any[] = [];
  filteredTaskViews: any[] = [];
  imgUrlPrefix = environment.couchAddress;
  filter: 'self' | 'all' = 'self';
  trackById = trackById;

  get legacyPlanetCode() {
    return this.sync?.planetCode || this.userService.get().planetCode;
  }

  constructor(
    private tasksService: TasksService,
    private planetMessageService: PlanetMessageService,
    private userService: UserService,
    private couchService: CouchService,
    private dialog: MatDialog,
    private dialogsFormService: DialogsFormService,
    private notificationsService: NotificationsService
  ) {}

  ngOnInit() {
    this.tasksService.tasksListener(this.link).subscribe((tasks) => {
      this.tasks = this.tasksService.sortedTasks(tasks, this.tasks);
      this.setTaskViews();
      const user = this.userService.get();
      const currentUser = { userId: user._id, userPlanetCode: user.planetCode };
      this.myTasks = this.tasks.filter(task => assigneeCompare(task.assignee, currentUser, this.legacyPlanetCode));
      this.filter = this.myTasks.length === 0 ? 'all' : this.filter;
      this.filterTasks();
    });
    this.tasksService.getTasks();
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

  addAssignee(task, assignee: any = '') {
    const hasAssignee = assignee !== '';
    const storedAssignee = hasAssignee ? {
      userId: assignee.userId,
      userPlanetCode: assignee.userPlanetCode || this.legacyPlanetCode,
      name: assignee.name,
      avatar: assignee.avatar,
      attachmentDoc: assignee.attachmentDoc,
      userDoc: assignee.userDoc?.fullName ? { fullName: assignee.userDoc.fullName } : undefined
    } : '';
    const user = this.userService.get();
    const currentUser = { userId: user._id, userPlanetCode: user.planetCode };
    this.tasksService.addTask({ ...task, assignee: storedAssignee }).pipe(
      switchMap(() => hasAssignee && assignee.userDoc && !assigneeCompare(assignee, currentUser, this.legacyPlanetCode) ?
        this.sendNotifications(assignee) :
        of({}))
    ).subscribe((res) => {
      this.tasksService.getTasks();
    });
  }

  setFilter(newFilter: 'self' | 'all') {
    this.filter = newFilter;
    this.filterTasks();
  }

  filterTasks() {
    this.filteredTasks = this.filter === 'self' ? this.myTasks : this.tasks;
    const filteredTaskIds = new Set(this.filteredTasks.map(task => task._id));
    this.filteredTaskViews = this.taskViews.filter(({ task }) => filteredTaskIds.has(task._id));
  }

  sendNotifications(assignee: any = '') {
    const link = this.mode === 'services' ? 'community' : `/${this.mode}s/view/${this.link.teams}`;
    const notificationDoc = {
      user: assignee.userId,
      'message': $localize`You were assigned a new task`,
      link,
      linkParams: { activeTab: 'taskTab' },
      'type': 'newTask',
      'priority': 1,
      'status': 'unread',
      'time': this.couchService.datePlaceholder,
      userPlanetCode: assignee.userPlanetCode
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
    this.dialog.open(UserProfileDialogComponent,
      {
        data: { member: { name: assignee.name, userPlanetCode: assignee.userPlanetCode || this.legacyPlanetCode } },
        autoFocus: false
      });
  }

  getAssignTooltip(task: any): string {
    return task.assignee ? $localize`Reassign Task` : $localize`Assign Task`;
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
    taskView.avatarSrc = 'assets/image.png';
  }

  private setTaskViews() {
    this.taskViews = this.tasks.map(task => {
      const key = assigneeKey(task.assignee, this.legacyPlanetCode);
      const currentAssignee = key && this.currentAssignees.get(key);
      const hasResolvedMetadata = currentAssignee && (
        currentAssignee.userDoc ||
        currentAssignee.attachmentDoc
      );
      const assignee = hasResolvedMetadata ? currentAssignee : task.assignee || currentAssignee;
      return {
        task,
        assignee,
        avatarSrc: assignee ? this.avatarSrc(assignee) : undefined
      };
    });
  }

}
