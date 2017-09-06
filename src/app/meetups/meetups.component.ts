import { Component, OnInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { LoaderService } from '../shared/loader.service';

@Component({
  templateUrl: './meetups.component.html',
})
export class MeetupsComponent implements OnInit {
  message = "";
  meetups = [];	
  constructor(
        private couchService: CouchService,
	      private loaderService: LoaderService
  	) { }
    
  getMeetups() {
    var that = this
    this.loaderService.display(true);
    this.couchService.get('meetups/_all_docs?include_docs=true')
        .then((data) => {
            this.meetups = data.rows;
            setTimeout(function(){ that.loaderService.display(false); }, 2000);
        }, (error) => this.message = 'There was a problem getting meetups');
  }
  
  deleteMeetup(meetupId,meetupRev) {
    this.couchService.delete('meetups/' + meetupId + '?rev=' + meetupRev)
        .then((data) => {
            this.getMeetups();
        }, (error) => this.message = 'There was a problem deleting this meetup');
  }

  ngOnInit() {
  	this.getMeetups();
  }

}
