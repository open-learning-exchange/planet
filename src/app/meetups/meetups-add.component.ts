import { Component } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { PlanetMessageService } from '../shared/planet-message.service';

@Component({
  templateUrl: './meetups-add.component.html',
})
export class MeetupsAddComponent {
  message = '';
  obj = [];
  constructor(
    private couchService: CouchService,
    private planetMessageService: PlanetMessageService
  ) { }

  model = { title: '', description: '' };

  onSubmit(meetup) {
    if (meetup.description !== '' && meetup.title !== '') {
      console.log(meetup.description, meetup.title);
      this.couchService.post('meetups', { 'title': meetup.title, 'description': meetup.description })
        .subscribe((data) => {
          this.planetMessageService.showMessage('Meetup created: ' + meetup.title);
        }, (error) => this.planetMessageService.showAlert('There was a problem creating the meetup'));
    } else {
      this.planetMessageService.showMessage('Please complete the form');
    }
  }

}
