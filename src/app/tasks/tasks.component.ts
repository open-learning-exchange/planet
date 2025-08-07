import { Component, Input, OnInit, Pipe, PipeTransform, ViewEncapsulation } from '@angular/core';
import { of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { TasksService } from './tasks.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { environment } from '../../environments/environment';
import { UserService } from '../shared/user.service';
import { trackById } from '../shared/table-helpers';
import { CouchService } from '../shared/couchdb.service';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DialogsAddMeetupsComponent } from '../shared/dialogs/dialogs-add-meetups.component';
import { UserProfileDialogComponent } from '../users/users-profile/users-profile-dialog.component';

@Component({
  selector: 'planet-tasks',
  templateUrl: './tasks.component.html',
  styleUrls: [ './tasks.scss' ],
  encapsulation: ViewEncapsulation.None
})
export class TasksComponent implements OnInit {

  @Input() mode: any;
  @Input() link: any;
  @Input() sync: { type: 'local' | 'sync', planetCode: string };
  @Input() editable = true;
  private _assigness: any[];
  @Input()
  get assignees() {
    return this._assigness;
  }
  set assignees(newAssignees: any[]) {
    this._assigness = [ ...newAssignees ].sort((a, b) => a.name.localeCompare(b.name));
  }
  dbName = 'tasks';
  deleteDialog: any;
  tasks: any[] = [];
  myTasks: any[] = [];
  filteredTasks: any[] = [];
  imgUrlPrefix = environment.couchAddress;
  filter: 'self' | 'all' = 'self';
  trackById = trackById;

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
      this.myTasks = this.tasks.filter(task => task.assignee && task.assignee.userId === this.userService.get()._id);
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
    if (!task || task.completed || !task.deadline) { return false; }

    const now = new Date();
    const deadline = new Date(task.deadline);
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const isWithinNextDay = deadline <= twentyFourHoursFromNow && deadline > now;

    return isWithinNextDay;
  }

  isTaskOverdue(task): boolean {
    if (task.completed || !task.deadline) { return false; }

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
    const hasAssignee = assignee !== '' && assignee.userDoc;
    if (hasAssignee) {
      const filename = assignee.userDoc._attachments && Object.keys(assignee.userDoc._attachments)[0];
      assignee = { ...assignee, avatar: filename ? `/_users/${assignee.userDoc._id}/${filename}` : undefined };
    }
    this.tasksService.addTask({ ...task, assignee }).pipe(
      switchMap(() => hasAssignee && assignee.userId !== this.userService.get()._id ? this.sendNotifications(assignee) : of({}))
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
  }

  sendNotifications(assignee: any = '') {
    const link = this.mode === 'services' ? `community` : `/${this.mode}s/view/${this.link.teams}`;
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
      { data: { member: { name: assignee.name, userPlanetCode: assignee.teamPlanetCode } }, autoFocus: false });
  }

}

@Pipe({
  name: 'filterAssignee'
})
export class FilterAssigneePipe implements PipeTransform {
  transform(assignees: any[], assignee: any) {
    return assignees.filter(a => a.userId !== assignee.userId);
  }
}

@Pipe({
  name: 'assigneeName'
})
export class AssigneeNamePipe implements PipeTransform {
  transform(assignee) {
    return (assignee.userDoc || {}).fullName || assignee.name;
  }
}
