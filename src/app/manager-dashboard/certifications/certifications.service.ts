import { Injectable } from '@angular/core';
import { CouchService } from '../../shared/couchdb.service';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { MatDialog, MatDialogRef } from '@angular/material';
import { DialogsPromptComponent } from '../../shared/dialogs/dialogs-prompt.component';
import { CustomValidators } from '../../validators/custom-validators';
import { DialogsFormService } from '../../shared/dialogs/dialogs-form.service';
import { finalize, } from 'rxjs/operators';
import { DialogsLoadingService } from '../../shared/dialogs/dialogs-loading.service';
import { ValidatorService } from '../../validators/validator.service';

@Injectable({
  providedIn: 'root'
})
export class CertificationsService {

  deleteDialog: MatDialogRef<DialogsPromptComponent>;
  readonly dbName = 'certifications';

  constructor(
    private dialog: MatDialog,
    private couchService: CouchService,
    private planetMessageService: PlanetMessageService,
    private dialogsFormService: DialogsFormService,
    private dialogsLoadingService: DialogsLoadingService,
    private validatorService: ValidatorService
  ) {}

  getCertifications() {
    return this.couchService.findAll(this.dbName);
  }

  getCertification(id: string) {
    return this.couchService.get(`${this.dbName}/${id}`);
  }

  openDeleteDialog(certification: any, callback) {
    const displayName = certification.name;
    this.deleteDialog = this.dialog.open(DialogsPromptComponent, {
      data: {
        okClick: this.deleteCertification([ certification ].flat(), displayName, callback),
        changeType: 'delete',
        type: 'certification',
        displayName
      }
    });
  }

  deleteCertification(certifications: any[], displayName, callback) {
    return {
      request: this.couchService.bulkDocs(this.dbName, certifications.map(m => ({ ...m, _deleted: true }))),
      onNext: (data) => {
        callback(data.res);
        this.deleteDialog.close();
        this.planetMessageService.showMessage(`You have deleted the ${displayName} certification`);
      },
      onError: (error) => this.planetMessageService.showAlert('There was a problem deleting this certification')
    };
  }

  openAddDialog(certification: any = {}, onSuccess = (res) => {}) {
    const fields = [
      { placeholder: 'Certification', type: 'textbox', name: 'name' , required: true }
    ];
    const formGroup = this.addDialogFormGroup(certification);
    this.dialogsFormService.openDialogsForm(certification.name ? 'Edit Certification' : 'Add Certification', fields, formGroup, {
      onSubmit: (newCertification) => {
        if (newCertification) {
          this.addDialogSubmit(certification, newCertification, onSuccess);
        }
      },
      autoFocus: true
    });
  }

  addCertification(certification) {
    return this.couchService.updateDocument(this.dbName, { ...certification });
  }

  addDialogSubmit(certification: any, newCertification: any, onSuccess) {
    this.addCertification({ ...certification, ...newCertification }).pipe(
      finalize(() => this.dialogsLoadingService.stop())
    ).subscribe((res) => {
      onSuccess(res.doc);
      this.dialogsFormService.closeDialogsForm();
    });
  }

  addDialogFormGroup(certification: any = {}) {
    return {
      name: [ certification.name || '', CustomValidators.required, this.nameValidator(certification.name || '' ) ]
    };
  }

  nameValidator(exception = '') {
    return ac => this.validatorService.isUnique$(this.dbName, 'name', ac, { exceptions: [ exception ] });
  }

}
