import { Injectable } from '@angular/core';
import { Subject, forkJoin, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { CouchService } from '../shared/couchdb.service';
import { StateService } from '../shared/state.service';
import { UserService } from '../shared/user.service';
import { PlanetMessageService } from '../shared/planet-message.service';
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
  private activeReplyId: string | null = null;
  private lastKey: any[] | null = null;
  private lastDocId: string | null = null;
  private _allNewsLoaded = true;

  constructor(
    private couchService: CouchService,
    private stateService: StateService,
    private userService: UserService,
    private planetMessageService: PlanetMessageService
  ) {}

  requestNews(section = 'community', viewId = '', pageSize = 1000) {
    if (!this._allNewsLoaded) { return of([]); }

    const startkey = this.lastKey ? this.lastKey : [ section, viewId, {} ];
    const lastKey = [ section, viewId, null ];

    const qs = [
      `descending=true`,
      `limit=${pageSize + 1}`,
      `startkey=${encodeURIComponent(JSON.stringify(startkey))}`,
      `endkey=${encodeURIComponent(JSON.stringify(lastKey))}`,
      ...(this.lastDocId
        ? [ `startkey_docid=${encodeURIComponent(this.lastDocId)}` ]
        : []
      )
    ].join('&');

    forkJoin([
      this.couchService.get(`news/_design/news/_view/by_section_and_id_and_date?${qs}`),
      this.couchService.findAll('attachments')
    ]).subscribe(([ newsItems, avatars ]) => {
      const news = newsItems.rows;
      this._allNewsLoaded = news.length > pageSize;
      const pageNews = this._allNewsLoaded ? news.slice(0, pageSize) : news;

      const last = news[news.length - 1];
      if (last) {
        this.lastKey = last.key;
        this.lastDocId = last.id;
      }
      this.newsUpdated$.next(pageNews.map((item: any) => (
        {
          doc: item.value,
          sharedDate: this.findShareDate(item.value, viewId),
          avatar: this.findAvatar(item.value.user, avatars),
          _id: item.id
        }
      )));
    });
  }

  findAvatar(user: any, attachments: any[]) {
    const userId = `org.couchdb.user:${user.name}`;
    const attachmentId = `${userId}@${user.planetCode}`;
    const attachment = attachments.find(avatar => avatar._id === attachmentId);
    const extractFilename = (object) => Object.keys(object._attachments)[0];
    return attachment ?
      `${this.imgUrlPrefix}/attachments/${attachmentId}/${extractFilename(attachment)}` :
      user._attachments ?
      `${this.imgUrlPrefix}/_users/${userId}/${extractFilename(user)}` :
      'assets/image.png';
  }

  findShareDate(item, viewId) {
    return ((item.viewIn || []).find(view => view._id === viewId) || {}).sharedDate;
  }

  resetPagination() {
    this.lastKey = null;
    this.lastDocId = null;
    this._allNewsLoaded = true;
  }

  get allNewsLoaded(): boolean {
    return this._allNewsLoaded;
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

  setActiveReplyId(replyId: string | null) {
    this.activeReplyId = replyId;
  }

  getActiveReplyId(): string | null {
    return this.activeReplyId;
  }

}
