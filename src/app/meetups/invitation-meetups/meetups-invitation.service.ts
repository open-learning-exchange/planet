import { Observable } from 'rxjs/Rx';
import { MeetupsInvitationComponent } from './meetups-invitation.component';
import { MatDialogRef, MatDialog, MatDialogConfig } from '@angular/material';
import { Injectable } from '@angular/core';
import { FormBuilder } from '@angular/forms';

@Injectable()
export class MeetupsInvitationService {
  constructor(private dialog?: MatDialog, private fb?: FormBuilder) {}

  public confirm(): Observable<boolean> {
    let dialogRef: MatDialogRef<MeetupsInvitationComponent>;
    dialogRef = this.dialog.open(MeetupsInvitationComponent, {
      width: '600px'
    });
    return dialogRef.afterClosed();
  }

}
