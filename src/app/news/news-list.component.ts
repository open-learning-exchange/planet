import { Component, Input, OnChanges, EventEmitter, Output } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { NewsService } from './news.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { CustomValidators } from '../validators/custom-validators';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { forkJoin } from 'rxjs';
import { CommunityListDialogComponent } from '../community/community-list-dialog.component';
import { dedupeShelfReduce } from '../shared/utils';

@Component({
  selector: 'planet-news-list',
  templateUrl: './news-list.component.html',
  styles: [ `
    mat-divider {
      margin: 1rem 0;
    }
  ` ]
})
export class NewsListComponent implements OnChanges {

  @Input() items: any[] = [];
  @Input() editSuccessMessage = 'News has been updated successfully.';
  @Input() viewableBy = 'community';
  @Input() viewableId: string;
  @Input() editable = true;
  @Input() shareTarget: 'community' | 'nation' | 'center';
  displayedItems: any[] = [];
  replyObject: any = {};
  isMainPostShared = true;
  showMainPostShare = false;
  replyViewing: any = { _id: 'root' };
  deleteDialog: any;
  shareDialog: MatDialogRef<CommunityListDialogComponent>;
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
      this.replyObject[item.doc.replyTo || 'root'] = [ ...(this.replyObject[item.doc.replyTo || 'root'] || []), item ];
    });
    this.displayedItems = this.replyObject[this.replyViewing._id];
    if (this.replyViewing._id !== 'root') {
      this.replyViewing = this.items.find(item => item._id === this.replyViewing._id);
    }
  }

  showReplies(news) {
    this.replyViewing = news;
    this.displayedItems = this.replyObject[news._id];
    this.isMainPostShared = this.replyViewing._id === 'root' || this.newsService.postSharedWithCommunity(this.replyViewing);
    this.showMainPostShare = !this.replyViewing.doc || !this.replyViewing.doc.replyTo ||
      (
        !this.newsService.postSharedWithCommunity(this.replyViewing) &&
        this.newsService.postSharedWithCommunity(this.items.find(item => item._id === this.replyViewing.doc.replyTo))
      );
    this.viewChange.emit(this.replyViewing);
  }

  showPreviousReplies() {
    this.showReplies(this.items.find(item => item._id === this.replyViewing.doc.replyTo));
  }

  openUpdateDialog(
    { title, placeholder, initialValue = '', news = {} }: { title: string, placeholder: string, initialValue?: string, news?: any }
  ) {
    const fields = [ {
      'type': 'markdown',
      'name': 'message',
      placeholder,
      'required': true,
      imageGroup: this.viewableBy !== 'community' ? { [this.viewableBy]: this.viewableId } : this.viewableBy
    } ];
    const formGroup = { message: [ initialValue, CustomValidators.required ] };
    this.dialogsFormService.openDialogsForm(title, fields, formGroup, {
      onSubmit: (newNews: any) => {
        if (newNews) {
          this.postNews({ ...news, viewIn: news.viewIn.filter(view => view._id === this.viewableId) }, newNews);
        }
      },
      autoFocus: true
    });
  }

  postNews(oldNews, newNews) {
    this.newsService.postNews(
      { ...oldNews, ...newNews },
      oldNews._id ? this.editSuccessMessage : 'Reply has been posted successfully.'
    ).subscribe(() => {
      this.dialogsFormService.closeDialogsForm();
      this.dialogsLoadingService.stop();
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
    const isMainStory = this.replyViewing._id === news._id;
    const parentId = isMainStory ? this.replyViewing.doc.replyTo || 'root' : this.replyViewing._id;
    return {
      request: forkJoin([
        this.newsService.deleteNews(news), this.newsService.rearrangeRepliesForDelete(this.replyObject[news._id], parentId)
      ]),
      onNext: (data) => {
        if (isMainStory) {
          this.showReplies({ _id: parentId });
        }
        this.deleteDialog.close();
      },
      onError: (error) => {
        this.planetMessageService.showAlert('There was a problem deleting this news.');
      }
    };
  }

  shareNews({ news, local }: { news: any, local: boolean }) {
    if (local) {
      this.newsService.shareNews(news).subscribe(() => {
        this.isMainPostShared = news._id === this.replyViewing._id ? true : this.isMainPostShared;
      });
    } else {
      const okClick = (planets) =>
        this.newsService.shareNews(news, planets.map(planet => planet.doc)).subscribe(() => this.shareDialog.close());
      this.shareDialog = this.dialog.open(CommunityListDialogComponent, {
        data: {
          okClick,
          excludeIds: (news.viewIn || []).map(shared => shared._id)
        }
      });
    }
  }

  changeLabels({ news, label, action }: { news: any, label: string, action: 'remove' | 'add' }) {
    const labels = action === 'remove' ?
      news.labels.filter(existingLabel => existingLabel !== label) :
      [ ...(news.labels || []), label ].reduce(dedupeShelfReduce, []);
    this.newsService.postNews({ ...news, labels }, `Label ${action === 'remove' ? 'removed' : 'added'}`).subscribe();
  }

  trackById(index, item) {
    return item._id;
  }

}
