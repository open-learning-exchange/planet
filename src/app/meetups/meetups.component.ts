import { Component, OnInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
declare var jQuery:any;

@Component({
  templateUrl: './meetups.component.html',
})
export class MeetupsComponent implements OnInit {
  message = '';
  meetups = [];
  constructor(
    private couchService: CouchService
  ) { }

  getMeetups() {
    this.couchService.get('meetups/_all_docs?include_docs=true')
      .then((data) => {
        this.meetups = data.rows;
      }, (error) => {
          this.message = 'There was a problem getting meetups'; 
          jQuery("#alert").attr('class', 'alert alert-danger alert-dismissible fade show');
          jQuery("#alert").show(); 
      });
  }

  deleteMeetup(meetupId, meetupRev) {
    this.couchService.delete('meetups/' + meetupId + '?rev=' + meetupRev)
      .then((data) => {
        this.getMeetups();
      }, (error) => {
        this.message = 'There was a problem deleting this meetup';
        jQuery("#alert").attr('class', 'alert alert-danger alert-dismissible fade show');
        jQuery("#alert").show(); 
      });
  }

  ngOnInit() {
    this.getMeetups();
  }

}
