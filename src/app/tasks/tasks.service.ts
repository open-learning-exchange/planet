import { Injectable } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { finalize, map } from 'rxjs/operators';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { CustomValidators } from '../validators/custom-validators';
import { ValidatorService } from '../validators/validator.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { findDocuments } from '../shared/mangoQueries';
import { StateService } from '../shared/state.service';
import { Subject } from 'rxjs';

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
      { placeholder: 'Description', type: 'markdown', name: 'description', required: false }
    ];
    const formGroup = {
      title: [ '', CustomValidators.required ],
      deadline: [ '', CustomValidators.dateValidRequired, (ac) => this.validatorService.notDateInPast$(ac) ],
      description: ''
    };
    this.dialogsFormService.openDialogsForm('Add Task', fields, formGroup, {
      onSubmit: (task) => {
        if (task) {
          this.addTask({ ...task, ...additionalFields }).pipe(finalize(() => this.dialogsLoadingService.stop())).subscribe((res) => {
            onSuccess(res.doc);
            this.dialogsFormService.closeDialogsForm();
          });
        }
      },
      autoFocus: true
    });
  }

  addTask(task) {
    if(task.completed) {
      return this.couchService.updateDocument(this.dbName, { ...task, completed: task.completed || false, completedTime: this.couchService.datePlaceholder });
    }
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
