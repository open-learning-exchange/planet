import { Component, OnInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
declare var jQuery:any;

@Component({
  template: `
  <div class="alert alert-success alert-dismissible fade show" id ="alert" role="alert" style="display: none;">
    <button type="button" class="close" onclick="$('.alert').hide()" aria-label="Close"><span aria-hidden="true">&times;</span></button>
    <strong>{{message}}</strong>
  </div>
  <form class="form-horizontal" (ngSubmit)="onSubmit(meetupForm.value)" #meetupForm="ngForm">
    <legend>Start a New Meetup</legend>
    <div class="form-group col-md-4">
      <label class="control-label">Title</label>
      <input name="title" type="text" ngModel placeholder="title" class="form-control input-md" required="" />
    </div>
    <div class="form-group">
      <label class="col-md-4 control-label">Description</label>
      <input name="description" type="text" ngModel placeholder="description" class="form-control input-md" required="" />
    </div>
    <button name="singlebutton" class="btn btn-primary" type="submit">Save</button>
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
    jQuery(".alert").hide();
  }

  onSubmit(meetup) {
    jQuery(".alert").show();
    if (meetup.description !== '' && meetup.title !== '') {
      console.log(meetup.description, meetup.title);
      this.couchService.post('meetups', { 'title': meetup.title, 'description': meetup.description })
        .then((data) => {
          this.message = 'Meetup created: ' + meetup.title;
          jQuery("#alert").attr('class', 'alert alert-success alert-dismissible fade show');
          jQuery("#alert").show(); 
        }, (error) => {
          this.message = 'There was a problem creating the meetup';
          jQuery("#alert").attr('class', 'alert alert-danger alert-dismissible fade show');
          jQuery("#alert").show();
        });
    } else {
      this.message = 'Please complete the form';
      jQuery("#alert").attr('class', 'alert alert-warning alert-dismissible fade show');
      jQuery("#alert").show();
    }
  }

}
