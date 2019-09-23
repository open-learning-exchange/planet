import { Injectable } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { finalize, map, switchMap } from 'rxjs/operators';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { CustomValidators } from '../validators/custom-validators';
import { ValidatorService } from '../validators/validator.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { StateService } from '../shared/state.service';
import { Subject, of } from 'rxjs';
import { addDateAndTime, getClockTime } from '../shared/utils';

@Injectable({
  providedIn: 'root'
})
export class TasksService {

  private dbName = 'tasks';
  private tasksUpdated = new Subject<any>();

  constructor(
    private couchService: CouchService,
    private dialogsFormService: DialogsFormService,
    private dialogsLoadingService: DialogsLoadingService,
    private validatorService: ValidatorService,
    private stateService: StateService
  ) {
    this.stateService.couchStateListener(this.dbName).subscribe(res => {
      if (res) {
        this.tasksUpdated.next(res);
      }
    });
  }

  archiveTask(task) {
    return () => this.updateTask({ ...task, status: 'archived' });
  }

  updateTask(task: any) {
    return this.couchService.updateDocument(this.dbName, task).pipe(switchMap((res: any) => {
      return of({ ...task, _rev: res.rev, _id: res.id });
    }));
  }

  getTasks(planetField = 'local') {
    this.stateService.requestData(this.dbName, planetField);
  }

  tasksListener(link = {}, planetField = 'local') {
    return this.tasksUpdated.pipe(map((res: any) => res.planetField === planetField ?
      res.newData.filter(task =>
        task.link &&
        Object.entries(task.link).every(([ key, value ]) => value === link[key]) &&
        task.status !== 'archived'
      ) :
      []
    ));
  }

  openAddDialog(additionalFields, task: any = {}, onSuccess = (res) => {}) {
    const fields = [
      { placeholder: 'Task', type: 'textbox', name: 'title', required: true },
      { placeholder: 'Deadline', type: 'date', name: 'deadline', required: true },
      { placeholder: 'Deadline Time', type: 'time', name: 'deadlineTime', required: true },
      { placeholder: 'Description', type: 'markdown', name: 'description', required: false }
    ];
    const formGroup = {
      title: [ task.title || '', CustomValidators.required ],
      deadline: [
        new Date(new Date(task.deadline).setHours(0, 0, 0)) || '',
        CustomValidators.dateValidRequired, (ac) => this.validatorService.notDateInPast$(ac)
      ],
      deadlineTime: [ getClockTime(new Date(task.deadline)) || '09:00', CustomValidators.dateValidRequired ],
      description: task.description || ''
    };
    this.dialogsFormService.openDialogsForm(task.title ? 'Edit Task' : 'Add Task', fields, formGroup, {
      onSubmit: (newTask) => {
        if (newTask) {
          const deadline = new Date(addDateAndTime(new Date(newTask.deadline).getTime(), newTask.deadlineTime)).getTime();
          this.addTask({ assignee: '', ...task, ...newTask, deadline, ...additionalFields, deadlineTime: undefined }).pipe(
            finalize(() => this.dialogsLoadingService.stop())
          ).subscribe((res) => {
            onSuccess(res.doc);
            this.dialogsFormService.closeDialogsForm();
          });
        }
      },
      autoFocus: true
    });
  }

  addTask(task) {
    return this.couchService.updateDocument(this.dbName, { ...task, completed: task.completed || false });
  }

  sortedTasks(tasks, tasksInOrder = []) {
    const compare = (a, b) => a > b ?
      1 :
      a < b ?
      -1 :
      false;
    return tasks.sort((a, b) =>
      compare(tasksInOrder.findIndex(t => t._id === a._id), tasksInOrder.findIndex(t => t._id === b._id)) ||
      compare(a.completed, b.completed) ||
      compare(new Date(a.deadline), new Date(b.deadline)) ||
      0
    );
  }

}
