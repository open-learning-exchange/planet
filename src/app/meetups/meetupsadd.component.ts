import { Component, OnInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';

@Component({
  template: `
    <p>{{message}}</p>
    <form class="form-horizontal" (ngSubmit)="onSubmit(meetupForm.value)" #meetupForm="ngForm">
        <legend i18n>Start a New Meetup</legend>
        <div class="form-group col-md-4">
            <label class="control-label" i18n>Title</label>  
            <input name="title" type="text" ngModel i18n-placeholder placeholder="title" class="form-control input-md" required="" />
        </div>
        <div class="form-group">
            <label class="col-md-4 control-label" i18n>Description</label>
            <input name="description" type="text" ngModel i18n-placeholder placeholder="description" class="form-control input-md" required="" />
        </div>
        <button name="singlebutton" class="btn btn-primary" type="submit" i18n>Save</button>
    </form>
    `
})
export class MeetupsaddComponent implements OnInit {
  message = "";
  obj = [];	
  constructor(
  		private couchService: CouchService,
    ) { }

  model = { title:'', description:'' }

  ngOnInit() {
  }

  onSubmit(meetup){
      if(meetup.description != '' && meetup.title != '') {
      	console.log(meetup.description,meetup.title)
        this.couchService.post('meetups', {'title': meetup.title, 'description': meetup.description})
            .then((data) => {
                this.message = 'Meetup created: ' + meetup.title;
            }, (error) => this.message = 'There was a problem creating the meetup');
        } else {
            this.message = 'Please complete the form';
        }
  }

}
