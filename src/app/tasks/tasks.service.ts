import { Injectable } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { finalize, map, switchMap } from 'rxjs/operators';
import { CustomValidators } from '../validators/custom-validators';
import { ValidatorService } from '../validators/validator.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { StateService } from '../shared/state.service';
import { Subject } from 'rxjs';
import { addDateAndTime, getClockTime } from '../shared/utils';
import { findDocuments } from '../shared/mangoQueries';

@Injectable({
  providedIn: 'root'
})
export class TasksService {

  private dbName = 'tasks';
  private tasksUpdated = new Subject<any>();

  constructor(
    private couchService: CouchService,
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
    return () => this.addTask({ ...task, status: 'archived' });
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

  addDialogSubmit(additionalFields, task: any, newTask: any, onSuccess) {
    const deadline = new Date(addDateAndTime(new Date(newTask.deadline).getTime(), newTask.deadlineTime)).getTime();
    this.addTask({ assignee: '', ...task, ...newTask, deadline, ...additionalFields, deadlineTime: undefined }).pipe(
      finalize(() => this.dialogsLoadingService.stop())
    ).subscribe((res) => {
      onSuccess(res.doc);
    });
  }

  addDialogForm(task: any = {}) {
    const { deadline, deadlineTime } = task.deadline ?
      { deadline: new Date(new Date(task.deadline).setHours(0, 0, 0)), deadlineTime: getClockTime(new Date(task.deadline)) } :
      { deadline: '', deadlineTime: '09:00' };
    return {
      fields: [
        { placeholder: $localize`Task`, type: 'textbox', name: 'title', required: true },
        { placeholder: $localize`Deadline`, type: 'date', name: 'deadline', required: true },
        { placeholder: $localize`Deadline Time`, type: 'time', name: 'deadlineTime', required: true },
        { placeholder: $localize`Description`, type: 'markdown', name: 'description', required: false }
      ],
      formGroup: {
        title: [ task.title || '', CustomValidators.required ],
        deadline: task.title ? [
          deadline,
          CustomValidators.dateValidRequired
        ] : [
          deadline,
          CustomValidators.dateValidRequired,
          (ac) => this.validatorService.notDateInPast$(ac)
        ],
        deadlineTime: [ deadlineTime, CustomValidators.dateValidRequired ],
        description: task.description || ''
      }
    };
  }

  addTask(task) {
    return this.couchService.updateDocument(this.dbName, {
      ...task,
      completed: task.completed || false,
      completedTime: task.completed ? (task.completedTime || this.couchService.datePlaceholder) : undefined
    }).pipe(
      map(res => {
        this.getTasks();
        return res;
      })
    );
  }

  sortedTasks(tasks, tasksInOrder = []) {
    const compare = (a, b) => a > b ?
      1 :
      a < b ?
      -1 :
      false;
    return tasks.sort((a, b) =>
      compare(new Date(a.deadline), new Date(b.deadline)) ||
      compare(a.completed, b.completed) ||
      compare(tasksInOrder.findIndex(t => t._id === a._id), tasksInOrder.findIndex(t => t._id === b._id)) ||
      0
    );
  }

  removeAssigneeFromTasks(userId: any, link?: any) {
    return this.couchService.findAll(this.dbName, findDocuments({ 'assignee.userId': userId, link })).pipe(
      switchMap((docs: any[]) => this.couchService.bulkDocs(this.dbName, docs.map(doc => ({ ...doc, assignee: '' })))),
      map(() => this.getTasks())
    );
  }

}
