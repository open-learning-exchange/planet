import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogContent, MatDialogActions, MatDialogClose } from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { MatActionList, MatListItem, MatListItemAvatar, MatListItemTitle } from '@angular/material/list';
import { UserProfileDialogComponent } from '../users/users-profile/users-profile-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { environment } from '../../environments/environment';

@Component({
  selector: 'planet-tasks-assignees-dialog',
  template: `
    <h2 mat-dialog-title i18n class="dialog-title">Task Assignees</h2>
    <mat-dialog-content>
      <mat-action-list>
        @for (assignee of data.assignees; track assignee.userId) {
          <button mat-list-item (click)="openMemberDialog(assignee)">
            <img matListItemAvatar [src]="getAvatarUrl(assignee)" alt="{{ assignee.fullName || assignee.name }}">
            <span matListItemTitle>{{ assignee.fullName || assignee.name }}</span>
          </button>
        }
      </mat-action-list>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close i18n>Close</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-title {
      margin: 16px 24px 0;
      font-size: 20px;
      font-weight: 500;
    }
    mat-dialog-content {
      min-width: 280px;
      max-width: 400px;
    }
  `],
  imports: [
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatButton,
    MatActionList,
    MatListItem,
    MatListItemAvatar,
    MatListItemTitle
  ]
})
export class TasksAssigneesDialogComponent {
  imgUrlPrefix = environment.couchAddress;

  constructor(
    public dialogRef: MatDialogRef<TasksAssigneesDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { assignees: any[] },
    private dialog: MatDialog
  ) {}

  openMemberDialog(assignee) {
    this.dialog.open(UserProfileDialogComponent, {
      data: {
        member: {
          name: assignee.name,
          userPlanetCode: assignee.teamPlanetCode || assignee.userPlanetCode
        }
      },
      autoFocus: false
    });
  }

  getAvatarUrl(assignee: any): string {
    if (assignee.attachmentDoc) {
      const imgType = assignee.attachmentDoc._attachments.img ? 'img' : 'img_';
      return `${this.imgUrlPrefix}/attachments/${assignee.attachmentDoc._id}/${imgType}`;
    }
    if (assignee.avatar) {
      return this.imgUrlPrefix + assignee.avatar;
    }
    return 'assets/image.png';
  }
}
