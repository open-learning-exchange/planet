import { Component, Input, OnInit, OnChanges, EventEmitter, Output, AfterViewInit, ViewChild, OnDestroy } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { NewsService } from './news.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { CustomValidators } from '../validators/custom-validators';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { CommunityListDialogComponent } from '../community/community-list-dialog.component';
import { dedupeShelfReduce } from '../shared/utils';

@Component({
  selector: 'planet-news-list',
  templateUrl: './news-list.component.html',
  styleUrls: [ './news-list.component.scss' ],
})
export class NewsListComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {

  @Input() items: any[] = [];
  @Input() editSuccessMessage = $localize`Message updated successfully.`;
  @Input() viewableBy = 'community';
  @Input() viewableId: string;
  @Input() editable = true;
  @Input() shareTarget: 'community' | 'nation' | 'center';
  @ViewChild('anchor', { static: true }) anchor: any;
  observer: IntersectionObserver;
  displayedItems: any[] = [];
  replyObject: any = {};
  isMainPostShared = true;
  showMainPostShare = false;
  replyViewing: any = { _id: 'root' };
  deleteDialog: any;
  shareDialog: MatDialogRef<CommunityListDialogComponent>;
  @Output() viewChange = new EventEmitter<any>();
  isLoadingMore = false;
  hasMoreNews = false;
  pageSize = 10;
  nextStartIndex = 0;
  // Key value store for max number of posts viewed per conversation
  pageEnd = { root: 10 };

  constructor(
    private dialog: MatDialog,
    private dialogsFormService: DialogsFormService,
    private dialogsLoadingService: DialogsLoadingService,
    private newsService: NewsService,
    private planetMessageService: PlanetMessageService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    const childRoute = this.route.firstChild;
    if (childRoute) {
      const voiceId = childRoute.snapshot.paramMap.get('id');
      if (voiceId) {
        const news = this.items.find(item => item._id === voiceId);
        if (news) {
          this.showReplies(news);
        }
      }
    }
  }

  ngOnChanges() {
    let isLatest = true;
    this.replyObject = {};
    this.items.forEach(item => {
      this.replyObject[item.doc.replyTo || 'root'] = [ ...(this.replyObject[item.doc.replyTo || 'root'] || []), item ];
      if (!item.doc.replyTo && isLatest) {
        item.latestMessage = true;
        isLatest = false;
      }
    });
    this.displayedItems = this.replyObject[this.replyViewing._id];
    this.loadPagedItems(true);
    if (this.replyViewing._id !== 'root') {
      this.replyViewing = this.items.find(item => item._id === this.replyViewing._id);
    }
  }

  ngAfterViewInit() {
    this.observer = new IntersectionObserver(
      ([ entry ]) => {
        if (entry.isIntersecting && this.hasMoreNews && !this.isLoadingMore) {
          this.loadMoreItems();
        }
      },
      { root: null, rootMargin: '0px', threshold: 1.0 }
    );

    this.observer.observe(this.anchor.nativeElement);
  }

  ngOnDestroy() {
    this.observer.disconnect();
  }

  showReplies(news) {
    this.replyViewing = news;
    this.displayedItems = this.replyObject[news._id];
    this.loadPagedItems(true);
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
    const formGroup = { message: [ initialValue, CustomValidators.requiredMarkdown ] };
    this.dialogsFormService.openDialogsForm(title, fields, formGroup, {
      onSubmit: (newNews: any) => {
        if (newNews) {
          this.postNews(
            { ...news, viewIn: news.viewIn.filter(view => view._id === this.viewableId).map(({ sharedDate, ...viewIn }) => viewIn) },
            newNews
          );
        }
      },
      autoFocus: true
    });
  }

  postNews(oldNews, newNews) {
    this.newsService.postNews(
      { ...oldNews, ...newNews },
      oldNews._id ? this.editSuccessMessage : $localize`Reply has been posted successfully.`
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
        type: 'news',
        displayName: news.chat ? news.news.conversations[0].response : news.message
      }
    });
  }

  deleteNews(news) {
    const isMainStory = this.replyViewing._id === news._id;
    const parentId = isMainStory ? this.replyViewing.doc.replyTo || 'root' : this.replyViewing._id;
    const deleteFromAllViews = this.viewableBy === 'teams';
    return {
      request: forkJoin([
        this.newsService.deleteNews(
          news,
          this.viewableId,
          deleteFromAllViews),
          this.newsService.rearrangeRepliesForDelete(this.replyObject[news._id], parentId
        )
      ]),
      onNext: (data) => {
        if (isMainStory) {
          this.showReplies({ _id: parentId });
        }
        this.deleteDialog.close();
      },
      onError: (error) => {
        this.planetMessageService.showAlert($localize`There was a problem deleting this message.`);
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
    this.newsService.postNews({ ...news, labels }, $localize`Label ${action === 'remove' ? 'removed' : 'added'}`).subscribe();
  }

  trackById(index, item) {
    return item._id;
  }

  getCurrentItems(): any[] {
    if (this.replyViewing._id === 'root') {
      return this.items.filter(item => !item.doc.replyTo);
    }
    return this.replyObject[this.replyViewing._id] || [];
  }

  paginateItems(list: any[], start: number, size: number) {
    const end = start + size;
    const page = list.slice(start, end);
    return {
      items: page,
      endIndex: start + page.length,
      hasMore: end < list.length
    };
  }

  loadPagedItems(initial = true) {
    let pageSize = this.pageSize;
    if (initial) {
      this.displayedItems = [];
      this.nextStartIndex = 0;
      // Take maximum so if fewer posts than page size adding a post doesn't add a "Load More" button
      pageSize = Math.max(this.pageEnd[this.replyViewing._id] || this.pageSize, this.pageSize);
    }
    const news = this.getCurrentItems();
    const { items, endIndex, hasMore } = this.paginateItems(news, this.nextStartIndex, pageSize);

    this.displayedItems = [ ...this.displayedItems, ...items ];
    this.pageEnd[this.replyViewing._id] = this.displayedItems.length;
    this.nextStartIndex = endIndex;
    this.hasMoreNews = hasMore;
    this.isLoadingMore = false;
  }

  loadMoreItems() {
    this.isLoadingMore = true;
    this.loadPagedItems(false);
  }
}
