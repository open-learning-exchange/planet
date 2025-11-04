import { Injectable } from '@angular/core';
import { Subject, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { CouchService } from '../shared/couchdb.service';
import { StateService } from '../shared/state.service';
import { UserService } from '../shared/user.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { findDocuments } from '../shared/mangoQueries';
import { environment } from '../../environments/environment';
import { dedupeObjectArray } from '../shared/utils';
import { planetAndParentId } from '../manager-dashboard/reports/reports.utils';

@Injectable({
  providedIn: 'root'
})
export class NewsService {

  dbName = 'news';
  imgUrlPrefix = environment.couchAddress;
  newsUpdated$ = new Subject<any[]>();
  currentOptions: { selectors: any, viewId: string } = { selectors: {}, viewId: '' };
  private currentBookmark: string | undefined;
  private hasMoreResults = true;
  private isLoading = false;
  private pageSize = 50;
  private accumulatedNews: any[] = [];
  private avatarCache: Record<string, any> = {};

  constructor(
    private couchService: CouchService,
    private stateService: StateService,
    private userService: UserService,
    private planetMessageService: PlanetMessageService
  ) {}

  requestNews({ selectors, viewId } = this.currentOptions) {
    this.currentOptions = { selectors, viewId };
    this.resetPagination();
    this.fetchNewsPage(true);
  }

  loadMoreNews() {
    if (!this.canLoadMore()) { return; }
    this.fetchNewsPage(false);
  }

  canLoadMore(): boolean {
    return this.hasMoreResults && !this.isLoading;
  }

  findAvatar(user: any, attachments: Record<string, any>) {
    const attachmentId = `${user._id}@${user.planetCode}`;
    const attachment = attachments ? attachments[attachmentId] : undefined;
    const extractFilename = (object) => Object.keys(object._attachments)[0];
    return attachment ?
      `${this.imgUrlPrefix}/attachments/${attachmentId}/${extractFilename(attachment)}` :
      user._attachments ?
      `${this.imgUrlPrefix}/_users/${user._id}/${extractFilename(user)}` :
      'assets/image.png';
  }

  findShareDate(item, viewId) {
    return ((item.viewIn || []).find(view => view._id === viewId) || {}).sharedDate;
  }

  private collectAttachmentIds(newsItems: any[]): string[] {
    const ids = new Set<string>();
    newsItems.forEach((item: any) => {
      const user = item?.user;
      if (user && user._id && user.planetCode) {
        ids.add(`${user._id}@${user.planetCode}`);
      }
    });
    return Array.from(ids);
  }

  private resetPagination() {
    this.currentBookmark = undefined;
    this.hasMoreResults = true;
    this.isLoading = false;
    this.accumulatedNews = [];
    this.avatarCache = {};
  }

  private fetchNewsPage(reset: boolean) {
    const { selectors } = this.currentOptions;
    const baseQuery = findDocuments(selectors, 0, [ { 'time': 'desc' } ], this.pageSize);
    const query: any = { ...baseQuery };
    if (!reset && this.currentBookmark) {
      query.bookmark = this.currentBookmark;
    }
    this.isLoading = true;
    this.couchService.post(`${this.dbName}/_find`, query).subscribe({
      next: (response: any) => {
        const docs = response?.docs ?? [];
        const bookmark = response?.bookmark;
        this.isLoading = false;
        this.currentBookmark = bookmark;
        if (reset) {
          this.accumulatedNews = [];
        }
        if (docs.length === 0) {
          this.hasMoreResults = false;
          this.emitNews();
          return;
        }
        this.hasMoreResults = docs.length === this.pageSize && !!bookmark;
        this.accumulatedNews = [ ...this.accumulatedNews, ...docs ];
        this.emitNews();
        this.loadMissingAttachments(docs);
      },
      error: () => {
        this.isLoading = false;
        this.hasMoreResults = false;
      }
    });
  }

  private loadMissingAttachments(newsItems: any[]) {
    const missingIds = this.collectAttachmentIds(newsItems).filter(id => !(id in this.avatarCache));
    if (missingIds.length === 0) {
      return;
    }
    this.couchService.findAttachmentsByIds(missingIds).subscribe((attachments: any[]) => {
      if (!attachments || attachments.length === 0) { return; }
      attachments.forEach((attachment: any) => {
        if (attachment && attachment._id) {
          this.avatarCache[attachment._id] = attachment;
        }
      });
      this.emitNews();
    });
  }

  private emitNews() {
    const viewId = this.currentOptions.viewId;
    const formatted = this.accumulatedNews.map((item: any) => ({
      doc: item,
      sharedDate: this.findShareDate(item, viewId),
      avatar: this.findAvatar(item.user, this.avatarCache),
      _id: item._id
    }));
    this.newsUpdated$.next([ ...formatted ]);
  }

  postNews(post, successMessage = $localize`Thank you for submitting your message`, isMessageEdit = true) {
    const { configuration } = this.stateService;
    const message = typeof post.message === 'string' ? post.message : post.message.text;
    const images = this.createImagesArray(post, message);
    const newPost = {
      docType: 'message',
      time: this.couchService.datePlaceholder,
      createdOn: configuration.code,
      parentCode: configuration.parentCode,
      user: this.userService.get(),
      ...post,
      message,
      images,
      updatedDate: isMessageEdit ? this.couchService.datePlaceholder : post.updatedDate,
      viewIn: post.viewIn || []
    };
    return this.couchService.updateDocument(this.dbName, newPost).pipe(map(() => {
      this.planetMessageService.showMessage(successMessage);
      this.requestNews();
    }));
  }

  deleteNews(post, viewId, deleteFromAllViews = false) {
    if (deleteFromAllViews) {
      return this.postNews({ ...post, _deleted: true }, $localize`Message deleted`);
    } else {
      const updatedViewIn = post.viewIn.filter(view => view._id !== viewId);
      if (updatedViewIn.length === 0) {
        return this.postNews({ ...post, _deleted: true }, $localize`Message deleted`);
      } else {
        return this.postNews({ ...post, viewIn: updatedViewIn }, $localize`Message deleted`);
      }
    }
  }

  createImagesArray(post, message) {
    return dedupeObjectArray([
      ...(post.images || []),
      ...(post.message.images || [])
    ].filter(image => message.indexOf(image.resourceId) > -1), [ 'resourceId' ]);
  }

  rearrangeRepliesForDelete(replies: any[] = [], newReplyToId: string) {
    return this.couchService.bulkDocs(this.dbName, replies.map(reply => ({ ...reply.doc, replyTo: newReplyToId })));
  }

  shareNews(news, planets?: any[], successMessage = $localize`Message has been successfully shared`) {
    const viewInObject = (planet) => (
      { '_id': `${planet.code}@${planet.parentCode}`, section: 'community', sharedDate: this.couchService.datePlaceholder }
    );
    const existingPlanetIds = (news.viewIn || []).map(view => view._id);
    const newPlanets = planets ? planets
      .filter(planet => !existingPlanetIds.includes(`${planet.code}@${planet.parentCode}`))
      .map(planet => viewInObject(planet)) : [ viewInObject(this.stateService.configuration) ];
    if (newPlanets.length === 0) {
      return of(undefined);
    }
    return this.postNews(
      {
        ...news,
        messageType: 'sync',
        viewIn: [
          ...(news.viewIn || []),
          ...newPlanets
        ]
      },
      successMessage,
      false
    );
  }

  postSharedWithCommunity(post) {
    return post && post.doc && (post.doc.viewIn || []).some(({ _id }) => _id === planetAndParentId(this.stateService.configuration));
  }

  getNewsById(newsId: string) {
    return this.couchService.get(`${this.dbName}/${newsId}`).pipe(
      switchMap((newsItem: any) => {
        const attachmentIds = this.collectAttachmentIds([ newsItem ]);
        return this.couchService.findAttachmentsByIds(attachmentIds).pipe(
          map((attachments: any[]) => {
            const avatarMap: Record<string, any> = {};
            attachments.forEach(attachment => {
              if (attachment && attachment._id) {
                avatarMap[attachment._id] = attachment;
              }
            });
            return {
              doc: newsItem,
              sharedDate: this.findShareDate(newsItem, this.currentOptions.viewId),
              avatar: this.findAvatar(newsItem.user, avatarMap),
              _id: newsItem._id
            };
          })
        );
      })
    );
  }

}
