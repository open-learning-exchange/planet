import { Component, Input, OnInit } from '@angular/core';
import { TasksService } from './tasks.service';
import { PlanetMessageService } from '../shared/planet-message.service';


@Component({
  selector: 'planet-tasks',
  templateUrl: './tasks.component.html'
})
export class TasksComponent implements OnInit {

  @Input() link: any;
  tasks: any[] = [];

  constructor(
    private tasksService: TasksService,
    private planetMessageService: PlanetMessageService
  ) {}

  ngOnInit() {
    this.tasksService.getTasks(this.link).subscribe((tasks) => {
      this.tasks = this.sortedTasks(tasks);
    });
  }

  addTask() {
    this.tasksService.openAddDialog({ link: this.link }, (newTask) => {
      let newTaskIndex = this.tasks.findIndex((task) => new Date(newTask.deadline) < new Date(task.deadline) || task.completed);
      newTaskIndex = newTaskIndex < 0 ? this.tasks.length : newTaskIndex;
      this.tasks = [ ...this.tasks.slice(0, newTaskIndex), newTask, ...this.tasks.slice(newTaskIndex, this.tasks.length) ];
      this.planetMessageService.showMessage('New task has been added');
    });
  }

  sortedTasks(tasks) {
    return tasks.sort((a, b) =>
      a.completed > b.completed ?
        1 :
        b.completed > a.completed ?
        -1 :
        new Date(b.deadline) > new Date(a.deadline) ?
        -1 :
        new Date(b.deadline) < new Date(a.deadline) ?
        1 :
        0
    );
  }

  toggleTaskComplete({ option }) {
    const task = option.value;
    this.tasksService.addTask({ ...task, completed: !task.completed }).subscribe((res) => {
      this.tasks = this.tasks.map((t) => t._id === res.doc._id ? res.doc : t);
    });
  }

}
