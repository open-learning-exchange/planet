import { Injectable } from '@angular/core';
import { CouchService } from '../../shared/couchdb.service';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { DialogsPromptComponent } from '../../shared/dialogs/dialogs-prompt.component';

@Injectable({
  providedIn: 'root'
})
export class CertificationsManagerService {

  deleteDialog: MatDialogRef<DialogsPromptComponent>;
  readonly dbName = 'certifications';

  constructor(
    private dialog: MatDialog,
    private couchService: CouchService,
    private planetMessageService: PlanetMessageService
  ) {}

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
        this.planetMessageService.showMessage($localize`You have deleted the ${displayName} certification`);
      },
      onError: (error) => this.planetMessageService.showAlert($localize`There was a problem deleting this certification`)
    };
  }

  addCertification(certification) {
    return this.couchService.updateDocument(this.dbName, { ...certification });
  }

}
