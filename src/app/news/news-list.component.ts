import { Component, Input } from '@angular/core';
import { MatDialog } from '@angular/material';
import { UserService } from '../shared/user.service';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { NewsService } from './news.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { CustomValidators } from '../validators/custom-validators';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';

@Component({
  selector: 'planet-news-list',
  templateUrl: './news-list.component.html',
  styles: [ `
    :host mat-card {
      margin: 0.25rem;
    }
  ` ]
})
export class NewsListComponent {

  @Input() items: any[] = [];
  @Input() editSuccessMessage: string = 'News has been updated successfully.';
  currentUser = this.userService.get();
  deleteDialog: any;

  constructor(
    private userService: UserService,
    private dialog: MatDialog,
    private dialogsFormService: DialogsFormService,
    private dialogsLoadingService: DialogsLoadingService,
    private newsService: NewsService,
    private planetMessageService: PlanetMessageService
  ) {}

  editNews(news) {
    const title = 'Edit Post';
    const fields = [ {
      'type': 'markdown',
      'name': 'message',
      'placeholder': 'Your Story',
      'required': true
    } ];
    const formGroup = {
      message: [ news.message, CustomValidators.required ]
    };
    this.dialogsFormService.openDialogsForm(title, fields, formGroup, {
      onSubmit: (response: any) => {
        if (response) {
          this.newsService.postNews({ ...news, ...response }, this.editSuccessMessage ).subscribe(() => {
            this.dialogsFormService.closeDialogsForm();
            this.dialogsLoadingService.stop();
          });
        }
      },
      autoFocus: true
    });
  }

  openDeleteDialog(news) {
    this.deleteDialog = this.dialog.open(DialogsPromptComponent, {
      data: {
        okClick: this.deleteNews(news),
        changeType: 'delete',
        type: 'news'
      }
    });
  }

  deleteNews(news) {
    return {
      request: this.newsService.deleteNews(news),
      onNext: (data) => {
        // It's safer to remove the item from the array based on its id than to splice based on the index
        this.deleteDialog.close();
      },
      onError: (error) => {
        this.planetMessageService.showAlert('There was a problem deleting this news.');
      }
    };
  }

}
