import { Component, Input, OnInit, Pipe, PipeTransform, ViewEncapsulation } from '@angular/core';
import { TasksService } from './tasks.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { environment } from '../../environments/environment';
import { UserService } from '../shared/user.service';

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
  filteredTasks: any[] = [];
  imgUrlPrefix = environment.couchAddress;
  filter = 'self';

  constructor(
    private tasksService: TasksService,
    private planetMessageService: PlanetMessageService,
    private userService: UserService
  ) {}

  ngOnInit() {
    this.tasksService.tasksListener(this.link).subscribe((tasks) => {
      this.tasks = this.tasksService.sortedTasks(tasks, this.tasks);
      this.onTaskFilter();
    });
    this.tasksService.getTasks();
    this.onTaskFilter();
  }

  addTask() {
    this.tasksService.openAddDialog({ link: this.link, sync: this.sync, assignee: '' }, (newTask) => {
      let newTaskIndex = this.tasks.findIndex((task) => new Date(newTask.deadline) < new Date(task.deadline) || task.completed);
      newTaskIndex = newTaskIndex < 0 ? this.tasks.length : newTaskIndex;
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

  onTaskFilter(filterValue = 'self') {
    this.filter = filterValue;
    if (this.filter === 'self') {
      this.filteredTasks = this.tasks.filter(task => task.assignee && task.assignee.userId === this.userService.get()._id);
    } else {
      this.filteredTasks = this.tasks;
    }
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
