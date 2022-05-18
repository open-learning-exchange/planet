import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { finalize } from 'rxjs/operators';
import { NewsService } from '../../news/news.service';
import { CustomValidators } from '../../validators/custom-validators';
import { UserService } from '../user.service';
import { DialogsFormService } from './dialogs-form.service';
import { DialogsLoadingService } from './dialogs-loading.service';

@Component({
  templateUrl: './dialogs-comment.component.html',
  styles: [ `
    .comment-btn-group {
      width: 42%;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
  ` ]
})
export class DialogsCommentComponent {
  report: any = {};
  comments: any[];
  currentUser = this.userService.get();
  team: any;

  constructor(
    public dialogRef: MatDialogRef<DialogsCommentComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogsFormService: DialogsFormService,
    private newsService: NewsService,
    private dialogsLoadingService: DialogsLoadingService,
    private userService: UserService,
  ) {
    this.comments = this.data.comments;
    this.team = this.data.team;
    this.report = this.data.report;
  }

  closeDialog(): void {
    this.dialogRef.close();
  }

  addComment() {
    const message = '';
    this.dialogsFormService.openDialogsForm(
        'Add Comment',
        [ { name: 'message', placeholder: 'Comment', type: 'markdown', required: true, imageGroup: { teams: this.report.teamId } } ],
        { message: [ message, CustomValidators.requiredMarkdown ] },
        { autoFocus: true, onSubmit: this.postMessage.bind(this) },
      );
  }

  postMessage(message) {
    this.newsService.postNews({
      viewIn: [ { '_id': this.team._id, section: 'teams', public: this.team.userStatus !== 'member' } ],
      reportId: this.report._id,
      teamId: this.team._id,
      messageType: this.team.teamType,
      viewedBy: [ this.currentUser._id ],
      messagePlanetCode: this.team.teamPlanetCode,
      ...message
    }, 'Comment has been posted successfully', 'report-notes').pipe(
      // switchMap(() => this.sendNotifications('message')),
      finalize(() => this.dialogsLoadingService.stop())
    ).subscribe(() => {
      this.dialogsFormService.closeDialogsForm();
      this.dialogRef.close();
    });
  }

}
