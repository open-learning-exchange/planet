import { Injectable } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { finalize, map, switchMap } from 'rxjs/operators';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { CustomValidators } from '../validators/custom-validators';
import { ValidatorService } from '../validators/validator.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { StateService } from '../shared/state.service';
import { Subject, of } from 'rxjs';
import { addDateAndTime } from '../shared/utils';

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
      res.newData.filter(task => task.link && Object.entries(task.link).every(([ key, value ]) => value === link[key])) :
      []
    ));
  }

  openAddDialog(additionalFields, onSuccess) {
    const fields = [
      { placeholder: 'Task', type: 'textbox', name: 'title', required: true },
      { placeholder: 'Deadline', type: 'date', name: 'deadline', required: true },
      { placeholder: 'Deadline Time', type: 'time', name: 'deadlineTime', required: true },
      { placeholder: 'Description', type: 'markdown', name: 'description', required: false }
    ];
    const formGroup = {
      title: [ '', CustomValidators.required ],
      deadline: [ '', CustomValidators.dateValidRequired, (ac) => this.validatorService.notDateInPast$(ac) ],
      deadlineTime: [ '09:00', CustomValidators.dateValidRequired ],
      description: ''
    };
    this.dialogsFormService.openDialogsForm('Add Task', fields, formGroup, {
      onSubmit: (task) => {
        if (task) {
          const deadline = new Date(addDateAndTime(new Date(task.deadline).getTime(), task.deadlineTime)).getTime();
          this.addTask({ ...task, deadline, ...additionalFields, deadlineTime: undefined }).pipe(
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
