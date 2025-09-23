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

  constructor(
    private couchService: CouchService,
    private stateService: StateService,
    private userService: UserService,
    private planetMessageService: PlanetMessageService
  ) {}

  requestNews({ selectors, viewId } = this.currentOptions) {
    this.currentOptions = { selectors, viewId };
    this.couchService.findAll(this.dbName, findDocuments(selectors, 0, [ { 'time': 'desc' } ])).pipe(
      switchMap((newsItems: any[]) =>
        this.couchService.findAttachmentsByIds(this.collectAttachmentIds(newsItems)).pipe(
          map((attachments: any[]) => ({
            newsItems,
            avatarMap: new Map<string, any>(attachments.map((attachment: any) => [ attachment._id, attachment ]))
          }))
        )
      )
    ).subscribe(({ newsItems, avatarMap }) => {
      this.newsUpdated$.next(newsItems.map((item: any) => (
        { doc: item, sharedDate: this.findShareDate(item, viewId), avatar: this.findAvatar(item.user, avatarMap), _id: item._id }
      )));
    });
  }

  findAvatar(user: any, attachments: Map<string, any>) {
    const attachmentId = `${user._id}@${user.planetCode}`;
    const attachment = attachments.get(attachmentId);
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

}
