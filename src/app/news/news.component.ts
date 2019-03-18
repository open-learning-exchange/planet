import { Component, OnInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { StateService } from '../shared/state.service';
import { UserService } from '../shared/user.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { debug } from '../debug-operator';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { MatDialog } from '@angular/material';
import { CustomValidators } from '../validators/custom-validators';
import { findDocuments } from '../shared/mangoQueries';
import { environment } from '../../environments/environment';

@Component({
  templateUrl: './news.component.html',
  styleUrls: [ './news.scss' ]
})
export class NewsComponent implements OnInit {
  private dbName = 'news';
  configuration = this.stateService.configuration;
  newsItems: any[] = [];
  imgUrlPrefix = environment.couchAddress + '/' + '_users' + '/';
  newMessage = '';
  currentUser: any;
  message = '';
  deleteDialog: any;

  constructor(
    private couchService: CouchService,
    private stateService: StateService,
    private userService: UserService,
    private dialog: MatDialog,
    private dialogsFormService: DialogsFormService,
    private planetMessageService: PlanetMessageService
  ) {}

  ngOnInit() {
    this.currentUser = this.userService.get();
    this.getMessages();
  }

  getMessages() {
    this.couchService.findAll(this.dbName, findDocuments({ createdOn: this.configuration.code }, 0, [ { 'time': 'desc' } ]))
    .subscribe(newsItems => {
      this.newsItems = newsItems.map((item: any) => {
        const filename = item.user._attachments && Object.keys(item.user._attachments)[0];
        return { ...item, avatar: filename ? this.imgUrlPrefix + item.user._id + '/' + filename : 'assets/image.png' };
      });
    });
  }

  postMessage() {
    this.postNews({
      message: this.newMessage,
      time: this.couchService.datePlaceholder,
      createdOn: this.configuration.code,
      parentCode: this.configuration.parentCode,
      user: this.userService.get(),
      viewableBy: 'community'
    });
  }

  postNews(data) {
    this.couchService.updateDocument(this.dbName, data).subscribe(() => {
      this.planetMessageService.showMessage('Thank you for submitting your news');
      this.newMessage = '';
      this.getMessages();
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
    // Reset the message when the dialog closes
    this.deleteDialog.afterClosed().pipe(debug('Closing dialog')).subscribe(() => {
      this.message = '';
    });
  }

  deleteNews(news) {
    // Return a function with news on its scope to pass to delete dialog
    return () => {
      const { _id: newsId, _rev: newsRev } = news;
      this.couchService.delete('news/' + newsId + '?rev=' + newsRev)
        .subscribe((data) => {
          // It's safer to remove the item from the array based on its id than to splice based on the index
          this.newsItems = this.newsItems.filter((n: any) => data.id !== n._id);
          this.deleteDialog.close();
          this.planetMessageService.showMessage('News deleted');
        }, (error) => this.deleteDialog.componentInstance.message = 'There was a problem deleting this news.');
    };
  }

  editNews(news) {
    const title = 'News';
    const fields = [ {
      'type': 'textarea',
      'name': 'message',
      'placeholder': 'Your Story',
      'required': true
    } ];
    const formGroup = {
      message: [ news.message, CustomValidators.required ]
    };
    this.dialogsFormService.confirm(title, fields, formGroup)
      .pipe(debug('Dialog confirm'))
      .subscribe((response: any) => {
        if (response !== undefined) {
          this.postNews({ ...news, ...response });
        }
      });
  }
}
