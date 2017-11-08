import { Component, OnInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
declare var jQuery: any;

@Component({
  templateUrl: './meetups.component.html',
})
export class MeetupsComponent implements OnInit {
  message = '';
  meetups = [];
  deleteItem = {};

  constructor(
    private couchService: CouchService
  ) { }

  getMeetups() {
    this.couchService.get('meetups/_all_docs?include_docs=true')
      .then((data) => {
        this.meetups = data.rows;
      }, (error) => this.message = 'There was a problem getting meetups');
  }

  deleteClick(meetup,index) {
    this.deleteItem = { ...meetup.doc, index: index };
    jQuery('#planetDelete').modal('show');
  }

  deleteMeetup(meetup) {
    const { _id: meetupId, _rev: meetupRev, index } = meetup;
    this.couchService.delete('meetups/' + meetupId + '?rev=' + meetupRev)
      .then((data) => {
        this.getMeetups();
        jQuery('#planetDelete').modal('hide');
      }, (error) => this.message = 'There was a problem deleting this meetup');
  }

  ngOnInit() {
    this.getMeetups();
  }

}
