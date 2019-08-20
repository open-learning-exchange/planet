import { Component, Input, OnInit } from '@angular/core';
import { TasksService } from './tasks.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'planet-tasks',
  templateUrl: './tasks.component.html',
  styleUrls: [ './tasks.scss' ]
})
export class TasksComponent implements OnInit {

  @Input() link: any;
  @Input() assignees: any[] = [];
  tasks: any[] = [];
  imgUrlPrefix = environment.couchAddress;

  constructor(
    private tasksService: TasksService,
    private planetMessageService: PlanetMessageService
  ) {}

  ngOnInit() {
    this.tasksService.tasksListener(this.link).subscribe((tasks) => {
      this.tasks = this.tasksService.sortedTasks(tasks, this.tasks);
    });
    this.tasksService.getTasks();
  }

  addTask() {
    this.tasksService.openAddDialog({ link: this.link }, (newTask) => {
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

  addAssignee(task, assignee) {
    const filename = assignee.userDoc._attachments && Object.keys(assignee.userDoc._attachments)[0];
    assignee = { ...assignee, avatar: filename ? `/_users/${assignee.userDoc._id}/${filename}` : undefined };
    this.tasksService.addTask({ ...task, assignee }).subscribe((res) => {
      this.tasksService.getTasks();
    })
  }

  filterAssignee(task) {
    return task.assignee === undefined ? this.assignees : this.assignees.filter(assignees => assignees.userDoc._id !== task.assignee.userDoc._id);
  }
}