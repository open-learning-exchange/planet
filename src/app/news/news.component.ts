import { Component } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { StateService } from '../shared/state.service';
import { UserService } from '../shared/user.service';
import { PlanetMessageService } from '../shared/planet-message.service';

@Component({
  templateUrl: './news.component.html',
  styleUrls: [ './news.scss' ]
})
export class NewsComponent {

  private dbName = 'news';
  newMessage = '';
  configuration = this.stateService.configuration;

  constructor(
    private couchService: CouchService,
    private stateService: StateService,
    private userService: UserService,
    private planetMessageService: PlanetMessageService
  ) {}

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
    });
  }

}
