import { Component, Input, OnInit, Pipe, PipeTransform, ViewEncapsulation } from '@angular/core';
import { TasksService } from './tasks.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { environment } from '../../environments/environment';
import { UserService } from '../shared/user.service';
import { trackById } from '../shared/table-helpers';

@Component({
  selector: 'planet-tasks',
  templateUrl: './tasks.component.html',
  styleUrls: [ './tasks.scss' ],
  encapsulation: ViewEncapsulation.None
})
export class TasksComponent implements OnInit {

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
    private userService: UserService
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

  addTask() {
    this.tasksService.openAddDialog({ link: this.link, sync: this.sync, assignee: '' }, () => {
      this.tasksService.getTasks();
      this.planetMessageService.showMessage('New task has been added');
    });
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
    if (assignee !== '' && assignee.userDoc) {
      const filename = assignee.userDoc._attachments && Object.keys(assignee.userDoc._attachments)[0];
      assignee = { ...assignee, avatar: filename ? `/_users/${assignee.userDoc._id}/${filename}` : undefined };
    }
    this.tasksService.addTask({ ...task, assignee }).subscribe((res) => {
      this.tasksService.getTasks();
    });
  }
  // task.assignee.attachmentDoc ?
  // imgUrlPrefix + '/attachments/' + task.assignee.attachmentDoc._id + '/' + (task.assignee.attachmentDoc._attachments.img ? 'img' : 'img_') :
  // task.assignee.avatar ?
  // imgUrlPrefix + task.assignee.avatar :
  // 'assets/image.png'

  // const src => {
  //   if (task.assignee.attachmentDoc) {
  //     imgUrlPrefix + '/attachments/' + task.assignee.attachmentDoc._id + '/' + (task.assignee.attachmentDoc._attachments.img ? 'img' : 'img_');
  //   }
  //   if (task.assignee.avatar) {
  //    imgUrlPrefix + task.assignee.avatar;
  //   }
  //   return 'assets/image.png';
  // };


  // const filename = item.user._attachments && Object.keys(item.user._attachments)[0];
  // return { ...item, avatar: filename ? this.imgUrlPrefix + item.user._id + '/' + filename : 'assets/image.png' };

  // return this.teamsService.getTeamMembers(this.team, true).pipe(switchMap((docs: any[]) => {
  //   const src = (member) => {
  //     const { attachmentDoc, userId, userPlanetCode, userDoc } = member;
  //     if (member.attachmentDoc) {
  //       return `${environment.couchAddress}/attachments/${userId}@${userPlanetCode}/${Object.keys(attachmentDoc._attachments)[0]}`;
  //     }
  //     if (member.userDoc && member.userDoc._attachments) {
  //       return `${environment.couchAddress}/_users/${userId}/${Object.keys(userDoc._attachments)[0]}`;
  //     }
  //     return 'assets/image.png';
  //   };


  // const docsWithName = docs.map(mem => ({ ...mem, name: mem.userId && mem.userId.split(':')[1], avatar: src(mem) }));
  // "
  //     task.assignee.attachmentDoc ?
  //       imgUrlPrefix + '/attachments/' + task.assignee.attachmentDoc._id + '/' + (task.assignee.attachmentDoc._attachments.img ? 'img' : 'img_') :
  //       task.assignee.avatar ?
  //       imgUrlPrefix + task.assignee.avatar :
  //       'assets/image.png'
  //   "


  // const src = (member) => {
  //   const { attachmentDoc, userId, userPlanetCode, userDoc } = member;
  //   if (task.assignee.attachmentDoc) {
  //     return `${environment.couchAddress}/attachments/${userId}@${userPlanetCode}/${Object.keys(attachmentDoc._attachments)[0]}`;
  //   }
  //   if (task.assignee.avatar) {
  //     imgUrlPrefix + task.assignee.avatar;
  //   }
  //   return 'assets/image.png';
  // };
  // task.assignee.attachmentDoc ?
  // imgUrlPrefix + '/attachments/' + task.assignee.attachmentDoc._id + '/' + (task.assignee.attachmentDoc._attachments.img ? 'img' : 'img_') :
  // task.assignee.avatar ?
  // imgUrlPrefix + task.assignee.avatar :
  // 'assets/image.png'

  setFilter(newFilter: 'self' | 'all') {
    this.filter = newFilter;
    this.filterTasks();
  }

  filterTasks() {
    this.filteredTasks = this.filter === 'self' ? this.myTasks : this.tasks;
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
