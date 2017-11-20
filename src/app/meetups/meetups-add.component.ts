import { Component, OnInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { MatFormFieldModule, MatInputModule } from '@angular/material';
import { MatButtonModule } from '@angular/material/button';

@Component({
  template: `
  <p>{{message}}</p>
  <form class="form-horizontal" (ngSubmit)="onSubmit(meetupForm.value)" #meetupForm="ngForm">
    <legend>Start a New Meetup</legend>
    <div class="fields-container">
      <mat-form-field>
        <input matInput name="title" type="text" ngModel placeholder="title"  placeholder="Title" required=""  >
      </mat-form-field>
    </div>
    <div class="fields-container">
      <mat-form-field>
        <textarea matInput name="description" type="text" ngModel placeholder="Description" required=""></textarea>
      </mat-form-field>
    </div>
    <button mat-raised-button type="submit" i18n>Save</button>
  </form>
  `
})
export class MeetupsAddComponent implements OnInit {
  message = '';
  obj = [];
  constructor(
    private couchService: CouchService,
  ) { }

  model = { title: '', description: '' };

  ngOnInit() {
  }

  onSubmit(meetup) {
    if (meetup.description !== '' && meetup.title !== '') {
      console.log(meetup.description, meetup.title);
      this.couchService.post('meetups', { 'title': meetup.title, 'description': meetup.description })
        .then((data) => {
          this.message = 'Meetup created: ' + meetup.title;
        }, (error) => this.message = 'There was a problem creating the meetup');
    } else {
      this.message = 'Please complete the form';
    }
  }

}
