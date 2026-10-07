import { Component, Inject, ViewEncapsulation } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogTitle } from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { MatActionList, MatListItem } from '@angular/material/list';
import { AvatarComponent } from '@shared/ui/avatar.component';
import { UsersProfileDialogService } from '../users/users-profile/users-profile-dialog.service';
import { assigneeName } from './tasks.utils';

@Component({
  selector: 'planet-tasks-assignees-dialog',
  template: `
    <h2 mat-dialog-title i18n>Task Assignees</h2>
    <mat-dialog-content class="task-assignees-dialog-content">
      <mat-action-list>
        @for (assignee of data.assignees; track $index) {
          <button mat-list-item (click)="openMemberDialog(assignee)">
            <span class="task-assignee-row-content">
              <planet-avatar class="task-assignee-avatar" aria-hidden="true" [username]="assignee.name"
                [planetCode]="assignee.userPlanetCode"></planet-avatar>
              <span class="task-assignee-name">{{assigneeName(assignee)}}</span>
            </span>
          </button>
        }
      </mat-action-list>
    </mat-dialog-content>
    <mat-dialog-actions align="end"><button mat-raised-button color="primary" mat-dialog-close i18n>OK</button></mat-dialog-actions>
  `,
  styleUrls: ['./tasks.scss'],
  encapsulation: ViewEncapsulation.None,
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatButton,
    MatActionList,
    MatListItem,
    AvatarComponent
  ]
})
export class TasksAssigneesDialogComponent {
  assigneeName = assigneeName;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { assignees: any[] },
    private usersProfileDialogService: UsersProfileDialogService
  ) {}

  openMemberDialog(assignee) {
    this.usersProfileDialogService.open({
      member: { name: assignee.name, userPlanetCode: assignee.userPlanetCode }
    });
  }
}
