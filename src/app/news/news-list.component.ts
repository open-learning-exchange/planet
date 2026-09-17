import {
  Component, Input, OnInit, OnChanges, EventEmitter, Output, AfterViewInit, ViewChild, OnDestroy, SimpleChanges
} from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of, Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { NewsService } from './news.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { CustomValidators } from '../validators/custom-validators';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { CommunityListDialogComponent } from '../community/community-list-dialog.component';
import { DialogGuardService } from '../shared/dialogs/dialog-guard.service';
import { trackById } from '../shared/table-helpers';
import { dedupeVoiceLabels, normalizeVoiceLabel, SHARED_CHAT_LABEL, voiceLabelsEqual } from '../shared/voice-labels';

import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButton, MatIconButton } from '@angular/material/button';
import { NewsListItemComponent } from './news-list-item.component';
import { MatDivider } from '@angular/material/list';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatPaginator } from '@angular/material/paginator';
import { MatToolbar } from '@angular/material/toolbar';
import { MatFormField, MatLabel, MatPrefix, MatSuffix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatIcon } from '@angular/material/icon';
import { MatSelect, MatSelectTrigger } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { MatTooltip } from '@angular/material/tooltip';
import { LabelComponent } from '../shared/label.component';

@Component({
  selector: 'planet-news-list',
  templateUrl: './news-list.component.html',
  styleUrls: ['./news-list.component.scss'],
  imports: [
    MatButton,
    NewsListItemComponent,
    MatDivider,
    MatProgressSpinner,
    MatPaginator,
    NgClass,
    FormsModule,
    MatToolbar,
    MatFormField,
    MatLabel,
    MatPrefix,
    MatSuffix,
    MatInput,
    MatIcon,
    MatIconButton,
    MatSelect,
    MatSelectTrigger,
    MatOption,
    MatTooltip,
    LabelComponent
  ]
})
export class NewsListComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {

  @Input() items: any[] = [];
  @Input() editSuccessMessage = $localize`Message updated successfully.`;
  @Input() viewableBy = 'community';
  @Input() viewableId: string;
  @Input() editable = true;
  @Input() readOnly = false;
  @Input() shareTarget: 'community' | 'nation' | 'center';
  @Input() useReplyRoutes = false;
  @Input() customLabels: string[] = [];
  @Output() viewChange = new EventEmitter<any>();
  @ViewChild('anchor', { static: false }) anchor: any;
  observer: IntersectionObserver;
  displayedItems: any[] = [];
  filteredItems: any[] = [];
  messageSearch = '';
  messageSearch$ = new Subject<string>();
  availableLabels: string[] = [];
  selectedLabel = '';
  pinned = false;
  private viewLabelNames = new Set<string>();
  private itemsById = new Map<string, any>();
  private searchSubscription: Subscription;
  replyObject: any = {};
  isMainPostShared = true;
  showMainPostShare = false;
  replyViewing: any = { _id: 'root' };
  deleteDialog: any;
  shareDialog: MatDialogRef<CommunityListDialogComponent> | null = null;
  isLoadingMore = false;
  hasMoreNews = false;
  pageSize = 10;
  nextStartIndex = 0;
  totalReplies = 0;
  // Key value store for max number of posts viewed per conversation
  pageEnd = { root: 10 };
  // store the last opened thread's root post id
  lastRootPostId: string;
  trackById = trackById;
  // Pagination for main posts
  pageIndex = 0;
  pageSizeOptions = [ 5, 10, 25, 50 ];
  totalItems = 0;
  private routerEventsSubscription: Subscription;

  get isTeamsFeed(): boolean {
    return this.viewableBy === 'teams';
  }

  get searchLabel(): string {
    return this.isTeamsFeed ? $localize`Search messages` : $localize`Search voice`;
  }

  get clearSearchLabel(): string {
    return this.isTeamsFeed ? $localize`Clear message search` : $localize`Clear voice search`;
  }

  get pinTooltip(): string {
    if (this.isTeamsFeed) {
      return this.pinned ? $localize`Unpin Messages Toolbar` : $localize`Pin Messages Toolbar`;
    }
    return this.pinned ? $localize`Unpin Voices Toolbar` : $localize`Pin Voices Toolbar`;
  }

  get emptyStateLabel(): string {
    if (this.selectedLabel || this.messageSearch) {
      return this.isTeamsFeed ? $localize`No messages match your filters.` : $localize`No Voices match your filters.`;
    }
    return this.isTeamsFeed ? $localize`No messages available.` : $localize`No Voices available.`;
  }

  constructor(
    private dialog: MatDialog,
    private dialogsFormService: DialogsFormService,
    private dialogsLoadingService: DialogsLoadingService,
    private newsService: NewsService,
    private planetMessageService: PlanetMessageService,
    private dialogGuard: DialogGuardService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.routerEventsSubscription = this.router.events.subscribe(() => {
      this.initNews();
    });
    this.searchSubscription = this.messageSearch$.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(searchValue => {
      this.messageSearch = searchValue;
      this.applyFilters();
    });

    this.initNews();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.viewableId && !changes.viewableId.firstChange) {
      this.resetFilters();
    }
    this.itemsById = new Map<string, any>(this.items.map(item => [ item._id, item ]));
    this.availableLabels = this.getAvailableLabels(this.items);
    this.applyFilters();
  }

  applyFilters() {
    if (!this.selectedLabel && !this.messageSearch) {
      this.filteredItems = this.items;
    } else {
      const search = this.messageSearch.toLowerCase();
      const rootIds = new Map<string, string>(this.items.map(item => [ item._id, this.getThreadRootId(item) ]));
      const matchedRoots = new Set<string>(
        this.items.filter(item => this.itemMatchesFilters(item, search)).map(item => rootIds.get(item._id))
      );
      this.filteredItems = this.items.filter(item => matchedRoots.has(rootIds.get(item._id)));
    }
    this.groupReplies();
  }

  private resetFilters() {
    this.messageSearch = '';
    this.selectedLabel = '';
    // cancels a keystroke still inside the debounce window
    this.messageSearch$.next('');
  }

  private itemMatchesFilters(item: any, search: string): boolean {
    const matchesLabel = !this.selectedLabel ||
      (item.doc.labels || []).some(label => voiceLabelsEqual(label, this.selectedLabel)) ||
      (item.doc.viewIn || []).some(view => view.name && voiceLabelsEqual(view.name, this.selectedLabel)) ||
      (voiceLabelsEqual(this.selectedLabel, SHARED_CHAT_LABEL) && item.doc.chat === true);
    return matchesLabel && (item.doc.message || '').toLowerCase().includes(search);
  }

  private groupReplies() {
    let isLatest = true;
    this.replyObject = {};
    this.items.forEach(item => {
      item.latestMessage = false;
    });
    this.filteredItems.forEach(item => {
      const key = item.doc.replyTo || 'root';
      if (!this.replyObject[key]) {
        this.replyObject[key] = [];
      }
      this.replyObject[key].push(item);
      if (!item.doc.replyTo && isLatest) {
        item.latestMessage = true;
        isLatest = false;
      }
    });
    this.displayedItems = this.replyObject[this.replyViewing._id];
    this.loadPagedItems(true);
    if (this.replyViewing._id !== 'root') {
      this.replyViewing = this.filteredItems.find(item => item._id === this.replyViewing._id) || { _id: 'root' };
      if (this.replyViewing._id === 'root') {
        this.displayedItems = this.replyObject.root || [];
        this.loadPagedItems(true);
        this.viewChange.emit(this.replyViewing);
        if (this.useReplyRoutes) {
          this.navigateToReply('root');
        }
      }
    }
  }

  ngAfterViewInit() {
    this.setupObserver();
  }

  ngOnDestroy() {
    this.routerEventsSubscription?.unsubscribe();
    this.searchSubscription?.unsubscribe();
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  setupObserver() {
    if (this.observer) {
      this.observer.disconnect();
    }

    if (this.anchor?.nativeElement) {
      this.observer = new IntersectionObserver(
        ([ entry ]) => {
          if (entry.isIntersecting && this.hasMoreNews && !this.isLoadingMore && this.replyViewing._id !== 'root') {
            this.loadMoreItems();
          }
        },
        { root: null, rootMargin: '0px', threshold: 1.0 }
      );
      this.observer.observe(this.anchor.nativeElement);
    }
  }

  initNews() {
    const newVoiceId = this.route.firstChild?.snapshot.paramMap.get('id') || 'root';
    this.filterNewsToShow(newVoiceId);
  }

  showReplies(news) {
    // remember the conversation’s true root post, even from deep threads
    if (news._id !== 'root') {
      this.lastRootPostId = this.getThreadRootId(news);
    }
    if (this.useReplyRoutes) {
      this.navigateToReply(news._id);
      return;
    }
    this.filterNewsToShow(news._id);
  }

  // climb replies until you reach the top-level post (_id with no replyTo)
  private getThreadRootId(news: any): string {
    let current = news;
    while (current.doc && current.doc.replyTo) {
      const parent = this.itemsById.get(current.doc.replyTo);
      if (!parent) {
        break;
      }
      current = parent;
    }
    return current._id;
  }

  navigateToReply(newsId) {
    if (newsId !== 'root') {
      this.router.navigate([ '/voices', newsId ]);
    } else {
      this.router.navigate([ '' ]);
    }
  }

  filterNewsToShow(newsId) {
    if (newsId === this.replyViewing._id) {
      return;
    }
    const news = this.items.find(item => item._id === newsId) || { _id: 'root' };
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
    // when going back to the main conversation, scroll down to the previously viewed post
    if (newsId === 'root' && this.lastRootPostId) {
      setTimeout(() => {
        const el = document.getElementById(`news-${this.lastRootPostId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'auto', block: 'center' });
        }
      }, 0);
    }
    // Set up observer for replies view after the anchor element is rendered
    if (newsId !== 'root') {
      setTimeout(() => this.setupObserver(), 0);
    }
  }

  showPreviousReplies() {
    this.showReplies(this.items.find(item => item._id === this.replyViewing.doc.replyTo));
  }

  openUpdateDialog(
    { title, placeholder, initialValue = '', news = {} }: { title: string, placeholder: string, initialValue?: string, news?: any }
  ) {
    if (this.readOnly) {
      return;
    }
    const fields = [ {
      type: 'markdown',
      name: 'message',
      placeholder,
      required: true,
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
    if (this.readOnly) {
      return;
    }
    this.newsService.postNews(
      { ...oldNews, ...newNews },
      oldNews._id ? this.editSuccessMessage : $localize`Reply has been posted successfully.`
    ).subscribe(() => {
      this.dialogsFormService.closeDialogsForm();
      this.dialogsLoadingService.stop();
    });
  }

  openDeleteDialog(news) {
    if (this.readOnly) {
      return;
    }
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
          deleteFromAllViews
        ),
        this.newsService.rearrangeRepliesForDelete(this.replyObject[news._id], parentId)
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
    if (this.readOnly) {
      return;
    }
    if (local) {
      this.newsService.shareNews(news).subscribe(() => {
        this.isMainPostShared = news._id === this.replyViewing._id ? true : this.isMainPostShared;
      });
    } else {
      const okClick = (planets) =>
        this.newsService.shareNews(news, planets.map(planet => planet.doc)).subscribe(() => this.shareDialog?.close());
      this.dialogGuard.open('share-news', () => of(this.dialog.open(CommunityListDialogComponent, {
        data: {
          okClick,
          excludeIds: (news.viewIn || []).map(shared => shared._id)
        }
      }))).subscribe(ref => this.shareDialog = ref);
    }
  }

  onLabelFilterChange(label: string) {
    this.selectedLabel = label;
    this.applyFilters();
  }

  clearSearch() {
    this.messageSearch = '';
    this.messageSearch$.next('');
    this.applyFilters();
  }

  getAvailableLabels(items: any[]): string[] {
    const labels: string[] = [];
    this.viewLabelNames = new Set<string>();
    items.forEach(item => {
      labels.push(...(item.doc.labels || []));
      (item.doc.viewIn || []).forEach(view => {
        const isOwnFeed = this.viewableId !== undefined && view._id === this.viewableId;
        if (view.name && !isOwnFeed) {
          labels.push(view.name);
          this.viewLabelNames.add(normalizeVoiceLabel(view.name));
        }
      });
      if (item.doc.chat === true) {
        labels.push(SHARED_CHAT_LABEL);
      }
    });

    return dedupeVoiceLabels(labels);
  }

  getLabelIcon(label: string): string {
    return voiceLabelsEqual(label, SHARED_CHAT_LABEL) ? 'question_answer'
      : this.viewLabelNames.has(normalizeVoiceLabel(label)) ? 'groups'
      : 'label_important';
  }

  changeLabels({ news, label, action }: { news: any, label: string, action: 'remove' | 'add' | 'select' }) {
    if (action === 'select') {
      this.selectedLabel = this.availableLabels.find(availableLabel => voiceLabelsEqual(availableLabel, label)) || label;
    } else if (action === 'remove' && voiceLabelsEqual(label, this.selectedLabel)) {
      this.selectedLabel = '';
    }
    this.applyFilters();
    if (action === 'select' || this.readOnly) {
      return;
    }
    const labels = action === 'remove' ?
      (news.labels || []).filter(existingLabel => !voiceLabelsEqual(existingLabel, label)) :
      dedupeVoiceLabels([ ...(news.labels || []), label ]);
    this.newsService.postNews({ ...news, labels }, $localize`Label ${action === 'remove' ? 'removed' : 'added'}`).subscribe();
  }

  getCurrentItems(): any[] {
    if (this.replyViewing._id === 'root') {
      return this.filteredItems.filter(item => !item.doc.replyTo);
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
    if (this.replyViewing._id === 'root') {
      if (initial) {
        this.pageIndex = 0;
      }
      const news = this.getCurrentItems();
      this.totalItems = news.length;
      const start = this.pageIndex * this.pageSize;
      const { items } = this.paginateItems(news, start, this.pageSize);
      this.displayedItems = items;
      this.hasMoreNews = false;
      this.isLoadingMore = false;
    } else {
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
      this.totalReplies = news.length;
    }
  }

  loadMoreItems() {
    this.isLoadingMore = true;
    this.loadPagedItems(false);
  }

  onPageChange(event: any) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadPagedItems(false);
  }
}
