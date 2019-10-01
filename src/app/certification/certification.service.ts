import { Injectable } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { UserService } from '../shared/user.service';
import { Subject, of, forkJoin } from 'rxjs';
import { PlanetMessageService } from '../shared/planet-message.service';
import { MatDialog, MatDialogRef } from '@angular/material';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';

@Injectable()
export class CertificationService {

  private meetupUpdated = new Subject<any[]>();
  deleteDialog: MatDialogRef<DialogsPromptComponent>;
  meetupUpdated$ = this.meetupUpdated.asObservable();
  meetups = [];
  userShelf = this.userService.shelf;

  constructor(
    private dialog: MatDialog,
    private couchService: CouchService,
    private userService: UserService,
    private planetMessageService: PlanetMessageService
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
        this.planetMessageService.showMessage(`You have deleted the ${displayName ? `${displayName} certification` : 'selected certification'}`);
      },
      onError: (error) => this.planetMessageService.showAlert('There was a problem deleting this certification')
    };
  }

}
