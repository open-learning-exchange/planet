import { Component, Input, OnChanges } from '@angular/core';
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
export class NewsListComponent implements OnChanges {

  @Input() items: any[] = [];
  @Input() editSuccessMessage = 'News has been updated successfully.';
  @Input() viewableBy = 'community';
  @Input() viewableId: string;
  displayedItems: any[] = [];
  replyObject: any = {};
  replyViewing = 'root';
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

  ngOnChanges() {
    this.replyObject = {};
    this.items.forEach(item => {
      this.replyObject[item.replyTo || 'root'] = [ ...(this.replyObject[item.replyTo || 'root'] || []), item ];
    });
    this.displayedItems = this.replyObject[this.replyViewing];
  }

  addReply(news) {
    this.openUpdateDialog({
      title: 'Reply to Post',
      placeholder: 'Your Story',
      initialValue: ''
    }, { replyTo: news._id, viewableBy: this.viewableBy, viewableId: this.viewableId });
  }

  editNews(news) {
    this.openUpdateDialog({
      title: 'Edit Post',
      placeholder: 'Your Story',
      initialValue: news.message
    }, news);
  }

  showReplies(newsId) {
    this.replyViewing = newsId;
    this.displayedItems = this.replyObject[newsId];
  }

  openUpdateDialog({ title, placeholder, initialValue = '' }, news = {}) {
    const fields = [ {
      'type': 'markdown',
      'name': 'message',
      placeholder,
      'required': true
    } ];
    const formGroup = { message: [ initialValue, CustomValidators.required ] };
    this.dialogsFormService.openDialogsForm(title, fields, formGroup, {
      onSubmit: (response: any) => {
        if (response) {
          this.newsService.postNews({ ...news, ...response }, this.editSuccessMessage).subscribe(() => {
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
