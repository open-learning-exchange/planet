import { Component, Input, OnChanges, EventEmitter, Output } from '@angular/core';
import { MatDialog } from '@angular/material';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { NewsService } from './news.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { CustomValidators } from '../validators/custom-validators';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'planet-news-list',
  templateUrl: './news-list.component.html',
  styleUrls: ['./news-list.scss']
})
export class NewsListComponent implements OnChanges {

  @Input() items: any[] = [];
  @Input() editSuccessMessage = 'News has been updated successfully.';
  @Input() viewableBy = 'community';
  @Input() viewableId: string;
  displayedItems: any[] = [];
  replyObject: any = {};
  replyViewing: any = { _id: 'root' };
  deleteDialog: any;
  @Output() viewChange = new EventEmitter<any>();

  constructor(
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
    this.displayedItems = this.replyObject[this.replyViewing._id];
  }

  showReplies(news) {
    this.replyViewing = news;
    this.displayedItems = this.replyObject[news._id];
    this.viewChange.emit(this.replyViewing);
  }

  showPreviousReplies() {
    this.showReplies(this.items.find(item => item._id === this.replyViewing.replyTo));
  }

  openUpdateDialog({ title, placeholder, initialValue = '', news = {} }) {
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
          this.newsService.postNews(
            { ...news, ...response, viewableBy: this.viewableBy, viewableId: this.viewableId }, this.editSuccessMessage
          ).subscribe(() => {
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
      request: forkJoin([
        this.newsService.deleteNews(news), this.newsService.rearrangeRepliesForDelete(this.replyObject[news._id], this.replyViewing._id)
      ]),
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
