import { Component, Input, OnInit, Pipe, PipeTransform, ViewEncapsulation } from '@angular/core';
import { of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { TasksService } from './tasks.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { environment } from '../../environments/environment';
import { UserService } from '../shared/user.service';
import { trackById } from '../shared/table-helpers';
import { CouchService } from '../shared/couchdb.service';
import { findDocuments } from '../shared/mangoQueries';
import { MatDialog } from '@angular/material';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';

@Component({
  selector: 'planet-tasks',
  templateUrl: './tasks.component.html',
  styleUrls: [ './tasks.scss' ],
  encapsulation: ViewEncapsulation.None
})
export class TasksComponent implements OnInit {

  deleteDialog: any;
  @Input() link: any;
  @Input() sync: { type: 'local' | 'sync', planetCode: string };
  private _assigness: any[];
  @Input()
  get assignees() {
    return this._assigness;
  }
  set assignees(newAssignees: any[]) {
    this._assigness = [ ...newAssignees ].sort((a, b) => a.name.localeCompare(b.name));
  }
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
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.tasksService.tasksListener(this.link).subscribe((tasks) => {
      this.tasks = this.tasksService.sortedTasks(tasks, this.tasks);
      this.tasks = this.tasks.filter(t => t.status !== 'archived');
      this.myTasks = this.tasks.filter(task => task.assignee && task.assignee.userId === this.userService.get()._id);
      this.filter = this.myTasks.length === 0 ? 'all' : this.filter;
      this.filterTasks();
    });
    this.tasksService.getTasks();
  }

  addTask(task?) {
    this.tasksService.openAddDialog({ link: this.link, sync: this.sync, assignee: '' }, () => {
      this.tasksService.getTasks();
      const msg = task ? 'Task updated successfully' : 'Task created successfully';
      this.planetMessageService.showMessage(msg);
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
        this.planetMessageService.showMessage('You have deleted a task.');
        this.removeTaskFromTable(task);
      },
      onError: () => this.planetMessageService.showAlert('There was a problem deleting this team.')
    };
  }

  removeTaskFromTable(newTask: any) {
    this.tasks = this.tasks.filter(t => t.status !== 'archived');
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
    const link = `/teams/view/${this.link.teams}`;
    const notificationDoc = {
      user: assignee.userId,
      'message': 'You were assigned a new task',
      link,
      linkParams: { task: true },
      'type': 'newTask',
      'priority': 1,
      'status': 'unread',
      'time': this.couchService.datePlaceholder,
      userPlanetCode: assignee.userPlanetCode
    };
    return this.couchService.findAll(
      'notifications',
      findDocuments({ link, type: 'newTask', status: 'unread', user: assignee.userId })
    ).pipe(
      switchMap((res: any[]) => res.length === 0 ? this.couchService.updateDocument('notifications', notificationDoc) : of({}))
    );
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
