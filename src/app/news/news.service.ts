import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
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
  imgUrlPrefix = environment.couchAddress + '/' + '_users' + '/';
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
    this.couchService.findAll(this.dbName, findDocuments(selectors, 0, [ { 'time': 'desc' } ])).subscribe(newsItems => {
      this.newsUpdated$.next(newsItems.map((item: any) => {
        const filename = item.user._attachments && Object.keys(item.user._attachments)[0];
        return { ...item, avatar: filename ? this.imgUrlPrefix + item.user._id + '/' + filename : 'assets/image.png' };
      }));
    });
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
