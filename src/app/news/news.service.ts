import { Injectable } from '@angular/core';
import { Subject, forkJoin, of } from 'rxjs';
import { map } from 'rxjs/operators';
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
    forkJoin([
      this.couchService.findAll(this.dbName, findDocuments(selectors, 0, [ { 'time': 'desc' } ])),
      this.couchService.findAll('attachments')
    ]).subscribe(([ newsItems, avatars ]) => {
      this.newsUpdated$.next(newsItems.map((item: any) => (
        { doc: item, sharedDate: this.findShareDate(item, viewId), avatar: this.findAvatar(item.user, avatars), _id: item._id }
      )));
    });
  }

  findAvatar(user: any, attachments: any[]) {
    const attachmentId = `${user._id}@${user.planetCode}`;
    const attachment = attachments.find(avatar => avatar._id === attachmentId);
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

  postNews(post, successMessage = $localize`Thank you for submitting your news`, isMessageEdit = true) {
    const { configuration } = this.stateService;
    const message = post.chat ? '</br>' : (typeof post.message === 'string' ? post.message : post.message.text);
    const images = post.chat ? [] : this.createImagesArray(post, message);
    const newPost = {
      docType: 'message',
      time: this.couchService.datePlaceholder,
      createdOn: configuration.code,
      parentCode: configuration.parentCode,
      user: this.userService.get(),
      ...post,
      message,
      images,
      updatedDate: isMessageEdit ? this.couchService.datePlaceholder : post.updatedDate
    };
    return this.couchService.updateDocument(this.dbName, newPost).pipe(map(() => {
      this.planetMessageService.showMessage(successMessage);
      this.requestNews();
    }));
  }

  deleteNews(post) {
    return this.postNews({ ...post, _deleted: true }, $localize`Post deleted`);
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

  shareNews(news, planets?: any[]) {
    const viewInObject = (planet) => (
      { '_id': `${planet.code}@${planet.parentCode}`, section: 'community', sharedDate: this.couchService.datePlaceholder }
    );
    // TODO: Filter newPlanets by ones currently existing in viewIn array
    const newPlanets = planets ? planets.map(planet => viewInObject(planet)) : [ viewInObject(this.stateService.configuration) ];
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
      $localize`News has been successfully shared`,
      false
    );
  }

  postSharedWithCommunity(post) {
    return post && post.doc && (post.doc.viewIn || []).some(({ _id }) => _id === planetAndParentId(this.stateService.configuration));
  }

}
