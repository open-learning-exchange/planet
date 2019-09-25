import { Injectable } from '@angular/core';
import { Subject, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { CouchService } from '../shared/couchdb.service';
import { StateService } from '../shared/state.service';
import { UserService } from '../shared/user.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { findDocuments } from '../shared/mangoQueries';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class NewsService {

  dbName = 'news';
  imgUrlPrefix = environment.couchAddress;
  newsUpdated$ = new Subject<any[]>();
  currentSelector = {};

  constructor(
    private couchService: CouchService,
    private stateService: StateService,
    private userService: UserService,
    private planetMessageService: PlanetMessageService
  ) {}

  requestNews(selectors = this.currentSelector) {
    this.currentSelector = selectors;
    forkJoin([
      this.couchService.findAll(this.dbName, findDocuments(selectors, 0, [ { 'time': 'desc' } ])),
      this.couchService.findAll('attachments')
    ]).subscribe(([ newsItems, avatars ]) => {
      this.newsUpdated$.next(newsItems.map((item: any) => {
        const avatar = this.findAvatar(item.user, avatars);
        return { ...item, avatar };
      }));
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

  postNews(post, successMessage = 'Thank you for submitting your news') {
    const configuration = this.stateService.configuration;
    const newPost = {
      docType: 'message',
      time: this.couchService.datePlaceholder,
      createdOn: configuration.code,
      parentCode: configuration.parentCode,
      user: this.userService.get(),
      ...post,
      updatedDate: this.couchService.datePlaceholder
    };
    return this.couchService.updateDocument(this.dbName, newPost).pipe(map(() => {
      this.planetMessageService.showMessage(successMessage);
      this.requestNews();
    }));
  }

  deleteNews(post) {
    return this.postNews({ ...post, _deleted: true }, 'Post deleted');
  }

  rearrangeRepliesForDelete(replies: any[] = [], newReplyToId: string) {
    return this.couchService.bulkDocs(this.dbName, replies.map(reply => ({ ...reply, replyTo: newReplyToId })));
  }

}
