import { Injectable } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { finalize } from 'rxjs/operators';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { CustomValidators } from '../validators/custom-validators';
import { ValidatorService } from '../validators/validator.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { findDocuments } from '../shared/mangoQueries';

@Injectable({
  providedIn: 'root'
})
export class TasksService {

  private dbName = 'tasks';

  constructor(
    private couchService: CouchService,
    private dialogsFormService: DialogsFormService,
    private dialogsLoadingService: DialogsLoadingService,
    private validatorService: ValidatorService
  ) {}

  getTasks(link = {}) {
    return this.couchService.findAll(this.dbName, findDocuments({ link }));
  }

  openAddDialog(additionalFields, onSuccess) {
    const fields = [
      { placeholder: 'Task', type: 'textbox', name: 'title', required: true },
      { placeholder: 'Deadline', type: 'date', name: 'deadline', required: true },
      { placeholder: 'Description', type: 'markdown', name: 'description', required: false }
    ];
    const formGroup = {
      title: [ '', CustomValidators.required ],
      deadline: [ '', CustomValidators.required, (ac) => this.validatorService.notDateInPast$(ac) ],
      description: ''
    }
    this.dialogsFormService.openDialogsForm('Add Task', fields, formGroup, {
      onSubmit: (task) => {
        if (task) {
          this.addTask({ ...task, ...additionalFields }).pipe(finalize(() => this.dialogsLoadingService.stop())).subscribe((res) => {
            onSuccess({ task, res });
            this.dialogsFormService.closeDialogsForm();
          });
        }
      },
      autoFocus: true
    });
  }

  addTask(task) {
    return this.couchService.updateDocument(this.dbName, { ...task, completed: false })
  }

}
