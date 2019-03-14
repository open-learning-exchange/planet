import { Component, OnInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { StateService } from '../shared/state.service';
import { UserService } from '../shared/user.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { findDocuments } from '../shared/mangoQueries';
import { environment } from '../../environments/environment';

@Component({
  templateUrl: './news.component.html',
  styleUrls: [ './news.scss' ]
})
export class NewsComponent implements OnInit {

  private dbName = 'news';
  newMessage = '';
  configuration = this.stateService.configuration;
  newsItems: any[] = [];
  imgUrlPrefix = environment.couchAddress + '/' + '_users' + '/';

  constructor(
    private couchService: CouchService,
    private stateService: StateService,
    private userService: UserService,
    private planetMessageService: PlanetMessageService
  ) {}

  ngOnInit() {
    this.getMessages();
  }

  getMessages() {
    this.couchService.findAll(this.dbName, findDocuments({ createdOn: this.configuration.code })).subscribe(newsItems => {
      this.newsItems = newsItems.map(item => {
        const filename = item.user._attachments && Object.keys(item.user._attachments)[0];
        return { ...item, avatar: filename ? this.imgUrlPrefix + item.user._id + '/' + filename : 'assets/image.png' }
      });
    });
  }

  postMessage() {
    this.couchService.updateDocument(this.dbName, {
      message: this.newMessage,
      time: this.couchService.datePlaceholder,
      createdOn: this.configuration.code,
      parentCode: this.configuration.parentCode,
      user: this.userService.get(),
      viewableBy: 'community'
    }).subscribe(() => {
      this.planetMessageService.showMessage('Thank you for submitting your news')
      this.newMessage = '';
      this.getMessages();
    });
  }

}
