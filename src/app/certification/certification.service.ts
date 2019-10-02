import { Injectable } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { UserService } from '../shared/user.service';
import { Subject, of, forkJoin } from 'rxjs';
import { PlanetMessageService } from '../shared/planet-message.service';
import { MatDialog, MatDialogRef } from '@angular/material';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { CustomValidators } from '../validators/custom-validators';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { finalize, map, switchMap } from 'rxjs/operators';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { StateService } from '../shared/state.service';

@Injectable()
export class CertificationService {

  private meetupUpdated = new Subject<any[]>();
  deleteDialog: MatDialogRef<DialogsPromptComponent>;
  meetupUpdated$ = this.meetupUpdated.asObservable();
  meetups = [];
  userShelf = this.userService.shelf;
  private dbName = 'certifications';

  constructor(
    private dialog: MatDialog,
    private couchService: CouchService,
    private userService: UserService,
    private planetMessageService: PlanetMessageService,
    private dialogsFormService: DialogsFormService,
    private dialogsLoadingService: DialogsLoadingService,
    private stateService: StateService
  ) {}

  getCertificationList() {
    return this.couchService.findAll('certifications');
  }

  openDeleteDialog(certification: any[] | any, callback) {
    const isMany = certification.length > 1;
    const displayName = isMany ? '' : (certification[0] || certification).name;
    this.deleteDialog = this.dialog.open(DialogsPromptComponent, {
      data: {
        okClick: this.deleteCertification([ certification ].flat(), displayName, callback),
        changeType: 'delete',
        type: 'certification',
        amount: isMany ? 'many' : 'single',
        displayName
      }
    });
  }

  deleteCertification(certification: any[], displayName, callback) {
    return {
      request: this.couchService.bulkDocs('certifications', certification.map(m => ({ ...m, _deleted: true }))),
      onNext: (data) => {
        callback(data.res);
        this.deleteDialog.close();
        this.planetMessageService.showMessage(`You have deleted the ${displayName ? `${displayName} certification`
          : 'selected certification'}`);
      },
      onError: (error) => this.planetMessageService.showAlert('There was a problem deleting this certification')
    };
  }

  openAddDialog( certification: any = {}, onSuccess = (res) => {} ) {
    const fields = [
      { placeholder: 'Certification', type: 'textbox', name: 'name' , required: false }
    ];
    const formGroup = this.addDialogFormGroup(certification);
    this.dialogsFormService.openDialogsForm(certification.name ? 'Edit Certification' : 'Add Certification', fields, formGroup, {
      onSubmit: (newCertification) => {
        if (newCertification) {
          this.addDialogSubmit( certification, newCertification, onSuccess );
        }
      },
      autoFocus: true
    });
  }

  addCertification(certification) {
    return this.couchService.updateDocument(this.dbName, {
      ...certification, name: certification.name || ''
    });
  }

  addDialogSubmit( certification: any, newCertification: any, onSuccess ) {
    this.addCertification( { ...certification, ...newCertification } ).pipe(
      finalize(() => this.dialogsLoadingService.stop())
    ).subscribe((res) => {
      onSuccess(res.doc);
      this.dialogsFormService.closeDialogsForm();
    });
  }

  addDialogFormGroup(certification: any = {}) {
    return {
      name: [ certification.name || '' ]
    };
  }

  getCertifications(planetField = 'local') {
    this.stateService.requestData(this.dbName, planetField);
  }

}
